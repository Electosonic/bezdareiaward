import { useEffect, useMemo, useState } from "react";
import { ballot } from "./ballot";
import { SITE_URL, WORKER_URL } from "./config";

type MeResponse =
  | { ok: true; user: { display_name: string; login: string; twitch_user_id: string } }
  | { ok: false; error: string };

type MyVotesResponse =
  | { ok: true; votes: { nomination_id: string; candidate_id: string }[] }
  | { ok: false; error: string };

function getToken() {
  return localStorage.getItem("token");
}

export default function App() {
  const [token, setToken] = useState<string | null>(getToken());
  const [me, setMe] = useState<MeResponse | null>(null);

  const [myVotes, setMyVotes] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // toast уведомление
  const [toast, setToast] = useState<string | null>(null);

  const nomination = ballot[Math.max(0, Math.min(step, ballot.length - 1))];
  const savedForNom = nomination ? myVotes[nomination.id] : undefined;

  // token из URL
  useEffect(() => {
    const url = new URL(window.location.href);
    const t = url.searchParams.get("token");
    if (t) {
      localStorage.setItem("token", t);
      setToken(t);
      url.searchParams.delete("token");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  const loginUrl = useMemo(() => {
    const u = new URL(`${WORKER_URL}/auth/twitch/start`);
    u.searchParams.set("return_to", SITE_URL);
    return u.toString();
  }, []);

  // профиль
  useEffect(() => {
    if (!token) return;
    fetch(`${WORKER_URL}/api/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data: MeResponse) => setMe(data))
      .catch(() => setMe({ ok: false, error: "network_error" }));
  }, [token]);

  async function loadMyVotes(t: string) {
    const r = await fetch(`${WORKER_URL}/api/my-votes`, {
      headers: { Authorization: `Bearer ${t}` },
    });
    const data: MyVotesResponse = await r.json();
    if (!data.ok) return;

    const map: Record<string, string> = {};
    for (const v of data.votes) map[v.nomination_id] = v.candidate_id;
    setMyVotes(map);
  }

  // мои голоса
  useEffect(() => {
    if (!token) return;
    loadMyVotes(token).catch(() => {});
  }, [token]);

  // при смене шага — выставляем selected в сохранённый выбор (или null)
  useEffect(() => {
    const saved = nomination ? myVotes[nomination.id] : undefined;
    setSelected(saved ?? null);
  }, [step, nomination?.id, myVotes]);

  // авто-скрытие toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  async function saveVote(nomination_id: string, candidate_id: string) {
    if (!token) {
      setToast("Сначала войдите через Twitch");
      return;
    }

    setSaving(true);
    try {
      const r = await fetch(`${WORKER_URL}/api/vote`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nomination_id, candidate_id }),
      });

      const data = await r.json();
      if (!data.ok) {
        setToast(`Ошибка: ${data.error ?? "unknown"}`);
        return;
      }

      // моментально обновим локально
      setMyVotes((prev) => ({ ...prev, [nomination_id]: candidate_id }));
      setSelected(candidate_id);

      // синхронизация с базой
      await loadMyVotes(token);

      // уведомление
      setToast("Голос сохранён ✅");
    } catch {
      setToast("Ошибка сети");
    } finally {
      setSaving(false);
    }
  }

  const canPrev = step > 0;
  const canNext = step < ballot.length - 1;
  const hasUnsavedChange = !!selected && selected !== savedForNom;

  const containerStyle: React.CSSProperties = {
    maxWidth: 980,
    margin: "24px auto",
    padding: 16,
    fontFamily: "system-ui",
  };

  const cardGrid: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 16,
    marginTop: 16,
    marginBottom: 20,
  };

  const cardStyle = (active: boolean): React.CSSProperties => ({
    borderRadius: 16,
    padding: 18,
    border: active ? "2px solid rgba(180, 140, 255, 0.9)" : "1px solid rgba(255,255,255,0.12)",
    background: "rgba(20, 10, 40, 0.55)",
    boxShadow: active ? "0 0 0 4px rgba(180,140,255,0.18)" : "none",
    cursor: "pointer",
    minHeight: 170,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    fontWeight: 700,
    lineHeight: 1.2,
    fontSize: 18,
  });

  const panelStyle: React.CSSProperties = {
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(12, 8, 24, 0.55)",
    padding: 16,
  };

  return (
    <div style={containerStyle}>
      {/* Верхняя панель */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0 }}>Bezdarei Award</h1>
          <div style={{ opacity: 0.75, marginTop: 6 }}>
            Вопрос {step + 1} из {ballot.length}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {!token ? (
            <a href={loginUrl}>
              <button style={{ padding: "10px 14px" }}>Войти через Twitch</button>
            </a>
          ) : (
            <>
              <div style={{ opacity: 0.85 }}>
                {me?.ok ? `${me.user.display_name} (@${me.user.login})` : "…"}
              </div>
              <button
                style={{ padding: "10px 14px" }}
                onClick={() => {
                  localStorage.removeItem("token");
                  setToken(null);
                  setMe(null);
                  setMyVotes({});
                  setSelected(null);
                  setToast("Вы вышли");
                }}
              >
                Выйти
              </button>
            </>
          )}
        </div>
      </div>

      <h2 style={{ textAlign: "center", marginTop: 22 }}>{nomination.title}</h2>

      {/* Карточки 2×2 */}
      <div style={cardGrid}>
        {nomination.candidates.map((c) => {
          const active = selected === c.id;
          return (
            <div key={c.id} style={cardStyle(active)} onClick={() => setSelected(c.id)}>
              {c.title}
            </div>
          );
        })}
      </div>

      {/* Панель выбора + кнопки */}
      <div style={panelStyle}>
        <div style={{ marginBottom: 10, opacity: 0.85 }}>Выберите кандидата:</div>

        <div style={{ display: "grid", gap: 10 }}>
          {nomination.candidates.map((c) => (
            <label
              key={c.id}
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.10)",
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name={`nom_${nomination.id}`}
                checked={selected === c.id}
                onChange={() => setSelected(c.id)}
              />
              <span style={{ fontWeight: 600 }}>{c.title}</span>
            </label>
          ))}
        </div>

        {/* Статус сохранения */}
        <div style={{ marginTop: 12, opacity: 0.8 }}>
          {savedForNom ? (
            hasUnsavedChange ? (
              <>
                Статус: <b>не сохранено</b> (нажмите “Сохранить голос”)
              </>
            ) : (
              <>
                Статус: <b>сохранено</b>
              </>
            )
          ) : selected ? (
            <>
              Статус: <b>не сохранено</b> (нажмите “Сохранить голос”)
            </>
          ) : (
            <>
              Статус: <b>нет выбора</b>
            </>
          )}
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 14, alignItems: "center", flexWrap: "wrap" }}>
          <button
            disabled={!canPrev}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            style={{ padding: "10px 14px" }}
          >
            ← Предыдущий вопрос
          </button>

          <button
            disabled={!selected || !token || saving}
            onClick={() => saveVote(nomination.id, selected!)}
            style={{ padding: "10px 14px" }}
          >
            {saving ? "Сохраняю…" : "Сохранить голос"}
          </button>

          <button
            disabled={!canNext}
            onClick={() => setStep((s) => Math.min(ballot.length - 1, s + 1))}
            style={{ padding: "10px 14px" }}
          >
            Следующий вопрос →
          </button>

          {!token ? (
            <div style={{ opacity: 0.8 }}>Чтобы голосовать, нужно войти.</div>
          ) : selected ? (
            <div style={{ opacity: 0.8 }}>
              Текущий выбор:{" "}
              <b>{nomination.candidates.find((x) => x.id === selected)?.title ?? selected}</b>
            </div>
          ) : (
            <div style={{ opacity: 0.8 }}>Выберите кандидата</div>
          )}
        </div>
      </div>

      {/* TOAST */}
      {toast ? (
        <div
          style={{
            position: "fixed",
            left: "50%",
            bottom: 20,
            transform: "translateX(-50%)",
            padding: "12px 14px",
            borderRadius: 14,
            background: "rgba(20, 10, 40, 0.92)",
            border: "1px solid rgba(255,255,255,0.18)",
            boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
            color: "white",
            maxWidth: "min(560px, calc(100vw - 24px))",
            display: "flex",
            gap: 12,
            alignItems: "center",
            justifyContent: "space-between",
            zIndex: 9999,
          }}
          role="status"
          aria-live="polite"
        >
          <div style={{ fontWeight: 600 }}>{toast}</div>
          <button
            onClick={() => setToast(null)}
            style={{
              border: "none",
              background: "transparent",
              color: "white",
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
              opacity: 0.85,
            }}
            aria-label="Закрыть уведомление"
            title="Закрыть"
          >
            ×
          </button>
        </div>
      ) : null}
    </div>
  );
}
