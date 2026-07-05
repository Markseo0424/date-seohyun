import { useState, useRef, useEffect } from "react";

/* ── 파티클 ── */
const PETALS = ["🌸", "💖", "💕", "✨", "🌷", "💗", "🫧"];
function Particles({ active }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    const rsz = () => {
      c.width = window.innerWidth;
      c.height = window.innerHeight;
    };
    window.addEventListener("resize", rsz);
    rsz();
    if (!active) {
      ctx.clearRect(0, 0, c.width, c.height);
      return () => window.removeEventListener("resize", rsz);
    }
    let ps = Array.from({ length: 18 }, () => mkp(c, true));
    let raf;
    const loop = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      if (ps.length < 45 && Math.random() < 0.25) ps.push(mkp(c, false));
      ps.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.globalAlpha = 0.8;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.font = p.s + "px serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.e, 0, 0);
        ctx.restore();
      });
      ps = ps.filter((p) => p.y < c.height + 40);
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      cancelAnimationFrame(raf);
      ctx.clearRect(0, 0, c.width, c.height);
      window.removeEventListener("resize", rsz);
    };
  }, [active]);
  return (
    <canvas
      ref={ref}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 500,
      }}
    />
  );
}
function mkp(c, rand) {
  return {
    x: Math.random() * (c.width || window.innerWidth),
    y: rand ? Math.random() * (c.height || window.innerHeight) : -20,
    vy: 1 + Math.random() * 1.8,
    vx: (Math.random() - 0.5) * 1,
    rot: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 0.05,
    s: 13 + Math.random() * 11,
    e: PETALS[Math.floor(Math.random() * PETALS.length)],
  };
}

/* ── 포맷 ── */
function fmtDate(v) {
  if (!v) return "";
  const [y, m, d] = v.split("-");
  const dt = new Date(+y, +m - 1, +d);
  return `${+m}월 ${+d}일 (${
    ["일", "월", "화", "수", "목", "금", "토"][dt.getDay()]
  })`;
}
function fmtTime(v) {
  if (!v) return "";
  const [h, mi] = v.split(":").map(Number);
  return `${h < 12 ? "오전" : "오후"} ${
    h === 0 ? 12 : h > 12 ? h - 12 : h
  }:${String(mi).padStart(2, "0")}`;
}

/* ── 기울기 고정값 (메모지마다 살짝 다른 각도) ── */
const TILTS = [-2.1, 1.4, -1.0, 2.3, -1.7, 0.8, -2.5, 1.1];
const NOTE_COLORS = [
  "#fffbe6",
  "#fde8f0",
  "#e8f4ff",
  "#eefbe8",
  "#f3e8ff",
  "#ffeee8",
  "#e8fbfa",
  "#fff0f0",
];
const PINS = ["🩷", "🩵", "💛", "🩶", "💜", "🧡", "💚", "❤️"];

/* ── Persistent Storage 헬퍼 ── */
const SKEY = "dateinvite-v3";
async function sGet() {
  try {
    if (window.storage) {
      const r = await window.storage.get(SKEY, true);
      if (r?.value) return JSON.parse(r.value);
    }
  } catch {}
  try {
    const s = localStorage.getItem(SKEY);
    if (s) return JSON.parse(s);
  } catch {}
  return [];
}
async function sSet(arr) {
  try {
    if (window.storage)
      await window.storage.set(SKEY, JSON.stringify(arr), true);
  } catch {}
  try {
    localStorage.setItem(SKEY, JSON.stringify(arr));
  } catch {}
}

/* ── 메인 ── */
export default function App() {
  const [screen, setScreen] = useState("intro");
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [entries, setEntries] = useState([]);
  const [toast, setToast] = useState("");
  const [loaded, setLoaded] = useState(false);

  /* 초기 로드 */
  useEffect(() => {
    sGet().then((d) => {
      setEntries(Array.isArray(d) ? d : []);
      setLoaded(true);
    });
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  };

  const submit = async () => {
    if (!name.trim()) {
      showToast("✏️ 이름을 적어줘요!");
      return;
    }
    if (!date) {
      showToast("📅 날짜를 골라줘요!");
      return;
    }
    if (!time) {
      showToast("⏰ 시간을 골라줘요!");
      return;
    }
    if (!note.trim()) {
      showToast("💭 하고 싶은 데이트를 적어줘요!");
      return;
    }
    const e = {
      id: Date.now(),
      name: name.trim(),
      date,
      time,
      note: note.trim(),
      displayDate: fmtDate(date),
      displayTime: fmtTime(time),
      ts: Date.now(),
    };
    const next = [e, ...entries];
    setEntries(next);
    await sSet(next);
    setName("");
    setDate("");
    setTime("");
    setNote("");
    setScreen("list");
  };

  const del = async (id) => {
    const next = entries.filter((e) => e.id !== id);
    setEntries(next);
    await sSet(next);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'Nunito',sans-serif;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pop{0%{transform:scale(.85);opacity:0}60%{transform:scale(1.04)}100%{transform:scale(1);opacity:1}}
        @keyframes floatY{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        input:focus,textarea:focus{outline:none;border-color:#f472b6!important;box-shadow:0 0 0 3px rgba(244,114,182,.18)!important;}
        .hbtn:hover{transform:translateY(-2px)!important;filter:brightness(1.06)!important;}
        .hbtn:active{transform:scale(.97)!important;}
        .del:hover{color:#f43f5e!important;}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:#f9a8d4;border-radius:99px}
        ::placeholder{color:#c4a0b8;font-family:'Nunito',sans-serif;}
        input[type=date]::-webkit-calendar-picker-indicator,
        input[type=time]::-webkit-calendar-picker-indicator{filter:invert(60%) sepia(20%) saturate(500%) hue-rotate(290deg);cursor:pointer;}
      `}</style>

      <Particles active={screen === "list"} />

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#fff",
            border: "2px solid #f9a8d4",
            borderRadius: 99,
            padding: "11px 24px",
            fontFamily: "'Nunito',sans-serif",
            fontWeight: 700,
            fontSize: "0.95rem",
            color: "#be185d",
            boxShadow: "0 4px 20px rgba(244,114,182,.25)",
            zIndex: 9999,
            animation: "fadeUp .3s ease both",
            whiteSpace: "nowrap",
          }}
        >
          {toast}
        </div>
      )}

      {/* ════ INTRO ════ */}
      {screen === "intro" && (
        <div
          style={{
            minHeight: "100vh",
            background:
              "linear-gradient(145deg,#fff0f6 0%,#fce7f3 50%,#fdf2f8 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px 16px",
          }}
        >
          <div
            style={{ textAlign: "center", animation: "fadeUp .6s ease both" }}
          >
            {/* 큰 이모지 */}
            <div
              style={{
                fontSize: "5rem",
                marginBottom: 8,
                animation: "floatY 2.8s ease-in-out infinite",
              }}
            >
              💌
            </div>
            <div
              style={{
                fontSize: "1rem",
                letterSpacing: ".12em",
                fontWeight: 700,
                color: "#f9a8d4",
                textTransform: "uppercase",
                marginBottom: 18,
              }}
            >
              Special Invitation
            </div>
            <h1
              style={{
                fontSize: "clamp(1.8rem,6vw,2.6rem)",
                fontWeight: 900,
                color: "#831843",
                lineHeight: 1.25,
                marginBottom: 12,
              }}
            >
              서현이랑
              <br />
              데이트 할래요? 💗
            </h1>
            <p
              style={{
                color: "#9d174d",
                fontSize: "1.05rem",
                fontWeight: 600,
                marginBottom: 36,
                lineHeight: 1.7,
              }}
            >
              소중한 사람과의 약속을 남겨봐요 🌸
              <br />
              <span style={{ fontSize: ".9rem", color: "#c084fc" }}>
                신청 내역은 모두가 볼 수 있어요
              </span>
            </p>
            <button
              className="hbtn"
              onClick={() => setScreen("form")}
              style={{
                background: "linear-gradient(135deg,#f472b6,#ec4899)",
                color: "#fff",
                border: "none",
                borderRadius: 99,
                padding: "16px 48px",
                fontSize: "1.2rem",
                fontWeight: 800,
                fontFamily: "'Nunito',sans-serif",
                cursor: "pointer",
                boxShadow: "0 8px 24px rgba(236,72,153,.35)",
                transition: "transform .15s,filter .15s",
              }}
            >
              신청하기 💕
            </button>
            {entries.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <button
                  onClick={() => setScreen("list")}
                  style={{
                    background: "none",
                    border: "2px solid #f9a8d4",
                    borderRadius: 99,
                    padding: "9px 24px",
                    fontSize: ".95rem",
                    fontWeight: 700,
                    color: "#be185d",
                    cursor: "pointer",
                    fontFamily: "'Nunito',sans-serif",
                    transition: "background .15s",
                  }}
                  onMouseOver={(e) => (e.target.style.background = "#fce7f3")}
                  onMouseOut={(e) => (e.target.style.background = "none")}
                >
                  📋 신청 목록 보기 ({entries.length})
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════ FORM ════ */}
      {screen === "form" && (
        <div
          style={{
            minHeight: "100vh",
            background:
              "linear-gradient(145deg,#fff0f6 0%,#fce7f3 50%,#fdf2f8 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px 16px",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 28,
              padding: "36px 32px 40px",
              maxWidth: 460,
              width: "100%",
              boxShadow:
                "0 12px 48px rgba(236,72,153,.12),0 2px 8px rgba(236,72,153,.08)",
              animation: "pop .45s ease both",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* 상단 핑크 배너 */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 6,
                background: "linear-gradient(90deg,#f472b6,#c084fc,#60a5fa)",
              }}
            />

            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ fontSize: "2.2rem", marginBottom: 6 }}>📝</div>
              <h2
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 900,
                  color: "#831843",
                  marginBottom: 4,
                }}
              >
                약속 신청서
              </h2>
              <p
                style={{ color: "#c084fc", fontSize: ".9rem", fontWeight: 600 }}
              >
                모든 항목을 채워주세요 🌷
              </p>
            </div>

            {/* 이름 */}
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  fontWeight: 800,
                  color: "#9d174d",
                  fontSize: ".9rem",
                  marginBottom: 6,
                  letterSpacing: ".03em",
                }}
              >
                ✏️ 이름
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름을 입력해줘요"
                type="text"
                style={{
                  width: "100%",
                  background: "#fdf2f8",
                  border: "2px solid #fce7f3",
                  borderRadius: 14,
                  padding: "12px 15px",
                  fontSize: "1rem",
                  fontWeight: 600,
                  color: "#831843",
                  fontFamily: "'Nunito',sans-serif",
                  transition: "border-color .2s",
                }}
              />
            </div>

            {/* 날짜 + 시간 */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontWeight: 800,
                    color: "#9d174d",
                    fontSize: ".9rem",
                    marginBottom: 6,
                  }}
                >
                  📅 날짜
                </label>
                <input
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  type="date"
                  style={{
                    width: "100%",
                    background: "#fdf2f8",
                    border: "2px solid #fce7f3",
                    borderRadius: 14,
                    padding: "12px 12px",
                    fontSize: ".95rem",
                    fontWeight: 600,
                    color: "#831843",
                    fontFamily: "'Nunito',sans-serif",
                    transition: "border-color .2s",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontWeight: 800,
                    color: "#9d174d",
                    fontSize: ".9rem",
                    marginBottom: 6,
                  }}
                >
                  ⏰ 시간
                </label>
                <input
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  type="time"
                  style={{
                    width: "100%",
                    background: "#fdf2f8",
                    border: "2px solid #fce7f3",
                    borderRadius: 14,
                    padding: "12px 12px",
                    fontSize: ".95rem",
                    fontWeight: 600,
                    color: "#831843",
                    fontFamily: "'Nunito',sans-serif",
                    transition: "border-color .2s",
                  }}
                />
              </div>
            </div>

            {/* 데이트 내용 */}
            <div style={{ marginBottom: 28 }}>
              <label
                style={{
                  display: "block",
                  fontWeight: 800,
                  color: "#9d174d",
                  fontSize: ".9rem",
                  marginBottom: 6,
                }}
              >
                💭 하고 싶은 데이트
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="예: 한강에서 치킨 먹으면서 야경 보기 🌉"
                style={{
                  width: "100%",
                  background: "#fdf2f8",
                  border: "2px solid #fce7f3",
                  borderRadius: 14,
                  padding: "12px 15px",
                  fontSize: "1rem",
                  fontWeight: 600,
                  color: "#831843",
                  fontFamily: "'Nunito',sans-serif",
                  minHeight: 96,
                  resize: "vertical",
                  lineHeight: 1.65,
                  transition: "border-color .2s",
                }}
              />
            </div>

            <button
              className="hbtn"
              onClick={submit}
              style={{
                width: "100%",
                background: "linear-gradient(135deg,#f472b6,#ec4899)",
                color: "#fff",
                border: "none",
                borderRadius: 99,
                padding: "15px",
                fontSize: "1.1rem",
                fontWeight: 800,
                fontFamily: "'Nunito',sans-serif",
                cursor: "pointer",
                boxShadow: "0 6px 20px rgba(236,72,153,.3)",
                transition: "transform .15s,filter .15s",
              }}
            >
              약속 신청하기 💌
            </button>

            <button
              onClick={() => setScreen("intro")}
              style={{
                display: "block",
                margin: "14px auto 0",
                background: "none",
                border: "none",
                color: "#c084fc",
                fontSize: ".9rem",
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "'Nunito',sans-serif",
              }}
            >
              ← 돌아가기
            </button>
          </div>
        </div>
      )}

      {/* ════ LIST (코르크보드) ════ */}
      {screen === "list" && (
        <div
          style={{
            minHeight: "100vh",
            background:
              "linear-gradient(145deg,#fff0f6 0%,#fce7f3 60%,#f5f3ff 100%)",
            padding: "32px 16px 48px",
            fontFamily: "'Nunito',sans-serif",
          }}
        >
          {/* 헤더 */}
          <div
            style={{
              textAlign: "center",
              marginBottom: 32,
              animation: "fadeUp .5s ease both",
            }}
          >
            <div style={{ fontSize: "2.4rem", marginBottom: 4 }}>📌</div>
            <h1
              style={{
                fontSize: "clamp(1.5rem,5vw,2.2rem)",
                fontWeight: 900,
                color: "#831843",
                marginBottom: 6,
              }}
            >
              데이트 신청 목록
            </h1>
            <p
              style={{ color: "#c084fc", fontWeight: 600, fontSize: ".95rem" }}
            >
              총 {entries.length}개의 약속이 기다리고 있어요 💕
            </p>
          </div>

          {/* 버튼 행 */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 10,
              marginBottom: 32,
              flexWrap: "wrap",
            }}
          >
            <button
              className="hbtn"
              onClick={() => setScreen("form")}
              style={{
                background: "linear-gradient(135deg,#f472b6,#ec4899)",
                color: "#fff",
                border: "none",
                borderRadius: 99,
                padding: "11px 26px",
                fontSize: "1rem",
                fontWeight: 800,
                fontFamily: "'Nunito',sans-serif",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(236,72,153,.3)",
                transition: "transform .15s,filter .15s",
              }}
            >
              + 새 약속 신청하기
            </button>
            <button
              onClick={() => setScreen("intro")}
              style={{
                background: "#fff",
                border: "2px solid #f9a8d4",
                borderRadius: 99,
                padding: "11px 22px",
                fontSize: ".95rem",
                fontWeight: 700,
                color: "#be185d",
                cursor: "pointer",
                fontFamily: "'Nunito',sans-serif",
              }}
            >
              🏠 처음으로
            </button>
          </div>

          {/* 메모지 그리드 */}
          {!loaded ? (
            <div
              style={{
                textAlign: "center",
                color: "#c084fc",
                fontSize: "1.1rem",
                padding: "40px 0",
              }}
            >
              🌸 불러오는 중...
            </div>
          ) : entries.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <div style={{ fontSize: "3rem", marginBottom: 12 }}>📭</div>
              <p
                style={{
                  color: "#9d174d",
                  fontWeight: 700,
                  fontSize: "1.05rem",
                }}
              >
                아직 신청이 없어요!
              </p>
              <p style={{ color: "#c084fc", fontSize: ".9rem", marginTop: 4 }}>
                첫 번째 약속을 남겨봐요 💕
              </p>
            </div>
          ) : (
            <div
              style={{
                maxWidth: 900,
                margin: "0 auto",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))",
                gap: "28px 24px",
                alignItems: "start",
              }}
            >
              {entries.map((e, i) => {
                const tilt = TILTS[i % TILTS.length];
                const bg = NOTE_COLORS[i % NOTE_COLORS.length];
                const pin = PINS[i % PINS.length];
                return (
                  <div
                    key={e.id}
                    style={{
                      background: bg,
                      borderRadius: 4,
                      padding: "32px 20px 22px",
                      boxShadow: `${
                        tilt > 0 ? "3px" : "−3px"
                      } 4px 18px rgba(0,0,0,.10),0 1px 3px rgba(0,0,0,.06)`,
                      transform: `rotate(${tilt}deg)`,
                      transition: "transform .2s,box-shadow .2s",
                      position: "relative",
                      animation: `fadeUp .45s ease ${Math.min(
                        i * 0.08,
                        0.5
                      )}s both`,
                      cursor: "default",
                    }}
                    onMouseOver={(e2) => {
                      e2.currentTarget.style.transform = "rotate(0deg)";
                      e2.currentTarget.style.boxShadow =
                        "0 12px 32px rgba(0,0,0,.16)";
                    }}
                    onMouseOut={(e2) => {
                      e2.currentTarget.style.transform = `rotate(${tilt}deg)`;
                      e2.currentTarget.style.boxShadow = `${
                        tilt > 0 ? "3px" : "-3px"
                      } 4px 18px rgba(0,0,0,.10),0 1px 3px rgba(0,0,0,.06)`;
                    }}
                  >
                    {/* 핀 */}
                    <div
                      style={{
                        position: "absolute",
                        top: -10,
                        left: "50%",
                        transform: "translateX(-50%)",
                        fontSize: "1.5rem",
                        filter: "drop-shadow(0 2px 3px rgba(0,0,0,.2))",
                      }}
                    >
                      {pin}
                    </div>
                    {/* 삭제 */}
                    <button
                      className="del"
                      onClick={() => del(e.id)}
                      style={{
                        position: "absolute",
                        top: 8,
                        right: 10,
                        background: "none",
                        border: "none",
                        color: "#cbd5e1",
                        fontSize: "1rem",
                        cursor: "pointer",
                        fontFamily: "'Nunito',sans-serif",
                        lineHeight: 1,
                        transition: "color .15s",
                      }}
                    >
                      ✕
                    </button>

                    {/* 이름 */}
                    <div
                      style={{
                        fontWeight: 900,
                        fontSize: "1.1rem",
                        color: "#1e293b",
                        marginBottom: 10,
                        paddingTop: 4,
                      }}
                    >
                      {e.name}{" "}
                      <span
                        style={{
                          fontSize: ".8rem",
                          fontWeight: 600,
                          color: "#94a3b8",
                        }}
                      >
                        님
                      </span>
                    </div>

                    {/* 날짜·시간 뱃지 */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 5,
                        marginBottom: 12,
                      }}
                    >
                      <span
                        style={{
                          background: "rgba(255,255,255,.7)",
                          borderRadius: 8,
                          padding: "4px 10px",
                          fontSize: ".82rem",
                          fontWeight: 700,
                          color: "#475569",
                          display: "inline-block",
                        }}
                      >
                        📅 {e.displayDate}
                      </span>
                      <span
                        style={{
                          background: "rgba(255,255,255,.7)",
                          borderRadius: 8,
                          padding: "4px 10px",
                          fontSize: ".82rem",
                          fontWeight: 700,
                          color: "#475569",
                          display: "inline-block",
                        }}
                      >
                        ⏰ {e.displayTime}
                      </span>
                    </div>

                    {/* 메모 본문 */}
                    <div
                      style={{
                        fontSize: ".92rem",
                        color: "#334155",
                        lineHeight: 1.7,
                        fontWeight: 600,
                        borderTop: "1.5px dashed rgba(0,0,0,.1)",
                        paddingTop: 10,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {e.note}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  );
}
