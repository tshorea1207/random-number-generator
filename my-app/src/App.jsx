import { useState, useCallback, useEffect } from "react";

// ── tiny helpers ──────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── "ジャ〜〜〜ン" sound via Web Audio API ──────────────────────
function playJaan() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const r = () => Math.random();
  const totalDuration = 0.8 + r() * 2.2;
  const startFreq     = 220;
  const midFreq       = 150 + r() * 350;
  const endFreq       = 80  + r() * 200;
  const distAmount    = r() * 0.88;
  const vibratoRate   = 3   + r() * 9;
  const vibratoDepth  = r() * 30;
  const waveforms     = ["sawtooth", "square", "triangle"];
  const useWaveform   = waveforms[Math.floor(r() * 3)];
  const osc        = ctx.createOscillator();
  const vibOsc     = ctx.createOscillator();
  const vibGain    = ctx.createGain();
  const waveShaper = ctx.createWaveShaper();
  const gainNode   = ctx.createGain();
  const samples = 256;
  const curve   = new Float32Array(samples);
  const k       = distAmount * 400;
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = k === 0 ? x : ((Math.PI + k) * x) / (Math.PI + k * Math.abs(x));
  }
  waveShaper.curve = curve;
  waveShaper.oversample = "4x";
  osc.type = useWaveform;
  const now = ctx.currentTime;
  osc.frequency.setValueAtTime(startFreq, now);
  osc.frequency.linearRampToValueAtTime(midFreq, now + totalDuration * 0.35);
  osc.frequency.linearRampToValueAtTime(endFreq, now + totalDuration);
  vibOsc.type = "sine";
  vibOsc.frequency.setValueAtTime(vibratoRate, now);
  vibGain.gain.setValueAtTime(vibratoDepth, now);
  vibOsc.connect(vibGain);
  vibGain.connect(osc.frequency);
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.55, now + 0.04);
  gainNode.gain.linearRampToValueAtTime(0.38, now + 0.18);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + totalDuration);
  osc.connect(waveShaper);
  waveShaper.connect(gainNode);
  gainNode.connect(ctx.destination);
  osc.start(now);
  vibOsc.start(now);
  osc.stop(now + totalDuration + 0.05);
  vibOsc.stop(now + totalDuration + 0.05);
  osc.onended = () => ctx.close();
}

// ── NumberGrid ────────────────────────────────────────────────
// history: [{ value, max, time, manual? }]
// onTap(num): toggle used/unused for that number
function NumberGrid({ pool, usedSet, current, onTap, rolling }) {
  const COLS = 4;
  const padded = [...pool];
  while (padded.length % COLS !== 0) padded.push(null);
  const rows = [];
  for (let i = 0; i < padded.length; i += COLS) rows.push(padded.slice(i, i + COLS));

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 420,
        background: "rgba(8,8,24,0.7)",
        border: "1px solid rgba(99,102,241,0.18)",
        borderRadius: 12,
        overflow: "hidden",
        backdropFilter: "blur(8px)",
      }}
    >
      {rows.map((row, ri) => (
        <div
          key={ri}
          style={{
            display: "flex",
            borderBottom: ri < rows.length - 1 ? "1px solid rgba(99,102,241,0.1)" : "none",
          }}
        >
          {row.map((num, ci) => {
            const isUsed    = num !== null && usedSet.has(num);
            const isCurrent = num !== null && num === current;
            const tappable  = num !== null && !rolling;
            return (
              <div
                key={ci}
                onClick={() => tappable && onTap(num)}
                style={{
                  flex: 1,
                  aspectRatio: "1 / 1",
                  maxHeight: 72,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRight: ci < COLS - 1 ? "1px solid rgba(99,102,241,0.1)" : "none",
                  position: "relative",
                  transition: "background 0.25s",
                  background: isCurrent
                    ? "rgba(99,102,241,0.22)"
                    : isUsed
                    ? "rgba(10,10,28,0.9)"
                    : "transparent",
                  boxShadow: isCurrent ? "inset 0 0 20px rgba(99,102,241,0.25)" : "none",
                  cursor: tappable ? "pointer" : "default",
                }}
                onMouseEnter={(e) => {
                  if (tappable && !isCurrent)
                    e.currentTarget.style.background = isUsed
                      ? "rgba(99,102,241,0.08)"
                      : "rgba(99,102,241,0.1)";
                }}
                onMouseLeave={(e) => {
                  if (tappable && !isCurrent)
                    e.currentTarget.style.background = isUsed
                      ? "rgba(10,10,28,0.9)"
                      : "transparent";
                }}
              >
                {/* dark overlay for used */}
                {isUsed && !isCurrent && (
                  <div style={{ position: "absolute", inset: 0, background: "rgba(6,6,18,0.75)", pointerEvents: "none" }} />
                )}
                {/* pulse ring for current */}
                {isCurrent && (
                  <div style={{
                    position: "absolute", inset: 3, borderRadius: 6,
                    border: "1.5px solid rgba(165,180,252,0.6)",
                    boxShadow: "0 0 12px rgba(99,102,241,0.5)",
                    animation: "pulse-ring 1.2s ease-in-out infinite",
                    pointerEvents: "none",
                  }} />
                )}
                {/* manual-mark indicator (small dot top-right) */}
                {isUsed && !isCurrent && (
                  <div style={{
                    position: "absolute", top: 5, right: 5,
                    width: 5, height: 5, borderRadius: "50%",
                    background: "rgba(99,102,241,0.35)",
                    pointerEvents: "none",
                  }} />
                )}
                <span
                  style={{
                    position: "relative",
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: "clamp(1.1rem, 4vw, 1.6rem)",
                    letterSpacing: "0.04em",
                    color: isCurrent
                      ? "#e0e7ff"
                      : isUsed
                      ? "rgba(99,102,241,0.22)"
                      : "rgba(148,163,184,0.55)",
                    filter: isCurrent ? "drop-shadow(0 0 8px rgba(165,180,252,0.9))" : "none",
                    transition: "color 0.25s, filter 0.25s",
                    userSelect: "none",
                  }}
                >
                  {num !== null ? num : ""}
                </span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Overlay ───────────────────────────────────────────────────
function Overlay({ open, onClose, children }) {
  useEffect(() => {
    if (!open) return;
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(4,4,20,0.82)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm mx-4 rounded-2xl p-6"
        style={{
          background: "linear-gradient(145deg,#0b0b22,#0f0f2a)",
          border: "1px solid rgba(99,102,241,0.25)",
          boxShadow: "0 0 60px rgba(99,102,241,0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function TogglePill({ left, right, value, onChange }) {
  return (
    <div
      className="flex rounded-full p-1 gap-1"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      {[left, right].map((label, i) => {
        const active = (i === 0) === !value;
        return (
          <button
            key={label}
            onClick={() => onChange(i !== 0)}
            className="flex-1 rounded-full py-1.5 text-xs font-bold tracking-widest transition-all duration-200"
            style={{
              background: active ? "linear-gradient(135deg,#6366f1,#4f46e5)" : "transparent",
              color: active ? "#fff" : "rgba(148,163,184,0.6)",
              boxShadow: active ? "0 0 16px rgba(99,102,241,0.4)" : "none",
              letterSpacing: "0.15em",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ── main ──────────────────────────────────────────────────────
export default function App() {
  const [result, setResult]             = useState(null);
  // history: single source of truth for "used" numbers
  // each entry: { value: number, max: number, time: string, manual: bool }
  const [history, setHistory]           = useState([]);
  const [maxValue, setMaxValue]         = useState(12);
  const [startZero, setStartZero]       = useState(false);
  const [excludePrev, setExcludePrev]   = useState(true);
  const [rolling, setRolling]           = useState(false);
  const [showResult, setShowResult]     = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen]   = useState(false);

  const min     = startZero ? 0 : 1;
  const pool    = Array.from({ length: maxValue - min + 1 }, (_, i) => i + min);
  // usedSet: all values that appear in history (regardless of source)
  const usedSet = new Set(history.map((h) => h.value));

  // Toggle a number manually via grid tap
  const handleGridTap = useCallback((num) => {
    if (rolling) return;
    setHistory((prev) => {
      const idx = prev.findIndex((h) => h.value === num);
      if (idx !== -1) {
        // already used → remove from history (un-mark)
        const next = prev.filter((_, i) => i !== idx);
        // if it was the currently displayed result, clear result too
        if (result === num) setResult(null);
        return next;
      } else {
        // not used → add as manual entry at front
        return [
          { value: num, max: maxValue, time: new Date().toLocaleTimeString("ja-JP"), manual: true },
          ...prev,
        ];
      }
    });
  }, [rolling, maxValue, result]);

  const generate = useCallback(async () => {
    if (rolling) return;
    const mn   = startZero ? 0 : 1;
    const pl   = Array.from({ length: maxValue - mn + 1 }, (_, i) => i + mn);
    const used = new Set(history.map((h) => h.value));
    const available = excludePrev ? pl.filter((n) => !used.has(n)) : pl;
    if (available.length === 0) return;

    setRolling(true);
    setShowResult(false);

    for (let i = 0; i < 14; i++) {
      setResult(available[Math.floor(Math.random() * available.length)]);
      await sleep(40 + i * 12);
    }
    const final = available[Math.floor(Math.random() * available.length)];
    setResult(final);
    playJaan();
    setHistory((prev) => [
      { value: final, max: maxValue, time: new Date().toLocaleTimeString("ja-JP"), manual: false },
      ...prev,
    ]);
    setRolling(false);
    setShowResult(true);
  }, [rolling, startZero, maxValue, excludePrev, history]);

  const clear = () => {
    setResult(null);
    setHistory([]);
    setShowResult(false);
  };

  const available = excludePrev ? pool.filter((n) => !usedSet.has(n)) : pool;
  const exhausted  = excludePrev && available.length === 0;
  const gridCurrent = rolling ? null : result;

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Bebas+Neue&display=swap"
        rel="stylesheet"
      />

      <div
        className="min-h-screen w-full flex flex-col items-center relative overflow-x-hidden"
        style={{ background: "#04040e", fontFamily: "'Space Mono', monospace", paddingTop: 70, paddingBottom: 48 }}
      >
        {/* background grid */}
        <div
          className="pointer-events-none fixed inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(99,102,241,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.05) 1px,transparent 1px)",
            backgroundSize: "56px 56px",
            zIndex: 0,
          }}
        />
        <div className="pointer-events-none fixed" style={{
          width: 600, height: 600, borderRadius: "50%",
          background: "radial-gradient(circle,rgba(99,102,241,0.09) 0%,transparent 70%)",
          top: "40%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 0,
        }} />

        {/* top-left buttons */}
        <div className="fixed top-4 left-4 flex gap-2 z-20">
          {[
            { label: "設定", icon: "⚙", action: () => setSettingsOpen(true) },
            { label: "ヒストリー", icon: "◈", action: () => setHistoryOpen(true) },
          ].map(({ label, icon, action }) => (
            <button key={label} onClick={action}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150"
              style={{ background: "rgba(71,85,105,0.18)", border: "1px solid rgba(71,85,105,0.4)", color: "rgba(148,163,184,0.85)", letterSpacing: "0.12em" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(71,85,105,0.35)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(71,85,105,0.18)")}
            ><span>{icon}</span>{label}</button>
          ))}
        </div>

        {/* top-right clear */}
        <div className="fixed top-4 right-4 z-20">
          <button onClick={clear}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150"
            style={{ background: "rgba(220,38,38,0.12)", border: "1px solid rgba(220,38,38,0.4)", color: "rgba(248,113,113,0.9)", letterSpacing: "0.12em" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(220,38,38,0.28)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(220,38,38,0.12)")}
          ><span>✕</span>クリア</button>
        </div>

        {/* content */}
        <div className="relative flex flex-col items-center gap-6 w-full px-4" style={{ zIndex: 1, maxWidth: 480 }}>

          {/* Number Board */}
          <div className="w-full flex flex-col items-center gap-2">
            <div className="flex items-center gap-3">
              <span style={{ color: "rgba(99,102,241,0.35)", fontSize: "0.6rem", letterSpacing: "0.4em" }}>NUMBER BOARD</span>
              <span style={{ color: "rgba(99,102,241,0.25)", fontSize: "0.55rem", letterSpacing: "0.1em" }}>
                {usedSet.size}/{pool.length}
              </span>
            </div>
            <NumberGrid
              pool={pool}
              usedSet={usedSet}
              current={gridCurrent}
              onTap={handleGridTap}
              rolling={rolling}
            />
            <span style={{ color: "rgba(99,102,241,0.2)", fontSize: "0.55rem", letterSpacing: "0.15em" }}>
              タップで生成済みにする / 再タップで解除
            </span>
          </div>

          {/* result display */}
          <div className="flex items-center justify-center" style={{ minHeight: 200 }}>
            {result !== null ? (
              <div
                className="flex flex-col items-center"
                style={{ animation: showResult && !rolling ? "pop 0.3s cubic-bezier(.34,1.56,.64,1)" : "none" }}
              >
                <span
                  onClick={() => { if (!rolling) setResult(null); }}
                  style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: "clamp(10rem,38vw,20rem)",
                    lineHeight: 1,
                    background: rolling
                      ? "linear-gradient(135deg,#475569,#64748b)"
                      : "linear-gradient(135deg,#a5b4fc 0%,#818cf8 50%,#6366f1 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    filter: rolling ? "none" : "drop-shadow(0 0 40px rgba(99,102,241,0.6))",
                    transition: "filter 0.2s, opacity 0.15s",
                    cursor: rolling ? "default" : "pointer",
                    letterSpacing: "-2px",
                  }}
                  onMouseEnter={(e) => { if (!rolling) e.currentTarget.style.opacity = "0.6"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                >
                  {result}
                </span>
                {!rolling && (
                  <span style={{ color: "rgba(99,102,241,0.45)", fontSize: "0.7rem", letterSpacing: "0.3em", marginTop: 4 }}>
                    / {maxValue}
                  </span>
                )}
              </div>
            ) : (
              <span style={{ color: "rgba(99,102,241,0.2)", fontSize: "0.75rem", letterSpacing: "0.5em" }}>
                ── STANDBY ──
              </span>
            )}
          </div>

          {/* generate button */}
          <button
            onClick={generate}
            disabled={rolling || exhausted}
            className="rounded-2xl px-14 py-4 text-sm font-bold tracking-widest transition-all duration-200"
            style={{
              background: exhausted ? "rgba(30,30,50,0.6)" : rolling ? "rgba(30,30,70,0.8)" : "linear-gradient(135deg,#4f46e5,#6366f1)",
              color: exhausted ? "rgba(99,102,241,0.3)" : "#e0e7ff",
              border: `1px solid ${exhausted ? "rgba(99,102,241,0.1)" : "rgba(165,180,252,0.3)"}`,
              boxShadow: rolling || exhausted ? "none" : "0 0 40px rgba(99,102,241,0.35), inset 0 1px 0 rgba(255,255,255,0.1)",
              letterSpacing: "0.25em",
              cursor: rolling || exhausted ? "not-allowed" : "pointer",
            }}
            onMouseEnter={(e) => { if (!rolling && !exhausted) e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; }}
          >
            {exhausted ? "ALL DONE" : rolling ? "ROLLING…" : "GENERATE"}
          </button>

          {/* max value selector */}
          <div className="flex flex-col items-center gap-2">
            <span style={{ color: "rgba(99,102,241,0.4)", fontSize: "0.6rem", letterSpacing: "0.35em" }}>MAX VALUE</span>
            <div className="relative">
              <select
                value={maxValue}
                onChange={(e) => setMaxValue(Number(e.target.value))}
                className="appearance-none rounded-xl px-6 py-2.5 pr-10 text-sm font-bold text-center cursor-pointer outline-none"
                style={{ background: "rgba(15,15,40,0.9)", border: "1px solid rgba(99,102,241,0.25)", color: "#a5b4fc", letterSpacing: "0.1em", fontFamily: "'Space Mono', monospace" }}
              >
                {[6, 10, 12, 20, 50, 100].map((v) => (
                  <option key={v} value={v} style={{ background: "#0b0b22" }}>
                    {startZero ? 0 : 1} 〜 {v}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: "rgba(99,102,241,0.5)", fontSize: "0.65rem" }}>▼</span>
            </div>
          </div>

        </div>

        {/* Settings Dialog */}
        <Overlay open={settingsOpen} onClose={() => setSettingsOpen(false)}>
          <h2 className="text-xs font-bold mb-6" style={{ color: "#a5b4fc", letterSpacing: "0.35em" }}>⚙ SETTINGS</h2>
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-xs mb-2" style={{ color: "rgba(148,163,184,0.5)", letterSpacing: "0.2em" }}>START VALUE</p>
              <TogglePill left="1始まり" right="0始まり" value={startZero} onChange={setStartZero} />
            </div>
            <div className="h-px w-full" style={{ background: "rgba(99,102,241,0.12)" }} />
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold" style={{ color: "rgba(226,232,240,0.8)", letterSpacing: "0.08em" }}>重複を除外</p>
                <p className="text-xs mt-1" style={{ color: "rgba(148,163,184,0.45)", letterSpacing: "0.05em" }}>既出の数字を次回から除く</p>
              </div>
              <button
                onClick={() => setExcludePrev((v) => !v)}
                className="relative rounded-full transition-all duration-300 flex-shrink-0"
                style={{ width: 48, height: 26, background: excludePrev ? "linear-gradient(135deg,#4f46e5,#6366f1)" : "rgba(71,85,105,0.4)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: excludePrev ? "0 0 16px rgba(99,102,241,0.4)" : "none" }}
              >
                <span className="absolute top-0.5 rounded-full transition-all duration-300"
                  style={{ width: 20, height: 20, background: "#fff", left: excludePrev ? 24 : 2, boxShadow: "0 1px 4px rgba(0,0,0,0.4)" }} />
              </button>
            </div>
          </div>
          <button onClick={() => setSettingsOpen(false)}
            className="mt-8 w-full rounded-xl py-2.5 text-xs font-bold tracking-widest"
            style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", color: "#a5b4fc", letterSpacing: "0.2em" }}
          >CLOSE</button>
        </Overlay>

        {/* History Dialog */}
        <Overlay open={historyOpen} onClose={() => setHistoryOpen(false)}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold" style={{ color: "#a5b4fc", letterSpacing: "0.35em" }}>◈ HISTORY</h2>
            {history.length > 0 && (
              <button onClick={() => { setHistory([]); setResult(null); }}
                className="text-xs px-2 py-1 rounded-lg"
                style={{ color: "rgba(248,113,113,0.7)", border: "1px solid rgba(220,38,38,0.2)", background: "rgba(220,38,38,0.07)", letterSpacing: "0.1em" }}
              >全削除</button>
            )}
          </div>
          <div className="flex flex-col overflow-y-auto" style={{ maxHeight: 360 }}>
            {history.length === 0 ? (
              <p className="text-center py-10 text-xs" style={{ color: "rgba(99,102,241,0.3)", letterSpacing: "0.3em" }}>NO RECORDS</p>
            ) : (
              history.map((h, i) => (
                <div key={i}
                  className="flex items-center justify-between py-3"
                  style={{ borderBottom: "1px solid rgba(99,102,241,0.08)", background: i === 0 ? "rgba(99,102,241,0.04)" : "transparent" }}
                >
                  <div className="flex items-baseline gap-3">
                    <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", color: i === 0 ? "#a5b4fc" : "rgba(99,102,241,0.4)", lineHeight: 1, filter: i === 0 ? "drop-shadow(0 0 8px rgba(99,102,241,0.5))" : "none" }}>
                      {h.value}
                    </span>
                    <span style={{ color: "rgba(99,102,241,0.2)", fontSize: "0.65rem" }}>/{h.max}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {h.manual && (
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(71,85,105,0.15)", border: "1px solid rgba(71,85,105,0.3)", color: "rgba(148,163,184,0.5)", fontSize: "0.5rem", letterSpacing: "0.12em" }}
                      >MANUAL</span>
                    )}
                    {i === 0 && !h.manual && (
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", color: "#a5b4fc", fontSize: "0.5rem", letterSpacing: "0.12em" }}
                      >LATEST</span>
                    )}
                    {/* remove button */}
                    <button
                      onClick={() => {
                        setHistory((prev) => prev.filter((_, j) => j !== i));
                        if (result === h.value) setResult(null);
                      }}
                      style={{ color: "rgba(248,113,113,0.4)", fontSize: "0.7rem", lineHeight: 1, background: "none", border: "none", cursor: "pointer", padding: "2px 4px" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(248,113,113,0.85)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(248,113,113,0.4)")}
                    >✕</button>
                    <span style={{ color: "rgba(99,102,241,0.25)", fontSize: "0.6rem" }}>{h.time}</span>
                  </div>
                </div>
              ))
            )}
          </div>
          <button onClick={() => setHistoryOpen(false)}
            className="mt-6 w-full rounded-xl py-2.5 text-xs font-bold tracking-widest"
            style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", color: "#a5b4fc", letterSpacing: "0.2em" }}
          >CLOSE</button>
        </Overlay>

        <style>{`
          @keyframes pop {
            0%   { transform: scale(0.7); opacity: 0; }
            70%  { transform: scale(1.08); opacity: 1; }
            100% { transform: scale(1); }
          }
          @keyframes pulse-ring {
            0%, 100% { opacity: 0.7; box-shadow: 0 0 10px rgba(99,102,241,0.4); }
            50%       { opacity: 1;   box-shadow: 0 0 22px rgba(99,102,241,0.8); }
          }
        `}</style>
      </div>
    </>
  );
}
