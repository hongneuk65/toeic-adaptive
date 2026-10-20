import { useCallback, useRef, useState } from "react";
import { api, getErrorMessage } from "../../lib/api";
import { useAsyncResource } from "../../hooks/useAsyncResource";
import type { ReadingVersion } from "../../types/reading";
import { ReadingQuestionEditor } from './ReadingQuestionEditor';
interface Overview {
  articles: {
    id: number;
    title: string;
    archived: boolean;
    status: string;
    versions: { id: number; revision: number; reviewed: boolean }[];
  }[];
  reports: {
    id: number;
    reason: string;
    versionId: number;
    questionIndex: number | null;
  }[];
  failures: { id: number; error: string; generationAttempts: number }[];
  usage: {
    action: string;
    status: string;
    _count: number;
    _sum: { inputChars: number; outputChars: number; durationMs: number };
  }[];
}
const empty = {
  title: "",
  text: "",
  topic: "Văn phòng",
  kind: "EMAIL",
  difficulty: "MEDIUM",
};
export function ReadingAdmin({ onChanged }: { onChanged(): void }) {
  const data = useAsyncResource(
    useCallback(
      (signal: AbortSignal) => api<Overview>("/reading/admin", { signal }),
      [],
    ),
  );
  const [draft, setDraft] = useState(empty);
  const [questions, setQuestions] = useState("[]");
  const [id, setId] = useState<number | null>(null);
  const [version, setVersion] = useState<ReadingVersion | null>(null);
  const actionLock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const unsaved = version && (draft.title !== version.title || draft.text !== version.text || draft.topic !== version.topic || draft.kind !== version.kind || draft.difficulty !== version.difficulty || questions !== JSON.stringify(version.questions, null, 2));
  const act = async (work: () => Promise<void>) => {
    if (actionLock.current) return;
    actionLock.current = true;
    setBusy(true);
    setNotice("");
    setError("");
    try {
      await work();
      data.reload();
      onChanged();
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  };
  const load = (articleId: number) =>
    act(async () => {
      const article = await api<{ versions: ReadingVersion[] }>(
        `/reading/admin/articles/${articleId}`,
      );
      const v = article.versions[0];
      if (!v) throw new Error("Bài đọc chưa có phiên bản để chỉnh sửa.");
      setId(articleId);
      setVersion(v);
      setDraft({
        title: v.title,
        text: v.text,
        topic: v.topic,
        kind: v.kind,
        difficulty: v.difficulty,
      });
      setQuestions(JSON.stringify(v.questions, null, 2));
      setNotice("Đang sửa bản nháp; kết quả cũ vẫn dùng phiên bản đã lưu.");
    });
  return (
    <details open className="section-disclosure">
      <summary>Biên soạn và quản lý Reading</summary>
      <div className="space-y-5 text-sm">
        {(error || data.error) && (
          <p role="alert" className="text-rose-800">
            {error || data.error}
          </p>
        )}
        {data.loading && <p role="status">Đang tải thư viện bài đọc…</p>}
        {data.error && <button className="secondary-button" onClick={data.reload}>Tải lại thư viện</button>}
        {notice && <p role="status">{notice}</p>}
        <div className="flex gap-3">
          <button
            className="underline"
            disabled={busy}
            onClick={() => {
              if (unsaved && !window.confirm("Bỏ các chỉnh sửa chưa lưu để tạo bài mới?")) return;
              setError("");setNotice("");
              setId(null);
              setVersion(null);
              setDraft(empty);
              setQuestions("[]");
            }}
          >
            Bài mới
          </button>
          <select
            aria-label="Bài hệ thống cần sửa"
            value={id || ""}
            disabled={busy}
            onChange={(event) => {
              if (event.target.value && (!unsaved || window.confirm("Bỏ các chỉnh sửa chưa lưu để mở bài khác?"))) void load(Number(event.target.value));
            }}
            className="form-input !border"
          >
            <option value="">Chọn bài để sửa / xem trước</option>
            {data.data?.articles.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
                {a.archived ? " · Lưu trữ" : ""}
              </option>
            ))}
          </select>
        </div>
        <fieldset disabled={busy} className="admin-editor-fields">
        <label className="block">
          Tên bài
          <input
            className="form-input !border"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
        </label>
        <label className="block">
          Chủ đề
          <input
            className="form-input !border"
            value={draft.topic}
            onChange={(e) => setDraft({ ...draft, topic: e.target.value })}
          />
        </label>
        <div className="flex flex-wrap gap-3">
          <select
            aria-label="Loại văn bản admin"
            className="form-input !border"
            value={draft.kind}
            onChange={(e) => setDraft({ ...draft, kind: e.target.value })}
          >
            {["EMAIL", "NOTICE", "ADVERTISEMENT", "MESSAGE", "ARTICLE"].map(
              (v) => (
                <option key={v} value={v}>{{ EMAIL: "Email", NOTICE: "Thông báo", ADVERTISEMENT: "Quảng cáo", MESSAGE: "Tin nhắn", ARTICLE: "Bài viết", EASY: "Dễ", MEDIUM: "Vừa", HARD: "Khó" }[v]}</option>
              ),
            )}
          </select>
          <select
            aria-label="Độ khó admin"
            className="form-input !border"
            value={draft.difficulty}
            onChange={(e) => setDraft({ ...draft, difficulty: e.target.value })}
          >
            {["EASY", "MEDIUM", "HARD"].map((v) => (
              <option key={v} value={v}>{{ EMAIL: "Email", NOTICE: "Thông báo", ADVERTISEMENT: "Quảng cáo", MESSAGE: "Tin nhắn", ARTICLE: "Bài viết", EASY: "Dễ", MEDIUM: "Vừa", HARD: "Khó" }[v]}</option>
            ))}
          </select>
        </div>
        <label className="block">
          Văn bản gốc
          <textarea
            className="form-input !border"
            rows={7}
            value={draft.text}
            onChange={(e) => setDraft({ ...draft, text: e.target.value })}
          />
        </label>
        <ReadingQuestionEditor sourceOrder={version?.origin === 'CRAWL'} value={questions} text={draft.text} onChange={setQuestions} />
        <details>
          <summary className="cursor-pointer underline">
            Nâng cao: nhập câu hỏi bằng JSON
          </summary>
          <p className="my-2">
            Mỗi câu: type, prompt, options gồm 4 lựa chọn, answer từ 0–3,
            explanation, evidenceRequired, evidence gồm start/end/text. Câu đầu
            MAIN cho bài biên soạn; bài crawl giữ thứ tự nguồn. Chỉ số tính theo ký tự trong văn bản gốc.
          </p>
          <textarea
            aria-label="Câu hỏi Reading JSON"
            className="form-input !border font-mono text-xs"
            rows={12}
            value={questions}
            onChange={(e) => setQuestions(e.target.value)}
          />
        </details>
        <div className="flex flex-wrap gap-3">
          <button
            disabled={busy}
            className="primary-button"
            onClick={() =>
              void act(async () => {
                const result = await api<{
                  articleId: number;
                  version: ReadingVersion;
                }>(
                  id
                    ? `/reading/admin/articles/${id}/versions`
                    : "/reading/admin/articles",
                  {
                    method: "POST",
                    data: { ...draft, questions: JSON.parse(questions) },
                  },
                );
                setId(result.articleId);
                setVersion(result.version);
                setQuestions(JSON.stringify(result.version.questions, null, 2));
                setDraft({ title: result.version.title, text: result.version.text, topic: result.version.topic, kind: result.version.kind, difficulty: result.version.difficulty });
                setNotice(
                  "Đã lưu bản nháp mới. Xem trước và duyệt trước khi xuất bản.",
                );
              })
            }
          >
            Lưu bản nháp
          </button>
          <button
            disabled={busy}
            className="underline"
            onClick={() =>
              void act(async () => {
                const result = await api<{
                  articleId: number;
                  version: ReadingVersion;
                }>(
                  id
                    ? `/reading/admin/articles/${id}/versions`
                    : "/reading/admin/articles",
                  { method: "POST", data: { ...draft, aiDraft: true } },
                );
                setId(result.articleId);
                setVersion(result.version);
                setQuestions(JSON.stringify(result.version.questions, null, 2));
                setDraft({title:result.version.title,text:result.version.text,topic:result.version.topic,kind:result.version.kind,difficulty:result.version.difficulty});
                setNotice(
                  "AI tạo bản nháp. Kiểm tra nội dung trước khi duyệt.",
                );
              })
            }
          >
            AI hỗ trợ bản nháp
          </button>
        </div>
        {unsaved && <p role="status" className="text-ink-medium">Có chỉnh sửa chưa lưu. Lưu bản nháp trước khi duyệt hoặc xuất bản.</p>}
        {version && (
          <section className="rounded border border-paper-kraft p-4 space-y-3">
            <h3 className="font-semibold">
              Xem trước bản đã lưu · phiên bản {version.revision}
              {version.reviewed ? " · Đã duyệt" : " · Chưa duyệt"}
            </h3>
            <p className="whitespace-pre-wrap leading-relaxed">
              {version.text}
            </p>
            {version.questions.map((q, i) => (
              <div key={i} className="border-t border-paper-kraft pt-3">
                <p>
                  {i + 1}. {q.prompt}
                </p>
                <ol className="list-[upper-alpha] pl-6">
                  {q.options.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ol>
                <p className="mt-2">
                  Đáp án: {String.fromCharCode(65 + (q.answer || 0))} ·{" "}
                  {q.explanation}
                </p>
                {q.evidence?.map((e) => (
                  <blockquote
                    key={e.start}
                    className="mt-2 border-l-2 border-accent-sage pl-3"
                  >
                    {e.text}
                  </blockquote>
                ))}
              </div>
            ))}
            <div className="flex flex-wrap gap-4">
              <button
                disabled={busy || version.reviewed || !!unsaved}
                className="underline"
                onClick={() =>
                  void act(async () => {
                    setVersion(
                      await api<ReadingVersion>(
                        `/reading/admin/articles/${id}/review`,
                        { method: "POST", data: { versionId: version.id } },
                      ),
                    );
                    setNotice("Đã ghi nhận kiểm tra phiên bản.");
                  })
                }
              >
                Xác nhận đã kiểm tra
              </button>
              <button
                disabled={busy || !version.reviewed || !!unsaved}
                className="primary-button"
                onClick={() =>
                  void act(async () => {
                    await api(`/reading/admin/articles/${id}/publish`, {
                      method: "POST",
                      data: { versionId: version.id },
                    });
                    setNotice("Đã xuất bản đúng phiên bản.");
                  })
                }
              >
                Xuất bản
              </button>
              <button
                disabled={busy}
                className="underline"
                onClick={() =>
                  void act(async () => {
                    await api(`/reading/admin/articles/${id}/archive`, {
                      method: "POST",
                    });
                    setNotice("Đã lưu trữ bài. Lịch sử học được giữ.");
                  })
                }
              >
                Lưu trữ
              </button>
            </div>
          </section>
        )}
        </fieldset>
        <details>
          <summary className="cursor-pointer">
            Báo lỗi nội dung ({data.data?.reports.length || 0})
          </summary>
          {data.data?.reports.map((r) => (
            <div key={r.id} className="border-b py-3">
              <p>
                Phiên bản {r.versionId} · Câu{" "}
                {r.questionIndex === null ? "cả bài" : r.questionIndex + 1}:{" "}
                {r.reason}
              </p>
              <button
                className="underline"
                disabled={busy}
                onClick={() =>
                  void act(async () => {
                    await api(`/reading/admin/reports/${r.id}`, {
                      method: "PATCH",
                    });
                  })
                }
              >
                Đánh dấu đã xử lý
              </button>
            </div>
          ))}
        </details>
        <details>
          <summary className="cursor-pointer">
            Lỗi tạo bài và sử dụng AI
          </summary>
          <p className="my-2">
            Chỉ hiển thị metadata lỗi bài cá nhân. Không mở nội dung riêng tư.
          </p>
          {data.data?.failures.map((f) => (
            <p key={f.id}>
              Bài #{f.id} · {f.generationAttempts} lần thử · {f.error}
            </p>
          ))}
          {data.data?.usage.map((u) => (
            <p key={`${u.action}-${u.status}`}>
              {u.action} · {u.status}: {u._count} lượt ·{" "}
              {u._sum.inputChars || 0} ký tự đầu vào / {u._sum.outputChars || 0}{" "}
              đầu ra (ước lượng sử dụng, không phải token tính phí).
            </p>
          ))}
        </details>
      </div>
    </details>
  );
}
