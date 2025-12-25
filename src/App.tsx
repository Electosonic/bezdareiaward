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

      setMyVotes((prev) => ({ ...prev, [nomination_id]: candidate_id }));
      setSelected(candidate_id);

      await loadMyVotes(token);
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

  // ================== СТИЛИ ==================

  const pageStyle: React.CSSProperties = {
    minHeight: "100vh",
    width: "100%",
    display: "flex",
    justifyContent: "center",
    padding: "26px 16px 60px",
    fontFamily: "system-ui",
  };

  const wrapperStyle: React.CSSProperties = {
    width: "min(920px, 100%)",
    margin: "0 auto", // ✅ ВАЖНО: центрирует даже если flex где-то сломают
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 18,
  };

  const headerStyle: React.CSSProperties = {
    width: "100%",
    padding: "18px 18px 16px",
    borderRadius: 16,
    background: "rgba(40, 18, 70, 0.55)",
    border: "1px solid rgba(180,140,255,0.18)",
    boxShadow: "0 18px 60px rgba(0,0,0,0.35)",
    textAlign: "center",
  };

  const authRowStyle: React.CSSProperties = {
    display: "flex",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: 10,
  };

  const nominationTitleStyle: React.CSSProperties = {
    margin: 0,
    fontSize: 18,
    opacity: 0.95,
    textAlign: "center",
  };

  const cardGridStyle: React.CSSProperties = {
    width: "100%",
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 18,
    justifyItems: "center",
  };

  const cardStyle = (active: boolean): React.CSSProperties => ({
    width: "100%",
    minHeight: 170,
    borderRadius: 18,
    padding: 18,
    border: active ? "2px solid rgba(180, 140, 255, 0.9)" : "1px solid rgba(255,255,255,0.12)",
    background: "rgba(20, 10, 40, 0.60)",
    boxShadow: active ? "0 0 0 4px rgba(180,140,255,0.18)" : "0 14px 45px rgba(0,0,0,0.35)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    fontWeight: 800,
    lineHeight: 1.2,
    fontSize: 16,
    userSelect: "none",
  });

  const panelStyle: React.CSSProperties = {
    width: "100%",
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(12, 8, 24, 0.62)",
    padding: 16,
    boxShadow: "0 18px 60px rgba(0,0,0,0.35)",
  };

  const radioListStyle: React.CSSProperties = {
    display: "grid",
    gap: 10,
    marginTop: 10,
  };

  const radioItemStyle: React.CSSProperties = {
    display: "flex",
    gap: 10,
    alignItems: "center",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.10)",
    cursor: "pointer",
  };

  const buttonsRowStyle: React.CSSProperties = {
    display: "flex",
    gap: 12,
    marginTop: 14,
    justifyContent: "center",
    flexWrap: "wrap",
  };

  const btnStyle: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(120, 70, 200, 0.25)",
    color: "rgba(255,255,255,0.92)",
    cursor: "pointer",
  };

  const btnStyleDisabled: React.CSSProperties = {
    ...btnStyle,
    opacity: 0.45,
    cursor: "not-allowed",
  };

  if (!nomination) {
    return (
      <div style={pageStyle}>
        <div style={wrapperStyle}>Нет данных ballot</div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={wrapperStyle}>
        <div style={headerStyle}>
          <h1 style={{ margin: 0, fontSize: 32, letterSpacing: 0.6 }}>Bezdarei Award</h1>
          <div style={{ opacity: 0.75, marginTop: 6 }}>
            Вопрос {step + 1} из {ballot.length}
          </div>

          <div style={authRowStyle}>
            {!token ? (
              <a href={loginUrl}>
                <button style={btnStyle}>Войти через Twitch</button>
              </a>
            ) : (
              <>
                <div style={{ opacity: 0.9 }}>
                  {me?.ok ? `${me.user.display_name} (@${me.user.login})` : "…"}
                </div>
                <button
                  style={btnStyle}
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

        <h2 style={nominationTitleStyle}>{nomination.title}</h2>

        <div style={cardGridStyle}>
          {nomination.candidates.map((c) => {
            const active = selected === c.id;
            return (
              <div key={c.id} style={cardStyle(active)} onClick={() => setSelected(c.id)}>
                {c.title}
              </div>
            );
          })}
        </div>

        <div style={panelStyle}>
          <div style={{ opacity: 0.85, fontWeight: 700, textAlign: "center" }}>Выберите кандидата:</div>

          <div style={radioListStyle}>
            {nomination.candidates.map((c) => (
              <label key={c.id} style={radioItemStyle}>
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

          <div style={{ marginTop: 12, opacity: 0.85, textAlign: "center" }}>
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

          <div style={buttonsRowStyle}>
            <button
              disabled={!canPrev}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              style={canPrev ? btnStyle : btnStyleDisabled}
            >
              ← Предыдущий вопрос
            </button>

            <button
              disabled={!selected || !token || saving}
              onClick={() => saveVote(nomination.id, selected!)}
              style={!selected || !token || saving ? btnStyleDisabled : btnStyle}
            >
              {saving ? "Сохраняю…" : "Сохранить голос"}
            </button>

            <button
              disabled={!canNext}
              onClick={() => setStep((s) => Math.min(ballot.length - 1, s + 1))}
              style={canNext ? btnStyle : btnStyleDisabled}
            >
              Следующий вопрос →
            </button>
          </div>

          <div style={{ marginTop: 10, opacity: 0.8, textAlign: "center" }}>
            {!token ? (
              <>Чтобы голосовать, нужно войти.</>
            ) : selected ? (
              <>
                Текущий выбор:{" "}
                <b>{nomination.candidates.find((x) => x.id === selected)?.title ?? selected}</b>
              </>
            ) : (
              <>Выберите кандидата</>
            )}
          </div>
        </div>

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
    </div>
  );
}
