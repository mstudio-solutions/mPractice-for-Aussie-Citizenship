import { useEffect, useMemo, useRef, useState } from "react";
// @ts-ignore
import QUESTIONS_RAW from "./assets/questions.json";

type RawQ = {
  id: number;
  part: number;
  topic: string;
  q_en: string;
  q_zh: string;
  options_en: string[];
  options_zh: string[];
  correct: number;
  is_values: boolean;
  is_key: boolean;
  explanation_en: string;
  explanation_zh: string;
};

type PreparedQ = {
  raw: RawQ;
  shuffledOptions: { text: string; originalIndex: number }[];
  correctShuffled: number;
};

type Mode = "exam" | "random" | "part" | "values" | "key";

type AnswerRecord = {
  qId: number;
  selectedOriginal: number | null;
  selectedShuffled: number | null;
  isCorrect: boolean;
  timedOut: boolean;
  timeSpent: number;
};

const QUESTIONS = QUESTIONS_RAW as RawQ[];

// mStudio app info
const APP_SHORT = "mPractice";
const APP_TAGLINE = "for Aussie Citizenship";
const APP_NAME = `${APP_SHORT} ${APP_TAGLINE}`;
const APP_VERSION = "1.0.0";
const COMPANY = "mStudio";
const CONTACT_EMAIL = "mstudiosolutions@gmail.com";
const LOCATION = "Australia";
const COPYRIGHT_YEAR = "2026";
const PRIVACY_UPDATED = "7 October 2026";
const OFFICIAL_SOURCE_URL = "https://immi.homeaffairs.gov.au/citizenship/test-and-interview/our-common-bond";

const PART_META: Record<number, { title: string; color: string; desc: string }> = {
  1: { title: "Australia and its people", color: "#0E4D45", desc: "History, Indigenous culture, states & symbols" },
  2: { title: "Democratic beliefs, rights and liberties", color: "#1A6B5A", desc: "Freedoms, rule of law, equality" },
  3: { title: "Government and the law in Australia", color: "#2C7A6B", desc: "Constitution, parliament, courts, voting" },
  4: { title: "Australian values", color: "#8A6A00", desc: "Must-pass values statements" },
};

function shuffleArr<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function prepareQuestion(raw: RawQ, doShuffle: boolean): PreparedQ {
  const opts = raw.options_en.map((t, idx) => ({
    text: t,
    originalIndex: idx,
  }));
  const shuffled = doShuffle ? shuffleArr(opts) : opts;
  const correctShuffled = shuffled.findIndex((o) => o.originalIndex === raw.correct);
  return { raw, shuffledOptions: shuffled, correctShuffled };
}

export default function App() {
  const [mode, setMode] = useState<Mode>("exam");
  const [selectedPart, setSelectedPart] = useState<number | null>(1);
  const [batchSize, setBatchSize] = useState<10 | 20 | 30>(20);
  const [timePerQ, setTimePerQ] = useState<number | null>(45);
  const [shuffleAnswers, setShuffleAnswers] = useState(true);

  const [view, setView] = useState<"dashboard" | "quiz" | "result" | "about" | "privacy">("dashboard");

  function openPage(page: "about" | "privacy" | "dashboard") {
    setView(page);
    window.scrollTo(0, 0);
  }
  const [currentQs, setCurrentQs] = useState<PreparedQ[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(45);
  const [history, setHistory] = useState<{ date: string; score: number; total: number; passed: boolean; mode: Mode }[]>([]);
  const [deckIds, setDeckIds] = useState<number[]>(() => shuffleArr(QUESTIONS.map((q) => q.id)));

  const timerRef = useRef<number | null>(null);

  const stats = useMemo(() => {
    const p1 = QUESTIONS.filter((q) => q.part === 1).length;
    const p2 = QUESTIONS.filter((q) => q.part === 2).length;
    const p3 = QUESTIONS.filter((q) => q.part === 3).length;
    const p4 = QUESTIONS.filter((q) => q.part === 4).length;
    const values = QUESTIONS.filter((q) => q.is_values).length;
    const keys = QUESTIONS.filter((q) => q.is_key).length;
    return { p1, p2, p3, p4, total: QUESTIONS.length, values, keys };
  }, []);

  const currentQ = currentQs[currentIdx];

  useEffect(() => {
    if (view !== "quiz") return;
    if (timePerQ === null) return;
    if (showFeedback && mode !== "exam") return;
    const id = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleTimeout();
          return timePerQ ?? 45;
        }
        return prev - 1;
      });
    }, 1000);
    timerRef.current = id;
    return () => clearInterval(id);
  }, [view, currentIdx, showFeedback, timePerQ, mode]);

  function handleTimeout() {
    const q = currentQs[currentIdx];
    if (!q) return;
    const rec: AnswerRecord = {
      qId: q.raw.id,
      selectedOriginal: null,
      selectedShuffled: null,
      isCorrect: false,
      timedOut: true,
      timeSpent: timePerQ ?? 0,
    };
    const nextAnswers = [...answers];
    nextAnswers[currentIdx] = rec;
    setAnswers(nextAnswers);
    if (mode === "exam") {
      goNext(nextAnswers);
    } else {
      setShowFeedback(true);
    }
  }

  function generateBatch(): PreparedQ[] {
    let pool: RawQ[] = [];
    const takeFromDeck = (candidates: RawQ[], count: number, deck: number[]) => {
      const ordered = [...candidates].sort((a, b) => {
        const ia = deck.indexOf(a.id);
        const ib = deck.indexOf(b.id);
        if (ia === -1 && ib === -1) return 0;
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      });
      const picked = ordered.slice(0, count);
      const remainingDeck = deck.filter((id) => !picked.some((p) => p.id === id));
      return { picked, remainingDeck };
    };

    let remainingDeck = [...deckIds];
    if (remainingDeck.length < batchSize) {
      remainingDeck = shuffleArr(QUESTIONS.map((q) => q.id));
    }

    if (mode === "exam") {
      const valuesPool = QUESTIONS.filter((q) => q.is_values);
      const otherPool = QUESTIONS.filter((q) => !q.is_values);
      const valuesPicked = shuffleArr(valuesPool).slice(0, Math.min(5, valuesPool.length));
      const remainingNeeded = batchSize - valuesPicked.length;
      const { picked: otherPicked, remainingDeck: afterOther } = takeFromDeck(otherPool, remainingNeeded, remainingDeck);
      const combined = shuffleArr([...valuesPicked, ...otherPicked]);
      const usedIds = combined.map((q) => q.id);
      const newDeck = afterOther.filter((id) => !valuesPicked.some((v) => v.id === id));
      setDeckIds(newDeck.length > 0 ? newDeck : shuffleArr(QUESTIONS.map((q) => q.id).filter((id) => !usedIds.includes(id))));
      pool = combined;
    } else if (mode === "random") {
      const { picked, remainingDeck: newDeck } = takeFromDeck(QUESTIONS, batchSize, remainingDeck);
      setDeckIds(newDeck.length === 0 ? shuffleArr(QUESTIONS.map((q) => q.id)) : newDeck);
      pool = picked;
    } else if (mode === "part") {
      const part = selectedPart ?? 1;
      const filtered = QUESTIONS.filter((q) => q.part === part);
      pool = shuffleArr(filtered).slice(0, Math.min(batchSize, filtered.length));
      const used = pool.map((q) => q.id);
      setDeckIds((d) => {
        const nd = d.filter((id) => !used.includes(id));
        return nd.length === 0 ? shuffleArr(QUESTIONS.map((q) => q.id)) : nd;
      });
    } else if (mode === "values") {
      const filtered = QUESTIONS.filter((q) => q.is_values);
      pool = shuffleArr(filtered).slice(0, Math.min(batchSize, filtered.length));
    } else if (mode === "key") {
      const filtered = QUESTIONS.filter((q) => q.is_key);
      pool = shuffleArr(filtered).slice(0, Math.min(batchSize, filtered.length));
    }

    return pool.map((raw) => prepareQuestion(raw, shuffleAnswers));
  }

  function startQuiz() {
    const batch = generateBatch();
    setCurrentQs(batch);
    setCurrentIdx(0);
    setAnswers(new Array(batch.length).fill(null as any));
    setShowFeedback(false);
    setTimeLeft(timePerQ ?? 60);
    setView("quiz");
    window.scrollTo(0, 0);
  }

  function handleSelectOption(shuffledIdx: number) {
    if (!currentQ) return;
    const origIdx = currentQ.shuffledOptions[shuffledIdx].originalIndex;
    const isCorrect = origIdx === currentQ.raw.correct;
    const rec: AnswerRecord = {
      qId: currentQ.raw.id,
      selectedOriginal: origIdx,
      selectedShuffled: shuffledIdx,
      isCorrect,
      timedOut: false,
      timeSpent: (timePerQ ?? 0) - timeLeft,
    };
    const newAnswers = [...answers];
    newAnswers[currentIdx] = rec;
    setAnswers(newAnswers);
    if (mode === "exam") {
      setTimeout(() => goNext(newAnswers), 350);
    } else {
      setShowFeedback(true);
    }
  }

  function goNext(curAnswers = answers) {
    if (currentIdx + 1 >= currentQs.length) {
      finishQuiz(curAnswers);
    } else {
      setCurrentIdx((i) => i + 1);
      setShowFeedback(false);
      setTimeLeft(timePerQ ?? 60);
    }
  }

  function finishQuiz(finalAnswers: AnswerRecord[]) {
    const correctCount = finalAnswers.filter((a) => a?.isCorrect).length;
    const valuesAnswers = finalAnswers.filter((_, i) => currentQs[i]?.raw.is_values);
    const valuesAllCorrect = valuesAnswers.length > 0 ? valuesAnswers.every((a) => a?.isCorrect) : true;
    const passed = mode === "exam" ? correctCount / finalAnswers.length >= 0.75 && valuesAllCorrect : correctCount / finalAnswers.length >= 0.6;
    setHistory((h) => [
      { date: new Date().toLocaleString("en-AU"), score: correctCount, total: finalAnswers.length, passed, mode },
      ...h,
    ].slice(0, 20));
    setView("result");
  }

  const progressPct = currentQs.length ? ((currentIdx + 1) / currentQs.length) * 100 : 0;
  const correctCount = answers.filter((a) => a?.isCorrect).length;
  const wrongList = answers.map((ans, i) => ({ ans, q: currentQs[i] })).filter((x) => x.ans && !x.ans.isCorrect);
  const valuesWrong = wrongList.filter((w) => w.q.raw.is_values).length;

  const modeLabels: Record<Mode, string> = {
    exam: "Full Mock",
    random: "Random",
    part: `Part ${selectedPart}`,
    values: "Values Only",
    key: "Key Questions",
  };

  return (
    <div className="min-h-screen w-full bg-[var(--beige)] text-[var(--ink)] selection:bg-[var(--gold)]">
      <style>{`
        :root{
          --green:#0E4D45;
          --green-2:#134F45;
          --gold:#FFCC33;
          --beige:#F6F1E7;
          --paper:#FFFBF2;
          --ink:#1E2B28;
          --muted:#6B7D79;
          --line:#E8DDC5;
          --danger:#C4503A;
          --ok:#1B7A5A;
        }
        body{font-family: ui-sans-system, -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, system-ui, sans-serif; -webkit-font-smoothing: antialiased;}
        .serif{font-family: Georgia, "Times New Roman", Times, serif; letter-spacing:-0.02em;}
        *{min-width:0}
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-[var(--paper)]/90 border-b border-[var(--line)]" style={{ paddingTop: "var(--safe-area-inset-top)" }}>
        <div className="mx-auto max-w-[1120px] px-4 md:px-6 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-[var(--green)] text-[var(--gold)] grid place-items-center font-bold text-[18px] serif shrink-0">AU</div>
            <div className="min-w-0">
              <h1 className="text-[18px] md:text-[21px] font-bold leading-tight tracking-tight truncate">
                <button onClick={() => openPage("dashboard")} className="hover:opacity-80">{APP_SHORT}</button>
              </h1>
              <p className="text-[11px] md:text-[12px] text-[var(--muted)] leading-tight mt-[2px] truncate">{APP_TAGLINE} · by {COMPANY}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden lg:inline px-2.5 py-1 rounded-full bg-[var(--green)] text-white text-[11px] font-bold tracking-wide">REAL TEST: 20 Q · 45 MIN</span>
            <span className="hidden lg:inline px-2.5 py-1 rounded-full bg-[var(--gold)] text-[var(--green)] text-[11px] font-bold">VALUES MUST PASS</span>
            <a href={OFFICIAL_SOURCE_URL} target="_blank" rel="noopener" className="hidden lg:inline px-2.5 py-1 rounded-full bg-white border border-[var(--line)] text-[11px] hover:border-[var(--green)]">Official Source ↗</a>
            {view !== "quiz" && (
              <button onClick={() => openPage("about")} className="h-[36px] px-4 rounded-full bg-white border border-[var(--line)] text-[13px] font-bold hover:border-[var(--green)]/40">About</button>
            )}
          </div>
        </div>
        {view === "quiz" && (
          <div className="h-[6px] w-full bg-[#EDE3CC]">
            <div className="h-full bg-[var(--green)] transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
        )}
      </header>

      <main className="mx-auto max-w-[1120px] px-4 md:px-6 py-5 md:py-8">
        {view === "dashboard" && (
          <>
            {/* Hero Banner */}
            <div className="rounded-[24px] bg-[var(--green)] text-[#F6F1E7] p-5 md:p-8 relative overflow-hidden shadow-[0_20px_50px_rgba(14,77,69,0.25)]">
              <div className="absolute right-[-20px] top-[-30px] w-[200px] h-[200px] rounded-full bg-[#FFCC33]/15 pointer-events-none" />
              <div className="absolute right-[60px] bottom-[-40px] w-[120px] h-[120px] rounded-full bg-white/5 pointer-events-none" />
              <div className="relative grid md:grid-cols-[1.2fr_0.8fr] gap-6 items-start">
                <div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-3 py-1 rounded-full bg-white/10 text-[12px] border border-white/15 backdrop-blur">Question Bank · {stats.total} Questions</span>
                    <span className="px-3 py-1 rounded-full bg-[var(--gold)] text-[var(--green)] text-[12px] font-bold">{stats.keys} Key Questions</span>
                    <span className="px-3 py-1 rounded-full bg-white text-[var(--green)] text-[12px] font-bold">{stats.values} Values Questions</span>
                  </div>
                  <h2 className="serif text-[28px] md:text-[42px] leading-[0.95] font-bold">Practice without limits.<br />Until you know every answer.</h2>
                  <p className="mt-4 text-[15px] md:text-[16px] text-[#D7E8E2] max-w-[560px] leading-[1.6]">Simple, free and private – no sign-up, no ads, no cookies. Large buttons, fixed answer layout, same timer for every question. Based on the testable sections of <em>Our Common Bond</em> from the Department of Home Affairs.</p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    <div className="px-4 py-2 rounded-full bg-[var(--paper)] text-[var(--green)] text-[13px] font-bold shadow flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[var(--green)] text-white grid place-items-center text-[11px]">i</span> Pass Rule: 75% + 5 Values questions all correct
                    </div>
                    <div className="px-4 py-2 rounded-full bg-[#0B3E38] border border-white/10 text-[13px] text-[#CDE3DD]">Choose 135s for real exam speed</div>
                  </div>
                  <div className="mt-4 text-[12px] text-[#A7C4BC]">Free · No sign-up · No ads · No cookies · Made by mStudio</div>
                </div>
                <div className="bg-[#0B3E38] rounded-[20px] p-4 border border-white/10">
                  <div className="text-[12px] font-bold tracking-widest text-[#8FBEB1] uppercase">What is inside?</div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {[
                      { label: "Total Questions", value: stats.total },
                      { label: "Values Must-Pass", value: stats.values },
                      { label: "Key / Tricky", value: stats.keys },
                      { label: "Practice Mode", value: "Infinite" },
                    ].map((it) => (
                      <div key={it.label} className="rounded-[14px] bg-white/[0.06] border border-white/10 p-3">
                        <div className="text-[20px] font-bold leading-none">{it.value}</div>
                        <div className="text-[10px] text-[#A7C4BC] mt-1 uppercase tracking-wide">{it.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 rounded-[12px] bg-[#FFCC33] text-[#0E4D45] p-3 text-[12px] leading-[1.4] font-medium">
                    <strong>Real test format:</strong> 20 questions, 45 min total (~135s per Q). 5 Australian values questions appear every time and you must answer all 5 correctly.
                  </div>
                </div>
              </div>
            </div>

            {/* Part cards */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((part) => {
                const meta = PART_META[part];
                const count = part === 1 ? stats.p1 : part === 2 ? stats.p2 : part === 3 ? stats.p3 : stats.p4;
                const isActive = selectedPart === part && mode === "part";
                return (
                  <button
                    key={part}
                    onClick={() => {
                      setSelectedPart(part);
                      setMode("part");
                    }}
                    className={`text-left rounded-[20px] p-4 md:p-5 bg-[var(--paper)] border shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all hover:shadow-[0_12px_32px_rgba(0,0,0,0.10)] hover:-translate-y-[1px] ${isActive ? "border-[var(--green)] ring-2 ring-[var(--green)]/20" : "border-[var(--line)]"}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="w-8 h-8 rounded-full grid place-items-center text-[13px] font-bold text-white" style={{ background: meta.color }}>
                        {part}
                      </div>
                      <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#F1E9D5] border border-[var(--line)] font-bold">{count} Qs</span>
                    </div>
                    <div className="mt-3">
                      <div className="text-[13px] font-bold leading-tight">Part {part}: {meta.title}</div>
                      <div className="text-[11px] text-[var(--muted)] leading-[1.3] mt-1">{meta.desc}</div>
                    </div>
                    <div className="mt-3 text-[11px] font-bold flex items-center gap-1" style={{ color: meta.color }}>
                      {isActive ? "● Selected – Practicing this Part" : "Filter this Part →"}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Settings Grid */}
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-4 items-start">
              <div className="rounded-[24px] bg-[var(--paper)] border border-[var(--line)] p-5 md:p-6 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-[16px]">Practice Settings</h3>
                  <span className="text-[11px] px-2 py-1 rounded-full bg-[#F6F1E7] border border-[var(--line)]">Large tap targets · Accessible</span>
                </div>
                <p className="text-[13px] text-[var(--muted)] mt-1">Pick a mode, hit start, get {batchSize} questions instantly. Answers are always vertical with fixed size.</p>

                <div className="mt-5">
                  <div className="text-[12px] font-bold tracking-wide text-[var(--muted)] uppercase">Mode Selection</div>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { k: "exam", title: "Full Mock – 20 Questions with 5 Values Mandatory", sub: "Closest to real test, 5 Values must be all correct" },
                      { k: "random", title: "Random 20 – Infinite Pool", sub: "Non-repeating until deck exhausted, then auto reshuffle" },
                      { k: "part", title: `Part ${selectedPart ?? 1} Focus`, sub: `Only practice Part ${selectedPart ?? 1} questions` },
                      { k: "values", title: "Australian Values Only", sub: `${stats.values} Values questions – the must-pass hurdle` },
                      { k: "key", title: "Key Questions", sub: `${stats.keys} key + commonly missed questions` },
                    ].map((m) => (
                      <button
                        key={m.k}
                        onClick={() => setMode(m.k as Mode)}
                        className={`text-left rounded-[16px] border px-4 py-3 transition-all ${mode === m.k ? "bg-[var(--green)] text-white border-[var(--green)] shadow-[0_6px_20px_rgba(14,77,69,0.25)]" : "bg-[#FFFEFB] border-[var(--line)] hover:border-[var(--green)]/40"}`}
                      >
                        <div className={`text-[13px] font-bold leading-tight ${mode === m.k ? "text-white" : "text-[var(--ink)]"}`}>{m.title}</div>
                        <div className={`text-[11px] mt-1 leading-[1.3] ${mode === m.k ? "text-[#CDE3DD]" : "text-[var(--muted)]"}`}>{m.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wide">Batch Size</div>
                    <div className="mt-2 flex gap-2">
                      {[10, 20, 30].map((n) => (
                        <button
                          key={n}
                          onClick={() => setBatchSize(n as any)}
                          className={`flex-1 h-[44px] rounded-full border font-bold text-[14px] transition-colors ${batchSize === n ? "bg-[var(--green)] text-white border-[var(--green)]" : "bg-white border-[var(--line)] hover:border-[var(--green)]/30"}`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <div className="text-[10px] text-[var(--muted)] mt-1">20 recommended for real exam</div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wide">Time per Question (Same for all)</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {[
                        { v: 30, l: "30s" },
                        { v: 45, l: "45s" },
                        { v: 60, l: "60s" },
                        { v: 90, l: "90s" },
                        { v: 135, l: "135s Real Exam" },
                        { v: null, l: "Unlimited" },
                      ].map((t) => (
                        <button
                          key={String(t.v)}
                          onClick={() => setTimePerQ(t.v as any)}
                          className={`h-[40px] px-3.5 rounded-full border text-[12px] font-bold transition-colors ${timePerQ === t.v ? "bg-[var(--gold)] border-[var(--gold)] text-[var(--green)]" : "bg-white border-[var(--line)] hover:border-[var(--green)]/30"}`}
                        >
                          {t.l}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between rounded-[14px] bg-[#F8F1DC] border border-[#EADFAE] px-4 py-3 gap-3">
                  <div>
                    <div className="text-[13px] font-bold">Shuffle Answer Positions</div>
                    <div className="text-[11px] text-[var(--muted)] leading-[1.3]">On for exam realism – button size and vertical layout never change</div>
                  </div>
                  <button
                    onClick={() => setShuffleAnswers((s) => !s)}
                    className={`w-[54px] h-[32px] rounded-full p-1 transition-colors shrink-0 ${shuffleAnswers ? "bg-[var(--green)]" : "bg-[#D6CBB0]"}`}
                    aria-label="Toggle shuffle"
                  >
                    <div className={`w-[24px] h-[24px] rounded-full bg-white shadow transition-transform ${shuffleAnswers ? "translate-x-[22px]" : "translate-x-0"}`} />
                  </button>
                </div>

                <button
                  onClick={startQuiz}
                  className="mt-6 w-full h-[60px] rounded-full bg-[var(--green)] text-white font-bold text-[18px] shadow-[0_12px_24px_rgba(14,77,69,0.3)] hover:bg-[#103F38] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                >
                  ▶ Start {batchSize} Questions
                  <span className="text-[11px] font-normal bg-[var(--gold)] text-[var(--green)] px-2.5 py-1 rounded-full ml-1 uppercase tracking-wide">Large Buttons</span>
                </button>
                <div className="mt-3 text-center text-[11px] text-[var(--muted)]">Used {QUESTIONS.length - deckIds.length}/{QUESTIONS.length} · No repeat until reshuffle · {new Date().toLocaleDateString("en-AU")}</div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[24px] bg-[#FFFBF2] border border-[var(--line)] p-5 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-[14px]">Syllabus Overview</h4>
                    <span className="text-[11px] px-2 py-1 rounded-full bg-[var(--green)] text-white font-bold">OUR COMMON BOND</span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {[
                      { part: 1, label: "Part 1 Australia and its people", cnt: stats.p1 },
                      { part: 2, label: "Part 2 Democratic beliefs, rights & liberties", cnt: stats.p2 },
                      { part: 3, label: "Part 3 Government and the law", cnt: stats.p3 },
                      { part: 4, label: "Part 4 Australian values", cnt: stats.p4 },
                    ].map((r) => (
                      <div key={r.part} className="flex gap-3 items-center">
                        <div className="w-[36px] h-[36px] rounded-full bg-[#F1E9D5] grid place-items-center text-[12px] font-bold border border-[var(--line)] shrink-0">{r.part}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-bold truncate">{r.label}</div>
                          <div className="h-[6px] rounded-full bg-[#EEE6D1] mt-1 overflow-hidden"><div className="h-full bg-[var(--green)]" style={{ width: `${(r.cnt / stats.total) * 100}%` }} /></div>
                        </div>
                        <div className="text-[12px] font-bold shrink-0">{r.cnt} Qs</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-[14px] bg-[#F6F1E7] border border-[var(--line)] py-2.5"><div className="text-[18px] font-bold">{stats.total}</div><div className="text-[10px] text-[var(--muted)] uppercase tracking-wide">Total Bank</div></div>
                    <div className="rounded-[14px] bg-[#FFF6D1] border border-[#F2E4A8] py-2.5"><div className="text-[18px] font-bold">{stats.values}</div><div className="text-[10px] text-[var(--muted)] uppercase tracking-wide">Values Must-Pass</div></div>
                    <div className="rounded-[14px] bg-[#EAF5F1] border border-[#C6E2D8] py-2.5"><div className="text-[18px] font-bold">{stats.keys}</div><div className="text-[10px] text-[var(--muted)] uppercase tracking-wide">Key Marked</div></div>
                  </div>
                  <div className="mt-4 text-[11px] leading-[1.5] text-[var(--muted)] bg-[#F6F1E7] border border-[var(--line)] rounded-[12px] p-3">
                    Based on the testable sections PDF from Home Affairs. This is an unofficial practice tool, not affiliated with the Australian Government. Questions are for study aid.
                  </div>
                </div>

                <div className="rounded-[24px] bg-[var(--paper)] border border-[var(--line)] p-5">
                  <h4 className="font-bold text-[14px]">Recent Sessions (This Tab Only)</h4>
                  {history.length === 0 ? (
                    <div className="mt-3 text-[13px] text-[var(--muted)] leading-[1.6]">No history yet. Click Start to begin – scoring will appear here. Cleared when you close the tab for privacy.</div>
                  ) : (
                    <div className="mt-3 space-y-2 max-h-[260px] overflow-auto pr-1">
                      {history.map((h, i) => (
                        <div key={i} className="flex items-center justify-between rounded-[12px] border border-[var(--line)] px-3 py-2.5 bg-[#FFFEFB]">
                          <div>
                            <div className="text-[12px] font-bold">{modeLabels[h.mode]} · {h.score}/{h.total}</div>
                            <div className="text-[10px] text-[var(--muted)]">{h.date}</div>
                          </div>
                          <div className={`text-[11px] px-2.5 py-1 rounded-full font-bold ${h.passed ? "bg-[#DDF0E7] text-[#1B7A5A]" : "bg-[#FBE2DD] text-[#C4503A]"}`}>{h.passed ? "PASSED" : "RETRY"}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-[20px] bg-[#0E4D45] text-[#D7E8E2] p-4 border border-white/10">
                  <div className="text-[12px] font-bold uppercase tracking-widest text-[#8FBEB1]">About {APP_SHORT}</div>
                  <div className="mt-2 text-[13px] leading-[1.5]">Made by mStudio. Free to use, no sign-up, no ads, no cookies. All questions are built into the app – nothing is sent anywhere.</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={() => openPage("about")} className="text-[12px] px-3 py-1.5 rounded-full bg-[#FFCC33] text-[#0E4D45] font-bold">About mStudio</button>
                    <button onClick={() => openPage("privacy")} className="text-[12px] px-3 py-1.5 rounded-full bg-white/10 border border-white/15 font-bold">Privacy Policy</button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {view === "quiz" && currentQ && (
          <div className="max-w-[800px] mx-auto">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-[var(--paper)] border border-[var(--line)] rounded-full px-3 py-2 shadow-sm">
                  <span className="text-[11px] font-bold tracking-wide uppercase">Progress</span>
                  <span className="text-[14px] font-bold">{currentIdx + 1} / {currentQs.length}</span>
                  <div className="w-[84px] h-[6px] rounded-full bg-[#EEE6D1] overflow-hidden"><div className="h-full bg-[var(--green)] transition-all" style={{ width: `${progressPct}%` }} /></div>
                </div>
                <div className="hidden md:flex gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-[#F1E9D5] border border-[var(--line)] text-[11px] font-bold">Part {currentQ.raw.part}</span>
                  <span className="px-2.5 py-1 rounded-full bg-[#FFF6D1] border border-[#F2E4A8] text-[11px]">{currentQ.raw.topic}</span>
                  {currentQ.raw.is_values && <span className="px-2.5 py-1 rounded-full bg-[var(--green)] text-white text-[11px] font-bold">VALUES MUST-PASS</span>}
                  {currentQ.raw.is_key && <span className="px-2.5 py-1 rounded-full bg-[var(--gold)] text-[var(--green)] text-[11px] font-bold">KEY QUESTION</span>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative w-[56px] h-[56px] grid place-items-center">
                  <svg width="56" height="56" className="-rotate-90">
                    <circle cx="28" cy="28" r="22" stroke="#EEE6D1" strokeWidth="6" fill="none" />
                    <circle
                      cx="28" cy="28" r="22"
                      stroke={timeLeft !== null && timeLeft < 10 ? "#C4503A" : "#0E4D45"}
                      strokeWidth="6"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 22}`}
                      strokeDashoffset={`${2 * Math.PI * 22 * (1 - (timeLeft ?? 0) / (timePerQ ?? 60))}`}
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute text-center">
                    <div className="text-[16px] font-bold leading-none">{timePerQ === null ? "∞" : timeLeft}</div>
                    <div className="text-[9px] text-[var(--muted)] -mt-[1px] uppercase">sec</div>
                  </div>
                </div>
                <button onClick={() => { setView("dashboard"); }} className="h-[36px] px-4 rounded-full bg-white border border-[var(--line)] text-[12px] font-bold hover:border-[var(--green)]/40">Exit</button>
              </div>
            </div>

            <div className="flex md:hidden gap-2 mb-3 flex-wrap">
              <span className="px-2.5 py-1 rounded-full bg-[#F1E9D5] border border-[var(--line)] text-[11px] font-bold">Part {currentQ.raw.part}</span>
              <span className="px-2.5 py-1 rounded-full bg-[#FFF6D1] border border-[#F2E4A8] text-[11px]">{currentQ.raw.topic}</span>
              {currentQ.raw.is_values && <span className="px-2.5 py-1 rounded-full bg-[var(--green)] text-white text-[11px] font-bold">VALUES</span>}
              {currentQ.raw.is_key && <span className="px-2.5 py-1 rounded-full bg-[var(--gold)] text-[var(--green)] text-[11px] font-bold">KEY</span>}
            </div>

            <div className="rounded-[24px] bg-[var(--paper)] border border-[var(--line)] shadow-[0_12px_32px_rgba(0,0,0,0.08)] overflow-hidden">
              <div className="p-6 md:p-8">
                <div className="flex items-start gap-3">
                  <div className="min-w-[32px] h-[32px] rounded-full bg-[var(--green)] text-white grid place-items-center text-[14px] font-bold">{currentIdx + 1}</div>
                  <div className="flex-1">
                    <h2 className="text-[21px] md:text-[24px] font-bold leading-[1.25] tracking-tight">{currentQ.raw.q_en}</h2>
                  </div>
                </div>

                <div className="mt-6 grid gap-3">
                  {currentQ.shuffledOptions.map((opt, idx) => {
                    const ans = answers[currentIdx];
                    const isSelected = ans?.selectedShuffled === idx;
                    const isCorrectOpt = idx === currentQ.correctShuffled;
                    const shouldHighlight = mode !== "exam" && showFeedback;
                    let stateClass = "bg-white border-[var(--line)] hover:border-[var(--green)]/40 hover:bg-[#FFFEFB]";
                    if (shouldHighlight) {
                      if (isCorrectOpt) stateClass = "bg-[#E6F4EF] border-[#1B7A5A] text-[#0E4D45]";
                      else if (isSelected && !isCorrectOpt) stateClass = "bg-[#FBE9E5] border-[#C4503A] text-[#6B2A20]";
                      else stateClass = "bg-white border-[var(--line)] opacity-70";
                    } else if (isSelected && mode === "exam") {
                      stateClass = "bg-[#F6F1E7] border-[var(--green)]";
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => !showFeedback && !answers[currentIdx] && handleSelectOption(idx)}
                        disabled={!!(mode !== "exam" && showFeedback)}
                        className={`group w-full text-left min-h-[64px] rounded-[16px] border-[1.5px] px-4 md:px-5 py-4 flex items-center gap-4 transition-all active:scale-[0.99] ${stateClass}`}
                      >
                        <div className={`w-[36px] h-[36px] shrink-0 rounded-full grid place-items-center text-[14px] font-bold border ${isSelected ? "bg-[var(--green)] text-white border-[var(--green)]" : "bg-[#F6F1E7] border-[var(--line)] text-[var(--muted)]"} ${shouldHighlight && isCorrectOpt ? "!bg-[#1B7A5A] !text-white !border-[#1B7A5A]" : ""}`}>
                          {String.fromCharCode(65 + idx)}
                        </div>
                        <div className="flex-1">
                          <div className="text-[17px] md:text-[18px] font-bold leading-[1.3]">{opt.text}</div>
                        </div>
                        {shouldHighlight && isCorrectOpt && <span className="text-[12px] font-bold text-[#1B7A5A]">✓ Correct</span>}
                        {shouldHighlight && isSelected && !isCorrectOpt && <span className="text-[12px] font-bold text-[#C4503A]">✗ Your choice</span>}
                      </button>
                    );
                  })}
                </div>

                {showFeedback && mode !== "exam" && (
                  <div className="mt-6 rounded-[16px] border p-4 bg-[#FFFEFB] border-[var(--line)]">
                    <div className={`text-[14px] font-bold ${answers[currentIdx]?.isCorrect ? "text-[#1B7A5A]" : "text-[#C4503A]"}`}>
                      {answers[currentIdx]?.timedOut ? "⏰ Time's up – counted as incorrect. Keep going!" : answers[currentIdx]?.isCorrect ? "🎉 Correct! Well done!" : "💪 Not quite – review this one, you'll get it next time!"}
                    </div>
                    {currentQ.raw.explanation_en && (
                      <div className="mt-2 text-[13px] leading-[1.6] text-[var(--ink)]">
                        <span className="font-bold">Explanation:</span> {currentQ.raw.explanation_en}
                      </div>
                    )}
                    <button onClick={() => goNext()} className="mt-4 w-full h-[52px] rounded-full bg-[var(--green)] text-white font-bold text-[16px] hover:bg-[#103F38]">Next Question →</button>
                  </div>
                )}

                {mode === "exam" && answers[currentIdx] && (
                  <div className="mt-4 text-center text-[12px] text-[var(--muted)]">Answered – auto-advancing to next question… (Explanations shown after full mock)</div>
                )}
              </div>
              <div className="px-6 md:px-8 pb-5 flex justify-between items-center text-[11px] text-[var(--muted)]">
                <span>Fixed vertical layout · Large buttons · {shuffleAnswers ? "Shuffled" : "Not shuffled"}</span>
                <span>Bank ID #{currentQ.raw.id}</span>
              </div>
            </div>
          </div>
        )}

        {view === "result" && (
          <div className="max-w-[860px] mx-auto">
            <div className="rounded-[28px] bg-[var(--paper)] border border-[var(--line)] shadow-[0_16px_40px_rgba(0,0,0,0.08)] p-6 md:p-8">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="w-[120px] h-[120px] rounded-full grid place-items-center border-[8px] shrink-0" style={{ borderColor: (correctCount / currentQs.length) >= 0.75 && valuesWrong === 0 ? "#1B7A5A" : "#C4503A", background: "#FFFBF2" }}>
                  <div className="text-center">
                    <div className="text-[32px] font-bold leading-none">{correctCount}/{currentQs.length}</div>
                    <div className="text-[11px] text-[var(--muted)] mt-1 font-bold">{Math.round((correctCount / currentQs.length) * 100)}%</div>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="serif text-[26px] md:text-[30px] font-bold leading-[1.1]">
                    {mode === "exam"
                      ? correctCount / currentQs.length >= 0.75 && valuesWrong === 0
                        ? "🎉 Mock Passed! You're ready!"
                        : "💪 Keep practicing – you'll pass next time!"
                      : correctCount / currentQs.length >= 0.75
                        ? "👏 Great score! Strong work!"
                        : "📚 Review the mistakes below – then try again!"}
                  </h2>
                  <p className="mt-3 text-[14px] leading-[1.6] text-[var(--muted)]">
                    {mode === "exam"
                      ? `Real test requires 75% + all 5 Values correct. You got ${correctCount} correct, Values wrong: ${valuesWrong}. ${valuesWrong === 0 ? "All Values correct – excellent!" : "Values questions are must-pass – focus on Part 4."}`
                      : `You completed ${currentQs.length} questions, ${correctCount} correct. Mistakes are collected below for review.`}
                  </p>
                  <div className="mt-4 grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map((p) => {
                      const qsInPart = currentQs.filter((q) => q.raw.part === p);
                      if (qsInPart.length === 0) return null;
                      const correctInPart = qsInPart.filter((q) => answers.find((a) => a.qId === q.raw.id)?.isCorrect).length;
                      return (
                        <div key={p} className="rounded-[12px] bg-[#F6F1E7] border border-[var(--line)] p-2 text-center">
                          <div className="text-[10px] text-[var(--muted)] uppercase tracking-wide font-bold">Part {p}</div>
                          <div className="text-[14px] font-bold">{correctInPart}/{qsInPart.length}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-8 grid md:grid-cols-2 gap-3">
                <button onClick={startQuiz} className="h-[56px] rounded-full bg-[var(--green)] text-white font-bold text-[16px] shadow hover:bg-[#103F38] transition-colors">Next {batchSize} Questions → Infinite Practice</button>
                <button onClick={() => setView("dashboard")} className="h-[56px] rounded-full bg-white border border-[var(--line)] font-bold text-[16px] hover:border-[var(--green)]/30">Back to Settings</button>
              </div>

              {wrongList.length > 0 && (
                <div className="mt-8">
                  <h3 className="font-bold text-[16px]">Review Mistakes ({wrongList.length}) – Take your time</h3>
                  <div className="mt-3 grid gap-3">
                    {wrongList.map(({ ans, q }, i) => (
                      <div key={i} className="rounded-[16px] border border-[#F0D6D0] bg-[#FFF8F6] p-4">
                        <div className="flex gap-2 text-[11px] mb-2 flex-wrap">
                          <span className="px-2 py-1 rounded-full bg-[#F1E9D5] border font-bold">Part {q.raw.part}</span>
                          {q.raw.is_values && <span className="px-2 py-1 rounded-full bg-[#0E4D45] text-white font-bold">VALUES</span>}
                          {q.raw.is_key && <span className="px-2 py-1 rounded-full bg-[#FFCC33] text-[#0E4D45] font-bold">KEY</span>}
                          <span className="px-2 py-1 rounded-full bg-white border">{q.raw.topic}</span>
                        </div>
                        <div className="font-bold text-[15px] leading-[1.4]">{q.raw.q_en}</div>
                        <div className="mt-3 grid gap-2">
                          {q.shuffledOptions.map((opt, oi) => {
                            const isCorrect = oi === q.correctShuffled;
                            const isYour = ans?.selectedShuffled === oi;
                            return (
                              <div key={oi} className={`rounded-[10px] border px-3 py-2.5 text-[13px] flex justify-between gap-3 ${isCorrect ? "bg-[#E6F4EF] border-[#1B7A5A] font-bold" : isYour ? "bg-[#FBE9E5] border-[#C4503A]" : "bg-white border-[var(--line)]"}`}>
                                <span>{String.fromCharCode(65 + oi)}. {opt.text}</span>
                                <span className="text-[11px] font-bold shrink-0">{isCorrect ? "Correct answer" : isYour ? "Your choice" : ""}</span>
                              </div>
                            );
                          })}
                        </div>
                        {q.raw.explanation_en && <div className="mt-3 text-[12px] text-[var(--muted)] leading-[1.5]"><span className="font-bold text-[var(--ink)]">Explanation:</span> {q.raw.explanation_en}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {wrongList.length === 0 && (
                <div className="mt-8 rounded-[16px] bg-[#EAF5F1] border border-[#C6E2D8] p-6 text-center">
                  <div className="text-[20px] font-bold">Perfect Score! 🎉</div>
                  <div className="text-[13px] text-[var(--muted)] mt-1 leading-[1.5]">All {currentQs.length} correct! Try 135s real exam speed or switch to a different Part to stay sharp.</div>
                </div>
              )}
            </div>
          </div>
        )}

        {view === "about" && (
          <div className="max-w-[760px] mx-auto">
            <button onClick={() => openPage("dashboard")} className="h-[40px] px-4 rounded-full bg-white border border-[var(--line)] text-[13px] font-bold hover:border-[var(--green)]/40">← Back</button>

            <div className="mt-5 text-center">
              <div className="mx-auto w-[96px] h-[96px] rounded-[24px] bg-[var(--green)] text-[var(--gold)] grid place-items-center font-bold text-[40px] serif shadow-[0_12px_30px_rgba(14,77,69,0.25)]">AU</div>
              <h2 className="mt-4 text-[30px] font-bold leading-tight">{APP_SHORT}</h2>
              <div className="text-[18px] font-bold text-[var(--green)]">{APP_TAGLINE}</div>
              <div className="mt-1 text-[15px] text-[var(--muted)]">by {COMPANY}</div>
              <div className="mt-2 text-[13px] text-[var(--muted)]">Version {APP_VERSION} · {COMPANY}, {LOCATION}</div>
            </div>

            <section className="mt-6 rounded-[20px] bg-[var(--paper)] border border-[var(--line)] p-5">
              <h3 className="font-bold text-[17px]">Introduction</h3>
              <p className="mt-2 text-[15px] leading-[1.6]">{APP_NAME} helps you get ready for the Australian Citizenship Test. Practise as many times as you like with questions based on the testable sections of <em>Our Common Bond</em>. Large buttons and clear text make it easy to use for everyone.</p>
            </section>

            <section className="mt-4 rounded-[20px] bg-[var(--paper)] border border-[var(--line)] p-5">
              <h3 className="font-bold text-[17px]">Features</h3>
              <ul className="mt-2 text-[15px] leading-[1.7] list-disc pl-5">
                <li>{stats.total} practice questions across Parts 1–4</li>
                <li>Full Mock test – 20 questions, 5 Values questions, 75% + all Values correct to pass</li>
                <li>Practice by Part, Values only, Key questions or Random</li>
                <li>Timer per question, or untimed</li>
                <li>Fixed answer layout, with optional shuffle</li>
                <li>Review your mistakes with explanations</li>
                <li>No sign-up, no ads, no cookies</li>
              </ul>
            </section>

            <section className="mt-4 rounded-[20px] bg-[var(--paper)] border border-[var(--line)] p-5">
              <h3 className="font-bold text-[17px]">Terms &amp; Conditions</h3>
              <ul className="mt-2 text-[15px] leading-[1.7] list-disc pl-5">
                <li>{APP_NAME} is an unofficial practice tool. It is not made by, linked to or approved by the Australian Government or the Department of Home Affairs.</li>
                <li>The practice questions are based on <em>Our Common Bond</em>, published by the Department of Home Affairs (© Commonwealth of Australia). They are not the real test questions.</li>
                <li>We try to keep the content correct, but we can't promise it is complete or up to date. Please always check the <a href={OFFICIAL_SOURCE_URL} target="_blank" rel="noopener" className="text-[var(--green)] font-bold underline underline-offset-2">official source ↗</a>.</li>
                <li>Using this app does not guarantee you will pass the test.</li>
                <li>The app is provided "as is", free of charge, without any warranty.</li>
              </ul>
            </section>

            <button onClick={() => openPage("privacy")} className="mt-4 w-full flex items-center justify-between rounded-[20px] bg-[var(--paper)] border border-[var(--line)] p-5 text-left hover:border-[var(--green)]/40">
              <span className="font-bold text-[17px]">Privacy Policy</span>
              <span className="text-[20px] text-[var(--muted)]">›</span>
            </button>

            <section className="mt-4 rounded-[20px] bg-[var(--green)] text-[#F6F1E7] p-5">
              <h3 className="font-bold text-[17px]">Contact</h3>
              <dl className="mt-3 grid grid-cols-[100px_1fr] gap-y-2 text-[15px]">
                <dt className="text-[#8FBEB1]">Email</dt>
                <dd><a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-2 break-all">{CONTACT_EMAIL}</a></dd>
                <dt className="text-[#8FBEB1]">Company</dt>
                <dd>{COMPANY}</dd>
                <dt className="text-[#8FBEB1]">Location</dt>
                <dd>{LOCATION}</dd>
              </dl>
            </section>

            <div className="mt-5 text-center text-[12px] text-[var(--muted)]">© {COPYRIGHT_YEAR} {COMPANY}. All rights reserved.</div>
          </div>
        )}

        {view === "privacy" && (
          <div className="max-w-[760px] mx-auto">
            <button onClick={() => openPage("about")} className="h-[40px] px-4 rounded-full bg-white border border-[var(--line)] text-[13px] font-bold hover:border-[var(--green)]/40">← Back</button>

            <h2 className="mt-5 text-[30px] font-bold leading-tight">Privacy Policy</h2>
            <div className="text-[13px] text-[var(--muted)] mt-1">{APP_NAME} by {COMPANY} · Last updated {PRIVACY_UPDATED}</div>

            <div className="mt-5 rounded-[20px] bg-[var(--paper)] border border-[var(--line)] p-5 space-y-5 text-[15px] leading-[1.6]">
              <section>
                <h3 className="font-bold text-[17px]">The short version</h3>
                <p className="mt-1">{APP_SHORT} does not collect, store or share any personal information. There is no account, no sign-up, no ads and no cookies. We count visits anonymously.</p>
              </section>
              <section>
                <h3 className="font-bold text-[17px]">What we collect</h3>
                <p className="mt-1">No personal information. All questions are built into the app. Your answers and scores are never sent to us or to anyone else. We only see anonymous visit counts (see below).</p>
              </section>
              <section>
                <h3 className="font-bold text-[17px]">Your practice history</h3>
                <p className="mt-1">Recent scores are kept only in your browser while the page is open. They are cleared when you close the tab. Nothing is saved on a server.</p>
              </section>
              <section>
                <h3 className="font-bold text-[17px]">Cookies, analytics and ads</h3>
                <p className="mt-1">{APP_SHORT} does not use cookies or advertising. We use <a href="https://www.cloudflare.com/web-analytics/" target="_blank" rel="noopener" className="text-[var(--green)] font-bold underline underline-offset-2">Cloudflare Web Analytics ↗</a> to count visits anonymously. It does not use cookies and does not collect personal information. We only see totals, such as page views, country, browser and whether you use a phone or a computer. See the <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener" className="text-[var(--green)] font-bold underline underline-offset-2">Cloudflare Privacy Policy ↗</a>.</p>
              </section>
              <section>
                <h3 className="font-bold text-[17px]">Hosting</h3>
                <p className="mt-1">The website is hosted on GitHub Pages. Like most web hosts, GitHub may log basic technical data (such as your IP address) for security. See the <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener" className="text-[var(--green)] font-bold underline underline-offset-2">GitHub Privacy Statement ↗</a>.</p>
              </section>
              <section>
                <h3 className="font-bold text-[17px]">Links to other sites</h3>
                <p className="mt-1">The app links to the Department of Home Affairs website. Their own privacy policy applies when you visit it.</p>
              </section>
              <section>
                <h3 className="font-bold text-[17px]">Changes</h3>
                <p className="mt-1">If this policy changes, we will update this page and the date above.</p>
              </section>
              <section>
                <h3 className="font-bold text-[17px]">Contact</h3>
                <p className="mt-1">Questions? Email <a href={`mailto:${CONTACT_EMAIL}`} className="text-[var(--green)] font-bold underline underline-offset-2 break-all">{CONTACT_EMAIL}</a>.</p>
              </section>
            </div>
          </div>
        )}
      </main>

      <footer className="mt-8 border-t border-[var(--line)] py-6 text-center">
        <div className="mx-auto max-w-[1120px] px-4">
          <div className="text-[12px] font-bold">{APP_NAME} · Made by {COMPANY}</div>
          <div className="mt-2 flex justify-center gap-4 text-[12px] font-bold">
            <button onClick={() => openPage("about")} className="text-[var(--green)] underline underline-offset-2">About</button>
            <button onClick={() => openPage("privacy")} className="text-[var(--green)] underline underline-offset-2">Privacy Policy</button>
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-[var(--green)] underline underline-offset-2">Contact</a>
          </div>
          <div className="text-[11px] text-[var(--muted)] mt-2 leading-[1.5] max-w-[720px] mx-auto">
            Unofficial practice tool – not affiliated with the Australian Government. Based on <em>Our Common Bond</em> from the Department of Home Affairs.
          </div>
          <div className="text-[11px] text-[var(--muted)] mt-1">© {COPYRIGHT_YEAR} {COMPANY}. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
