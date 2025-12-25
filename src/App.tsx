import { useEffect, useMemo, useState } from "react";
import { ballot } from "./ballot";
import { SITE_URL, WORKER_URL } from "./config";

type MeResponse =
  | { ok: true; user: { display_name: string; login: string; twitch_user_id: string } }
  | { ok: false; error: string };

function getToken() {
  return localStorage.getItem("token");
}

export default function App() {
  const [token, setToken] = useState<string | null>(getToken());
  const [me, setMe] = useState<MeResponse | null>(null);

  // забираем token из URL после Twitch
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
    // ⚠️ для локального теста:
    u.searchParams.set("return_to", SITE_URL);
    return u.toString();
  }, []);

  useEffect(() => {
    if (!token) return;
    fetch(`${WORKER_URL}/api/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data: MeResponse) => setMe(data));
  }, [token]);

  async function vote(nomination_id: string, candidate_id: string) {
    if (!token) return alert("Сначала войдите через Twitch");

    const r = await fetch(`${WORKER_URL}/api/vote`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ nomination_id, candidate_id }),
    });

    const data = await r.json();
    alert(data.ok ? "Голос засчитан" : data.error);
  }

  return (
    <div style={{ maxWidth: 900, margin: "24px auto", fontFamily: "system-ui" }}>
      <h1>Bezdarei Award</h1>

      {!token ? (
        <a href={loginUrl}>
          <button>Войти через Twitch</button>
        </a>
      ) : (
        <div>
          Вы вошли как{" "}
          {me?.ok ? `${me.user.display_name} (@${me.user.login})` : "…"}
          <button
            onClick={() => {
              localStorage.removeItem("token");
              setToken(null);
              setMe(null);
            }}
          >
            Выйти
          </button>
        </div>
      )}

      <hr />

      {ballot.map((nom) => (
        <div key={nom.id} style={{ marginBottom: 20 }}>
          <h2>{nom.title}</h2>
          {nom.candidates.map((c) => (
            <div key={c.id} style={{ marginBottom: 6 }}>
              {c.title}{" "}
              <button onClick={() => vote(nom.id, c.id)}>Голосовать</button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
