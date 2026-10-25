import { ReadingModes } from '../components/reading/ReadingModes';
import { notifyLearningProgress } from '../lib/learning-progress';
import { ActivitySuggestions } from '../components/ActivitySuggestions';
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, getErrorMessage } from "../lib/api";
import { useAsyncResource } from "../hooks/useAsyncResource";
import { useAuth } from "../auth/useAuth";
import { PageHeader } from "../components/ui/PageHeader";
import "../styles/prep-learning.css";
import { AiMarkdown } from "../components/rag/AiMarkdown";
import { ReadingAdmin } from "../components/reading/ReadingAdmin";
import { ReadingClausePractice } from "../components/reading/ReadingClausePractice";
import { ReadingSourceDocument } from "../components/reading/ReadingSourceDocument";
import type {
  ReadingArticle,
  ReadingAttempt,
  ReadingCatalog,
  ReadingEvidence,
} from "../types/reading";

const levels: Record<string, string> = {
  EASY: "Dễ",
  MEDIUM: "Vừa",
  HARD: "Khó",
};
const learningLevels = {
  UNDERSTAND: "Hiểu nội dung",
  REMEMBER: "Nhớ thông tin",
  ANALYZE: "Phân tích",
};
const kinds: Record<string, string> = {
  EMAIL: "Email",
  NOTICE: "Thông báo",
  ADVERTISEMENT: "Quảng cáo",
  MESSAGE: "Tin nhắn",
  ARTICLE: "Bài viết",
};
const types: Record<string, string> = {
  MAIN: "Ý chính",
  DETAIL: "Chi tiết",
  INFERENCE: "Suy luận",
  PURPOSE: "Mục đích",
  PARAPHRASE: "Cùng ý, khác cách diễn đạt",
};
function elapsed(attempt: ReadingAttempt, began: number) {
  return Math.min(
    86400,
    attempt.elapsedSeconds + Math.floor((performance.now() - began) / 1000),
  );
}

function ReadingWorkspace({
  initial,
  onLibrary,
  onChanged,
  onRestart,
}: {
  initial: ReadingAttempt;
  onLibrary(): void;
  onChanged(): void;
  onRestart(): void;
}) {
  const [attempt, setAttempt] = useState(initial);
  const [answers, setAnswers] = useState(initial.answers);
  const [index, setIndex] = useState(initial.currentIndex);
  const [selection, setSelection] = useState<ReadingEvidence | null>(null);
  const [size, setSize] = useState(18);
  const [meaning, setMeaning] = useState("");
  const [notes, setNotes] = useState("");
  const [tutorMessage, setTutorMessage] = useState("");
  const [tutor, setTutor] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState("Tiến độ được tự lưu");
  const [tick, setTick] = useState(0);
  const passage = useRef<HTMLDivElement>(null);
  const started = useRef(0);
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const exitSave = useRef<(() => Promise<unknown>) | null>(null);
  const live = useRef(true);
  const action = useRef(false);
  const version = attempt.version;
  const question = version.questions[index];
  const submitted = !!attempt.submittedAt;
  const learningLevel = question.learningLevel ?? (submitted ? question.learning?.level : undefined);
  useEffect(() => {
    started.current = performance.now();
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);
  useEffect(() => {
    if (submitted) return;
    const timer = window.setInterval(() => setTick((t) => t + 1), 10000);
    return () => clearInterval(timer);
  }, [submitted]);
  const snapshot = useCallback(
    () => ({
      answers,
      currentIndex: index,
      elapsedSeconds: elapsed(initial, started.current),
    }),
    [answers, index, initial],
  );
  const save = useCallback(() => {
    const data = snapshot();
    chain.current = chain.current
      .catch(() => undefined)
      .then(() =>
        api<ReadingAttempt>(`/reading/attempts/${attempt.id}`, {
          method: "PATCH",
          keepalive: true,
          data,
        }),
      );
    return chain.current;
  }, [attempt.id, snapshot]);
  useEffect(() => {
    exitSave.current = submitted ? null : save;
  }, [save, submitted]);
  useEffect(() => {
    const persist = () => {
      void exitSave.current?.().catch(() => undefined);
    };
    window.addEventListener("pagehide", persist);
    return () => {
      window.removeEventListener("pagehide", persist);
      persist();
    };
  }, []);
  useEffect(() => {
    if (submitted || busy) return;
    const timer = window.setTimeout(() => {
      setSaving("Đang lưu…");
      void save()
        .then(() => {
          if (live.current) setSaving("Đã lưu tiến độ");
        })
        .catch((cause) => {
          if (live.current) {
            setSaving("Chưa lưu được");
            setError(getErrorMessage(cause));
          }
        });
    }, 600);
    return () => clearTimeout(timer);
  }, [save, submitted, busy, tick]);
  const act = async (work: () => Promise<void>) => {
    if (action.current) return;
    action.current = true;
    setBusy(true);
    setError("");
    try {
      await work();
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      action.current = false;
      if (live.current) setBusy(false);
    }
  };
  const choose = () => {
    const selected = window.getSelection();
    const root = passage.current;
    if (!selected?.rangeCount || selected.isCollapsed || !root) return;
    const range = selected.getRangeAt(0);
    if (
      !root.contains(range.startContainer) ||
      !root.contains(range.endContainer)
    )
      return;
    const prefix = range.cloneRange();
    prefix.selectNodeContents(root);
    prefix.setEnd(range.startContainer, range.startOffset);
    const start = prefix.toString().length;
    const text = range.toString();
    if (
      !text.trim() ||
      text.length > 800 ||
      version.text.slice(start, start + text.length) !== text
    ) {
      setError("Chọn một đoạn tối đa 800 ký tự trong bài đọc.");
      return;
    }
    setSelection({ start, end: start + text.length, text });
    setMeaning("");
    setNotes("");
    setError("");
  };
  const attach = () => {
    if (!selection || !answers[index]) return;
    setAnswers({
      ...answers,
      [index]: { ...answers[index], evidence: [selection] },
    });
    setNotice("Đã gắn đoạn đang chọn làm bằng chứng cho câu này.");
  };
  const ask = (mode: string) =>
    act(async () => {
      const result = await api<{ content: string }>(
        `/reading/attempts/${attempt.id}/tutor`,
        {
          method: "POST",
          data: {
            mode,
            message: tutorMessage,
            questionIndex: index,
            ...(selection ? { selected: selection } : {}),
          },
        },
      );
      setTutor(result.content);
    });
  const ready = version.questions.every(
    (q, i) => answers[i] && (!q.evidenceRequired || answers[i].evidence.length),
  );
  const evidence = useMemo(
    () => (submitted ? question.evidence || [] : []),
    [submitted, question.evidence],
  );
  const highlighted = useMemo(() => {
    if (!evidence.length) return version.text;
    const sorted = [...evidence].sort((a, b) => a.start - b.start);
    const nodes = [];
    let at = 0;
    for (const span of sorted) {
      if (span.start < at) continue;
      nodes.push(version.text.slice(at, span.start));
      nodes.push(
        <mark key={span.start} className="bg-amber-100 text-ink-dark">
          {version.text.slice(span.start, span.end)}
        </mark>,
      );
      at = span.end;
    }
    nodes.push(version.text.slice(at));
    return nodes;
  }, [version.text, evidence]);
  return (
    <div className="page-stack prep-study-workspace">
      <div className="prep-study-toolbar flex flex-wrap items-center justify-between gap-3">
        <button
          className="underline text-sm"
          onClick={() =>
            void act(async () => {
              if (!submitted) await save();
              onChanged();
              onLibrary();
            })
          }
        >
          Thư viện Reading
        </button>
        <span className="text-sm text-ink-medium">
          Câu {index + 1}/{version.questions.length} · Lần {attempt.tryNumber}{" "}
          {attempt.tryNumber === 1 ? "· Kết quả lần đầu" : "· Làm lại"} · Phiên
          bản {version.revision}
        </span>
      </div>
      {error && (
        <p
          role="alert"
          className="prep-learning-error rounded bg-rose-50 p-3 text-sm text-rose-800"
        >
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm">
          {notice}
        </p>
      )}
      <div>
        <h1 className="text-2xl font-semibold">{version.title}</h1>
        <p className="mt-2 text-sm text-ink-medium">
          {version.topic} · {kinds[version.kind]} · {levels[version.difficulty]}{" "}
          (ước lượng) ·{" "}
          {version.origin === "AI"
            ? "Bài AI cá nhân · chưa duyệt chuyên môn, chỉ luyện tập"
            : version.origin === "AI_DRAFT"
              ? version.reviewed ? "AI hỗ trợ · đã biên tập" : "AI hỗ trợ · chưa duyệt chuyên môn, chỉ luyện tập"
              : version.origin === "CRAWL" ? "Đề TOEIC đã nhập · Giữ nguyên nội dung nguồn" : "Bài thư viện hệ thống"}
        </p>
      </div>
      {submitted && (
        <div
          role="status"
          className="rounded border border-accent-sage bg-paper-cream p-4"
        >
          <p className="text-lg font-semibold">
            {attempt.correct} / {attempt.total} câu đúng
          </p>
          <p className="mt-1 text-sm">
            Thời gian đã ghi nhận: {attempt.elapsedSeconds} giây.{" "}
            {initial.tryNumber === 1 ? "Kết quả lần đầu." : "Kết quả làm lại."}{" "}
            Bằng chứng không cộng/trừ điểm; không quy đổi điểm TOEIC.
          </p>
          <button
            disabled={busy}
            className="secondary-button mt-3"
            onClick={onRestart}
          >
            Làm lại thành lần mới
          </button>
        </div>
      )}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,1fr)]">
        <section className="prep-reading-passage min-w-0 bg-paper-white p-5 sm:p-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">Bài đọc</h2>
            <label className="text-sm">
              Cỡ chữ{" "}
              <select
                aria-label="Cỡ chữ bài Reading"
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
                className="ml-2 rounded border p-1"
              >
                {[16, 18, 20, 22].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <ReadingSourceDocument key={version.id} stimulus={version.stimulus} fontSize={size}><div
            ref={passage}
            onMouseUp={choose}
            onTouchEnd={choose}
            onKeyUp={choose}
            tabIndex={0}
            aria-label="Văn bản bài Reading"
            className="whitespace-pre-wrap break-words leading-[1.85]"
            style={{ fontSize: size }}
          >
            {highlighted}
          </div>
          <button className="mt-4 text-xs underline" onClick={choose}>
            Dùng phần văn bản đang bôi chọn
          </button>
          </ReadingSourceDocument>
        </section>
        <div className="min-w-0 space-y-4">
          <section className="prep-question-surface space-y-4 bg-paper-white p-4 sm:p-6">
            <div className="flex flex-wrap justify-between gap-3">
              <h2 className="font-semibold">
                Câu {index + 1} / {version.questions.length} ·{" "}
                {types[question.type]}
              </h2>
              <span className="text-xs text-ink-medium">{saving}</span>
            </div>
            <p className="text-base leading-relaxed">{question.prompt}</p>
            {learningLevel && learningLevels[learningLevel] && (
              <p className="text-xs text-ink-medium">
                <span className="rounded-full border border-paper-kraft px-3 py-1">
                  Mục tiêu luyện tập: {learningLevels[learningLevel]}
                </span>
              </p>
            )}
            <fieldset className="space-y-2" disabled={submitted || busy}>
              <legend className="sr-only">Chọn đáp án</legend>
              {question.options.map((option, i) => (
                <label
                  key={i}
                  className={`flex cursor-pointer gap-3 rounded border p-3 text-sm leading-relaxed ${answers[index]?.selected === i ? "border-accent-navy bg-paper-cream" : "border-paper-kraft"}`}
                >
                  <input
                    type="radio"
                    name={`reading-${index}`}
                    checked={answers[index]?.selected === i}
                    onChange={() =>
                      setAnswers({
                        ...answers,
                        [index]: {
                          selected: i,
                          evidence: answers[index]?.evidence || [],
                        },
                      })
                    }
                  />
                  <span>
                    {String.fromCharCode(65 + i)}. {option}
                  </span>
                </label>
              ))}
            </fieldset>
            <div className="space-y-2 text-sm">
              <p>
                {question.evidenceRequired
                  ? "Câu này cần chọn đoạn làm bằng chứng."
                  : "Bằng chứng không bắt buộc cho câu này."}
              </p>
              {answers[index]?.evidence.map((span) => (
                <blockquote
                  key={span.start}
                  className="border-l-2 border-accent-sage pl-3"
                >
                  {span.text}
                </blockquote>
              ))}
              {!submitted && (
                <div className="flex gap-4">
                  <button
                    disabled={!selection || !answers[index] || busy}
                    className="underline disabled:opacity-40"
                    onClick={attach}
                  >
                    Dùng đoạn đang chọn
                  </button>
                  {!!answers[index]?.evidence.length && (
                    <button
                      className="underline"
                      onClick={() =>
                        setAnswers({
                          ...answers,
                          [index]: { ...answers[index], evidence: [] },
                        })
                      }
                    >
                      Bỏ bằng chứng
                    </button>
                  )}
                </div>
              )}
            </div>
            {submitted && (
              <div className="rounded bg-paper-cream p-4 space-y-3 text-sm">
                <p className="font-semibold">
                  {answers[index]?.selected === question.answer
                    ? "Trả lời đúng"
                    : "Chưa đúng"}{" "}
                  · Đáp án {String.fromCharCode(65 + (question.answer ?? 0))}
                </p>
                <AiMarkdown content={question.explanation || ""} />
                {question.evidence?.map((span) => (
                  <blockquote
                    key={span.start}
                    className="border-l-2 border-accent-sage pl-3"
                  >
                    {span.text}
                  </blockquote>
                ))}
                <p>
                  Bằng chứng mẫu để đối chiếu; một đoạn khác vẫn có thể phù hợp.
                </p>
              </div>
            )}
            <div className="flex justify-between gap-4 border-t border-paper-kraft pt-3">
              <button
                disabled={index === 0 || busy}
                className="text-sm disabled:opacity-40"
                onClick={() => {
                  setIndex(index - 1);
                  setTutor("");
                }}
              >
                Câu trước
              </button>
              <button
                disabled={
                  index + 1 >= version.questions.length || busy || (version.questions[0]?.type === "MAIN" && !answers[0])
                }
                className="text-sm disabled:opacity-40"
                onClick={() => {
                  setIndex(index + 1);
                  setTutor("");
                }}
              >
                Câu tiếp
              </button>
            </div>
            {!submitted && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  disabled={busy}
                  className="text-sm underline"
                  onClick={() =>
                    void act(async () => {
                      await save();
                      setNotice("Đã lưu tiến độ vào tài khoản.");
                      onChanged();
                    })
                  }
                >
                  Lưu tiến độ
                </button>
                <button
                  disabled={busy || !ready}
                  className="primary-button"
                  onClick={() =>
                    void act(async () => {
                      await chain.current.catch(() => undefined);
                      const next = await api<ReadingAttempt>(
                        `/reading/attempts/${attempt.id}/submit`,
                        { method: "POST", data: snapshot() },
                      );
                      notifyLearningProgress();
                      setAttempt(next);
                      setAnswers(next.answers);
                      setSaving("Đã nộp và lưu kết quả");
                      onChanged();
                    })
                  }
                >
                  Nộp bài ({Object.keys(answers).length}/
                  {version.questions.length})
                </button>
              </div>
            )}
          </section>
          <details open={!!selection} className="section-disclosure">
            <summary>Từ vựng và đoạn đang chọn</summary>
            <div className="space-y-3 text-sm">
              {selection ? (
                <>
                  <blockquote className="border-l-2 border-accent-sage pl-3 break-words">
                    {selection.text}
                  </blockquote>
                  <div className="flex flex-wrap gap-4">
                    <button
                      disabled={busy}
                      className="underline"
                      onClick={() => void ask("WORD")}
                    >
                      Giải nghĩa theo ngữ cảnh
                    </button>
                    <button
                      disabled={busy}
                      className="underline"
                      onClick={() => void ask("STRUCTURE")}
                    >
                      Giải thích cấu trúc
                    </button>
                  </div>
                  <label className="block">
                    Nghĩa / cách dùng (có thể chỉnh sửa)
                    <textarea
                      rows={2}
                      value={meaning}
                      onChange={(e) => setMeaning(e.target.value)}
                      className="form-input !border"
                    />
                  </label>
                  <label className="block">
                    Ghi chú
                    <input
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="form-input !border"
                    />
                  </label>
                  <button
                    disabled={
                      busy || !meaning.trim() || selection.text.length > 120
                    }
                    className="primary-button"
                    onClick={() =>
                      void act(async () => {
                        await api(`/reading/attempts/${attempt.id}/words`, {
                          method: "POST",
                          data: {
                            ...selection,
                            word: selection.text,
                            meaning,
                            notes,
                          },
                        });
                        setNotice(
                          "Đã lưu từ/cụm từ và câu gốc vào thư mục Reading riêng. Lưu lại từ này sẽ cập nhật nghĩa, không tạo thẻ trùng.",
                        );
                      })
                    }
                  >
                    Lưu từ / cụm từ
                  </button>
                  <Link to="/flashcards" className="ml-3 underline">
                    Mở sổ từ vựng
                  </Link>
                  <p className="text-xs text-ink-medium">
                    Chọn tối đa 120 ký tự để lưu từ/cụm từ. AI chỉ giải thích
                    khi bạn bấm hỏi.
                  </p>
                </>
              ) : (
                <p>
                  Bôi chọn từ hoặc một đoạn trong bài đọc để giải thích, lưu từ
                  hoặc làm bằng chứng.
                </p>
              )}
            </div>
          </details>
          <details className="section-disclosure" open={!!tutor}>
            <summary>Gia sư trong bài đọc</summary>
            <div className="space-y-3 text-sm">
              <p>
                {submitted
                  ? "Có thể giải thích đáp án, paraphrase và nhận xét bằng chứng."
                  : "Gợi ý từng bước trước khi nộp không tiết lộ đáp án."}
              </p>
              {submitted && (
                <input
                  aria-label="Câu hỏi gia sư Reading"
                  maxLength={600}
                  className="form-input !border"
                  value={tutorMessage}
                  onChange={(e) => setTutorMessage(e.target.value)}
                  placeholder="Điều bạn muốn hiểu thêm…"
                />
              )}
              <div className="flex flex-wrap gap-4">
                <button
                  disabled={busy}
                  className="underline"
                  onClick={() => void ask(submitted ? "ANSWER" : "HINT")}
                >
                  {submitted
                    ? "Giải thích đáp án / paraphrase"
                    : "Gợi ý từng bước"}
                </button>
                <button
                  disabled={busy || !selection}
                  className="underline disabled:opacity-40"
                  onClick={() => void ask("EVIDENCE")}
                >
                  Nhận xét đoạn bằng chứng
                </button>
              </div>
              {busy && <p role="status">Đang xử lý…</p>}
              {tutor && <AiMarkdown content={tutor} />}
            </div>
          </details>
          <details className="section-disclosure">
            <summary>Báo câu hỏi mơ hồ hoặc đáp án sai</summary>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                const reason = String(
                  new FormData(e.currentTarget).get("reason") || "",
                );
                void act(async () => {
                  await api(`/reading/attempts/${attempt.id}/reports`, {
                    method: "POST",
                    data: { reason, questionIndex: index },
                  });
                  setNotice("Đã gửi báo lỗi cho người biên soạn.");
                });
              }}
            >
              <textarea
                name="reason"
                required
                maxLength={1000}
                aria-label="Nội dung báo lỗi Reading"
                className="form-input !border"
              />
              <button disabled={busy} className="primary-button">
                Gửi báo lỗi câu này
              </button>
            </form>
          </details>
        </div>
      </div>
      {submitted && <ActivitySuggestions section="reading" compact excludeHref={`/reading?article=${version.articleId}`} />}
    </div>
  );
}

export function ReadingPage() {
  const [params, setParams] = useSearchParams();
  const articleId = Number(params.get("article")) || null;
  const attemptId = Number(params.get("attempt")) || null;
  const catalog = useAsyncResource(
    useCallback(
      (signal: AbortSignal) => api<ReadingCatalog>("/reading", { signal }),
      [],
    ),
  );
  const content = useAsyncResource<ReadingAttempt | ReadingArticle | null>(
    useCallback(
      (signal: AbortSignal) =>
        attemptId
          ? api<ReadingAttempt>(`/reading/attempts/${attemptId}`, { signal })
          : articleId
            ? api<ReadingArticle>(`/reading/articles/${articleId}`, { signal })
            : Promise.resolve(null),
      [articleId, attemptId],
    ),
  );
  const { token } = useAuth();
  let admin = false;
  try {
    admin =
      JSON.parse(
        atob(token!.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
      ).role === "ADMIN";
  } catch {
    /* API guards enforce role. */
  }
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [kind, setKind] = useState("");
  const [progress, setProgress] = useState("");
  const [source, setSource] = useState("");
  const [addingText, setAddingText] = useState(false);
  const personalTitle = useRef<HTMLInputElement>(null);
  const personalTrigger = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (addingText) personalTitle.current?.focus(); }, [addingText]);
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const action = useRef(false);
  const act = async (work: () => Promise<void>) => {
    if (action.current) return;
    action.current = true;
    setBusy(true);
    setError("");
    try {
      await work();
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      action.current = false;
      setBusy(false);
    }
  };
  const article = !attemptId ? (content.data as ReadingArticle | null) : null;
  const attempt = attemptId ? (content.data as ReadingAttempt | null) : null;
  const poll = content.reload;
  useEffect(() => {
    if (!article || !["CREATING", "PROCESSING"].includes(article.status))
      return;
    const timer = window.setTimeout(poll, 2500);
    return () => clearTimeout(timer);
  }, [article, poll]);
  const start = (id: number) =>
    act(async () => {
      const next = await api<ReadingAttempt>(`/reading/articles/${id}/start`, {
        method: "POST",
      });
      setParams({ attempt: String(next.id) });
      catalog.reload();
    });
  const studied = (versionId?: number) =>
    catalog.data?.attempts.find((a) => a.versionId === versionId);
  const filtered = (catalog.data?.articles || []).filter(
    (a) =>
      (!topic || a.version?.topic === topic) &&
      (!difficulty || a.version?.difficulty === difficulty) &&
      (!kind || a.version?.kind === kind) &&
      (!source || (source === "PRIVATE") === (a.ownerId !== null)) &&
      (!progress ||
        (progress === "NEW"
          ? !studied(a.version?.id)
          : progress === "DONE"
            ? !!studied(a.version?.id)?.submittedAt
            : !!studied(a.version?.id) &&
              !studied(a.version?.id)?.submittedAt)),
  );
  const showReadingLibrary = () => { const next = new URLSearchParams(params); next.delete("practice"); setAddingText(false); setParams(next); };
  const showPersonalReading = () => { const next = new URLSearchParams(params); next.delete("practice"); setAddingText(true); setParams(next); };
  const showSentencePractice = () => { const next = new URLSearchParams(params); next.set("practice", "clauses"); setAddingText(false); setParams(next); };
  if (params.get("practice") === "clauses" && !articleId && !attemptId) return <ReadingClausePractice onLibrary={showReadingLibrary} modeNavigation={<ReadingModes mode="clauses" onReading={showReadingLibrary} onClauses={showSentencePractice} onPersonal={showPersonalReading} personalTrigger={personalTrigger} />} />;
  return (
    <div className={`page-stack prep-learning-page ${articleId || attemptId ? "prep-learning-study" : "prep-learning-library"}`}>
      {(error || catalog.error || content.error) && (
        <p
          role="alert"
          className="prep-learning-error rounded bg-rose-50 p-3 text-sm text-rose-800"
        >
          {error || catalog.error || content.error}{" "}
          <button
            className="underline"
            onClick={() => {
              catalog.reload();
              content.reload();
            }}
          >
            Tải lại
          </button>
        </p>
      )}
      {(articleId || attemptId) && !attempt && !article ? (
        <section className="learning-surface space-y-4" aria-busy={content.loading}>
          <button className="secondary-button" onClick={() => setParams({})}>Về thư viện Reading</button>
          <p role={content.loading ? "status" : undefined}>{content.loading ? "Đang mở bài đọc…" : "Chưa mở được bài đọc. Bấm Tải lại để thử lại hoặc chọn bài khác trong thư viện."}</p>
        </section>
      ) : attempt ? (
        <ReadingWorkspace
          key={attempt.id}
          initial={attempt}
          onLibrary={() => setParams({})}
          onChanged={catalog.reload}
          onRestart={() => void start(attempt.version.articleId)}
        />
      ) : article ? (
        <section className="page-section space-y-4">
          <button className="text-sm underline" onClick={() => setParams({})}>
            Thư viện Reading
          </button>
          <h1 className="text-2xl font-semibold">
            {article.version?.title || article.title}
          </h1>
          <p className="text-sm text-ink-medium">
            {article.ownerId === null
              ? article.version?.origin === "CRAWL" ? "Đề TOEIC đã nhập · Giữ nguyên nội dung nguồn" : "Bài thư viện hệ thống"
              : "Văn bản cá nhân · Riêng tư · Giữ nguyên văn bản bạn đã nhập"}
          </p>
          <p className="max-w-prose whitespace-pre-wrap break-words text-lg leading-loose">
            {article.text}
          </p>
          {["CREATING", "PROCESSING"].includes(article.status) && (
            <p role="status">
              Đang tạo câu hỏi từ văn bản gốc… Bạn có thể rời trang và mở lại
              sau.
            </p>
          )}
          {article.error && (
            <p role="alert" className="text-sm text-rose-800">
              {article.error}
            </p>
          )}
          {article.version ? (
            <button
              disabled={busy}
              className="primary-button"
              onClick={() => void start(article.id)}
            >
              Đọc và bắt đầu luyện tập
            </button>
          ) : (
            article.status === "FAILED" && (
              <button
                disabled={busy || article.generationAttempts >= 3}
                className="primary-button"
                onClick={() =>
                  void act(async () => {
                    await api(`/reading/articles/${article.id}/retry`, {
                      method: "POST",
                    });
                    content.reload();
                    catalog.reload();
                  })
                }
              >
                Thử tạo lại ({article.generationAttempts}/3)
              </button>
            )
          )}
        </section>
      ) : (
        <>
          <PageHeader
            eyebrow="READING LIBRARY / ĐỌC & HIỂU"
            title="Luyện đọc"
            description="Chọn bài đọc, trả lời câu hỏi và đối chiếu bằng chứng để hiểu sâu hơn."
          />
          <ReadingModes mode={addingText ? "personal" : "reading"} onReading={showReadingLibrary} onClauses={showSentencePractice} onPersonal={showPersonalReading} personalTrigger={personalTrigger} />
          <section hidden={!addingText} id="personal-reading-form" aria-label="Văn bản Reading riêng" className="rounded-xl border border-paper-kraft bg-paper-white p-4 sm:p-5 space-y-3"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Văn bản cá nhân của bạn</h2><button type="button" className="text-action min-h-11" onClick={() => { setAddingText(false); personalTrigger.current?.focus(); }}>Đóng</button></div>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void act(async () => {
                  const next = await api<{ id: number }>("/reading/personal", {
                    method: "POST",
                    data: { title, text },
                  });
                  setParams({ article: String(next.id) });
                  catalog.reload();
                });
              }}
            >
              <p className="text-sm">
                Dán văn bản tiếng Anh từ 40 từ, tối đa{" "}
                {catalog.data?.limits.maxText || 10000} ký tự. AI tạo tối đa{" "}
                {catalog.data?.limits.maxQuestions || 5} câu dựa trên bài, giữ nguyên
                văn bản gốc và trích dẫn bằng chứng nguyên văn. AI kiểm tra lại
                câu hỏi trước khi lưu; nội dung vẫn do AI tạo, chưa duyệt chuyên
                môn và chỉ dùng luyện tập. Bài cá nhân riêng tư.
              </p>
              <input
                ref={personalTitle}
                aria-label="Tên bài Reading cá nhân"
                maxLength={200}
                className="form-input !border"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Tên bài (tuỳ chọn)"
              />
              <textarea
                aria-label="Văn bản Reading cá nhân"
                rows={8}
                maxLength={catalog.data?.limits.maxText || 10000}
                required
                className="form-input !border"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <button
                disabled={busy || !text.trim()}
                className="primary-button"
              >
                {busy ? "Đang lưu…" : "Tạo bài luyện riêng"}
              </button>
              <p className="text-xs text-ink-medium">
                Không nhập thông tin cá nhân không cần thiết. Email/số điện
                thoại được che trong ngữ cảnh AI. Bài thư viện vẫn học được khi
                AI không hoạt động.
              </p>
            </form>
          </section>
          <div className="prep-library-layout reading-library-layout grid items-start gap-6">
          <section aria-label="Thư viện bài đọc" className="min-w-0 space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-accent-navy">Thư viện Reading</p><h2 className="section-title mt-1">Bài luyện dành cho bạn</h2></div><span className="rounded-full bg-paper-cream px-3 py-1 text-sm text-ink-medium">{filtered.length} bài phù hợp</span></div><div className="prep-library-filters grid gap-3 sm:grid-cols-2 2xl:grid-cols-5">
            <select
              aria-label="Lọc chủ đề Reading"
              className="form-input !border"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            >
              <option value="">Mọi chủ đề</option>
              {[
                ...new Set(
                  catalog.data?.articles
                    .map((a) => a.version?.topic)
                    .filter(Boolean),
                ),
              ].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <select
              aria-label="Lọc độ khó Reading"
              className="form-input !border"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            >
              <option value="">Mọi mức độ</option>
              {Object.entries(levels).map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
            <select
              aria-label="Lọc loại Reading"
              className="form-input !border"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
            >
              <option value="">Mọi loại văn bản</option>
              {Object.entries(kinds).map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
            <select
              aria-label="Lọc tiến độ Reading"
              className="form-input !border"
              value={progress}
              onChange={(e) => setProgress(e.target.value)}
            >
              <option value="">Mọi trạng thái</option>
              <option value="NEW">Chưa học</option>
              <option value="ACTIVE">Đang học</option>
              <option value="DONE">Đã nộp</option>
            </select>
            <select
              aria-label="Lọc nguồn Reading"
              className="form-input !border"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              <option value="">Mọi nguồn</option>
              <option value="SYSTEM">Thư viện</option>
              <option value="PRIVATE">Cá nhân</option>
            </select>
          </div>
          {catalog.loading && <p role="status">Đang tải thư viện…</p>}
          <div className="prep-library-catalog grid gap-5 md:grid-cols-2">
            {filtered.map((a) => {
              const last = studied(a.version?.id);
              return (
                <button
                  disabled={busy}
                  key={a.id}
                  className="prep-learning-card group grid w-full gap-2 text-left"
                  onClick={() =>
                    last && !last.submittedAt
                      ? setParams({ attempt: String(last.id) })
                      : setParams({ article: String(a.id) })
                  }
                >
                  <span className="block text-xs font-medium text-accent-navy">
                    {a.ownerId === null ? "Thư viện" : "Cá nhân · AI"} ·{" "}
                    {a.version
                      ? kinds[a.version.kind]
                      : a.status === "FAILED"
                        ? "Chưa tạo được"
                        : "Đang tạo"}
                  </span>
                  <span className="block break-words text-lg font-semibold text-ink-dark">
                    {a.version?.title || a.title}
                  </span>
                  <span className="block text-sm text-ink-medium">
                    {a.version?.topic}{" "}
                    {a.version && `· ${levels[a.version.difficulty]}`}
                  </span>
                  <span className="mt-3 block border-t border-paper-kraft/60 pt-3 text-sm font-semibold text-accent-navy">
                    {last
                      ? last.submittedAt
                        ? `${last.correct}/${last.total} câu đúng · Lần ${last.tryNumber}`
                        : `Tiếp tục câu ${last.currentIndex + 1}`
                      : a.version
                        ? "Bắt đầu đọc"
                        : "Xem trạng thái tạo bài"}
                  </span>
                </button>
              );
            })}
          </div>
          {!catalog.loading && !filtered.length && (
            <div className="status-message space-y-3"><p>Chưa có bài phù hợp với bộ lọc này.</p><button className="secondary-button" onClick={() => { setTopic(""); setDifficulty(""); setKind(""); setProgress(""); setSource(""); }}>Xóa bộ lọc</button></div>
          )}
          </section>
          <aside aria-label="Bài đọc cá nhân và lịch sử" className="prep-learning-sidebar min-w-0 space-y-4"><div><h2 className="font-semibold">Góc học của bạn</h2><p className="mt-1 text-sm text-ink-medium">Xem lại tiến độ hoặc luyện với văn bản riêng.</p></div>
          <details className="section-disclosure">
            <summary>Lịch sử lần đầu và làm lại</summary>
            <div className="space-y-2">
              {catalog.data?.attempts.map((a) => (
                <button
                  key={a.id}
                  className="block text-left text-sm underline"
                  onClick={() => setParams({ attempt: String(a.id) })}
                >
                  Phiên bản #{a.versionId} · Lần {a.tryNumber}{" "}
                  {a.tryNumber === 1 ? "(lần đầu)" : "(làm lại)"} ·{" "}
                  {a.submittedAt
                    ? `${a.correct}/${a.total}`
                    : `Đang học câu ${a.currentIndex + 1}`}
                </button>
              ))}
            </div>
          </details></aside></div>
          <ActivitySuggestions section="reading" compact />
        </>
      )}
      {admin && <ReadingAdmin onChanged={catalog.reload} />}
    </div>
  );
}
