import { useEffect, useMemo, useState } from "react";
import { ballot } from "./ballot";
import { SITE_URL, WORKER_URL } from "./config";

type MeResponse =
  | { ok: true; user: { display_name: string; login: string; twitch_user_id: string } }
  | { ok: false; error: string };

type MyVotesResponse =
  | { ok: true; votes: { nomination_id: string; candidate_id: string }[] }
  | { ok: false; error: string };

type ApiOk = { ok: true };
type ApiErr = { ok: false; error: string };
type UnvoteResponse = ApiOk | ApiErr;

function getToken() {
  return localStorage.getItem("token");
}

export default function App() {
  const [token, setToken] = useState<string | null>(getToken());
  const [me, setMe] = useState<MeResponse | null>(null);

  const [myVotes, setMyVotes] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);

  // selected — локальный выбор, когда голосуем (пока не "зафиксировано")
  const [selected, setSelected] = useState<string | null>(null);

  // locked — режим "голос зафиксирован, менять нельзя" (до нажатия "изменить голос")
  const [locked, setLocked] = useState(false);

  const [saving, setSaving] = useState(false);

  const nomination = ballot[Math.max(0, Math.min(step, ballot.length - 1))];
<<<<<<< HEAD
  const savedForNom = nomination ? myVotes[nomination.id] : undefined;
=======

  // сохранённый голос (из базы) для текущей номинации
  const savedId = nomination ? myVotes[nomination.id] ?? null : null;

  // если голос сохранён — всегда подсвечиваем его (и блокируем)
  const highlightedId = savedId ?? selected;

  // можно ли менять выбор прямо сейчас
  const canInteract = !!token && !saving && !locked;

  // есть ли несохранённое изменение относительно базы
  const hasUnsavedChange = !!selected && selected !== savedId;
>>>>>>> 678dc37a7ec5758e543f0d471192158179c5d1e2

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

<<<<<<< HEAD
  // при смене шага — выставляем selected в сохранённый выбор (или null)
  useEffect(() => {
    const saved = nomination ? myVotes[nomination.id] : undefined;
    setSelected(saved ?? null);
=======
  // при смене шага — если уже голосовали: локальный selected = null, locked = true
  // если не голосовали: selected = null (или можно оставить), locked = false
  useEffect(() => {
    const currentSaved = nomination ? myVotes[nomination.id] ?? null : null;

    // если есть сохранённый голос — блокируем и не даём "выбирать"
    if (currentSaved) {
      setLocked(true);
      setSelected(null);
    } else {
      setLocked(false);
      setSelected(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
>>>>>>> 678dc37a7ec5758e543f0d471192158179c5d1e2
  }, [step, nomination?.id, myVotes]);

  async function saveVote(nomination_id: string, candidate_id: string) {
    if (!token) return alert("Сначала войдите через Twitch");
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
      if (!data.ok) return alert(`Ошибка: ${data.error ?? "unknown"}`);

      // моментально обновим локально
      setMyVotes((prev) => ({ ...prev, [nomination_id]: candidate_id }));
      setSelected(null);

      // после голосования — блокируем
      setLocked(true);

      // синхронизируемся с базой
      await loadMyVotes(token);
    } finally {
      setSaving(false);
    }
  }

  // ⚠️ Для отмены голоса нужен endpoint.
  // Я предполагаю, что у тебя есть POST `${WORKER_URL}/api/unvote` с body { nomination_id }
  // Если у тебя другой путь — поменяй тут.
  async function unvote(nomination_id: string) {
    if (!token) return;
    setSaving(true);
    try {
      const r = await fetch(`${WORKER_URL}/api/unvote`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nomination_id }),
      });

      const data: UnvoteResponse = await r.json();
      if (!data.ok) return alert(`Ошибка: ${data.error ?? "unknown"}`);

      // локально убираем голос
      setMyVotes((prev) => {
        const next = { ...prev };
        delete next[nomination_id];
        return next;
      });

      // разблокируем и дадим выбирать заново
      setLocked(false);
      setSelected(null);

      // синхронизируемся
      await loadMyVotes(token);
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

<<<<<<< HEAD
  const cardStyle = (active: boolean): React.CSSProperties => ({
=======
  const cardStyle = (active: boolean, dimmed: boolean, disabled: boolean): React.CSSProperties => ({
>>>>>>> 678dc37a7ec5758e543f0d471192158179c5d1e2
    borderRadius: 16,
    padding: 18,
    border: active ? "2px solid rgba(180, 140, 255, 0.95)" : "1px solid rgba(255,255,255,0.12)",
    background: dimmed ? "rgba(160,160,160,0.14)" : "rgba(20, 10, 40, 0.55)",
    boxShadow: active ? "0 0 0 4px rgba(180,140,255,0.18)" : "none",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: dimmed ? 0.55 : 1,
    minHeight: 170,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    fontWeight: 700,
    lineHeight: 1.2,
    fontSize: 18,
    userSelect: "none",
    transition: "opacity 120ms ease, transform 120ms ease, box-shadow 120ms ease",
    transform: active ? "translateY(-1px)" : "none",
  });

  const panelStyle: React.CSSProperties = {
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(12, 8, 24, 0.55)",
    padding: 16,
  };

<<<<<<< HEAD
=======
  const bottomBar: React.CSSProperties = {
    position: "fixed",
    left: 0,
    right: 0,
    bottom: 0,
    padding: "12px 16px",
    background: "rgba(12, 8, 24, 0.92)",
    borderTop: "1px solid rgba(255,255,255,0.12)",
    backdropFilter: "blur(10px)",
    display: "flex",
    justifyContent: "center",
    zIndex: 50,
  };

  const bottomButton: React.CSSProperties = {
    borderRadius: 999,
    padding: "10px 16px",
    fontWeight: 700,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(180, 140, 255, 0.22)",
    cursor: saving ? "not-allowed" : "pointer",
  };

  if (!nomination) {
    return (
      <div style={containerStyle}>
        <h1 style={{ margin: 0 }}>Bezdarei Award</h1>
        <div style={{ opacity: 0.8, marginTop: 8 }}>Бюллетень пустой.</div>
      </div>
    );
  }

  const chosenTitle =
    savedId
      ? nomination.candidates.find((x) => x.id === savedId)?.title ?? savedId
      : selected
      ? nomination.candidates.find((x) => x.id === selected)?.title ?? selected
      : null;

>>>>>>> 678dc37a7ec5758e543f0d471192158179c5d1e2
  return (
    <>
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
                    setLocked(false);
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
            const active = highlightedId === c.id;

            // ✅ после сохранения: все НЕвыбранные делаем серыми и некликабельными
            const dimmed = !!savedId && !active;
            const disabled = !token || saving || (!!savedId && !active) || locked; // locked=true после голосования

            return (
              <div
                key={c.id}
                style={cardStyle(active, dimmed, disabled)}
                onClick={() => {
                  if (!canInteract) return;
                  // если уже есть сохранённый голос — клики запрещены
                  if (savedId) return;
                  setSelected(c.id);
                }}
                role="button"
                aria-disabled={disabled}
              >
                {c.title}
              </div>
            );
          })}
        </div>

        {/* Панель выбора + кнопки */}
        <div style={panelStyle}>
          <div style={{ marginBottom: 10, opacity: 0.85 }}>
            {savedId ? "Ваш голос зафиксирован:" : "Выберите кандидата:"}
          </div>

<<<<<<< HEAD
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
=======
          <div style={{ display: "grid", gap: 10 }}>
            {nomination.candidates.map((c) => {
              const disabled = !token || saving || !!savedId || locked; // после голосования отключаем
              return (
                <label
                  key={c.id}
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.10)",
                    cursor: disabled ? "not-allowed" : "pointer",
                    opacity: disabled && (savedId ?? selected) !== c.id ? 0.55 : 1,
                  }}
                >
                  <input
                    type="radio"
                    name={`nom_${nomination.id}`}
                    checked={(savedId ?? selected) === c.id}
                    disabled={disabled}
                    onChange={() => setSelected(c.id)}
                  />
                  <span style={{ fontWeight: 600 }}>{c.title}</span>
                </label>
              );
            })}
          </div>
>>>>>>> 678dc37a7ec5758e543f0d471192158179c5d1e2

          {/* Статус */}
          <div style={{ marginTop: 12, opacity: 0.8 }}>
            {!token ? (
              <>
                Статус: <b>нужно войти</b>
              </>
            ) : savedId ? (
              <>
                Статус: <b>сохранено</b> — вы выбрали: <b>{chosenTitle}</b>
              </>
            ) : selected ? (
              hasUnsavedChange ? (
                <>
                  Статус: <b>не сохранено</b> (нажмите “Сохранить голос”)
                </>
              ) : (
                <>
                  Статус: <b>выбрано</b>
                </>
              )
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
<<<<<<< HEAD
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
              Текущий выбор: <b>{nomination.candidates.find((x) => x.id === selected)?.title ?? selected}</b>
            </div>
          ) : (
            <div style={{ opacity: 0.8 }}>Выберите кандидата</div>
          )}
        </div>
=======
              ← Предыдущий вопрос
            </button>

            <button
              disabled={!selected || !token || saving || !!savedId || locked}
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
            ) : savedId ? (
              <div style={{ opacity: 0.8 }}>
                Ваш голос: <b>{chosenTitle}</b>
              </div>
            ) : selected ? (
              <div style={{ opacity: 0.8 }}>
                Текущий выбор: <b>{chosenTitle}</b>
              </div>
            ) : (
              <div style={{ opacity: 0.8 }}>Выберите кандидата</div>
            )}
          </div>
        </div>

        {/* отступ под фикс-бар */}
        <div style={{ height: savedId ? 72 : 0 }} />
>>>>>>> 678dc37a7ec5758e543f0d471192158179c5d1e2
      </div>

      {/* Нижняя плашка "Изменить голос" */}
      {token && savedId && (
        <div style={bottomBar}>
          <button
            style={bottomButton}
            disabled={saving}
            onClick={() => {
              // снимаем блокировку через API (отменяем голос)
              unvote(nomination.id).catch(() => {});
            }}
          >
            {saving ? "Отменяю…" : "Изменить голос"}
          </button>
        </div>
      )}
    </>
  );
}
