import React, { useState, useEffect, useRef } from 'react';
import { useTutorContext } from './useTutorContext';
import { api, apiStream, getErrorMessage } from '../../lib/api';
import { readJsonSse } from '../../lib/sse';
import { AiMarkdown } from './AiMarkdown';
import { DuckMascot } from '../mascot/DuckMascot';
import './tutor-duck.css';
import type { ChatMessage } from '../../types/rag';
import '../../styles/tutor-workspace.css';

interface AiTutorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuestionId?: number | null;
  initialSkillCode?: string | null;
}

export const AiTutorDrawer: React.FC<AiTutorDrawerProps> = ({
  isOpen,
  onClose,
  initialQuestionId: suppliedQuestionId,
  initialSkillCode: suppliedSkillCode,
}) => {
  const tutor = useTutorContext();
  const initialQuestionId = tutor.question?.questionId ?? suppliedQuestionId;
  const initialSkillCode = tutor.question?.skillCode ?? suppliedSkillCode;
  const historyPath = `/rag/chat-history${initialQuestionId ? `?questionId=${initialQuestionId}${tutor.question?.attemptId ? `&attemptId=${tutor.question.attemptId}` : ''}` : ''}`;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape' && dialog.current?.contains(document.activeElement)) onClose(); };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [isOpen, onClose]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const followMessagesRef = useRef(true);
  const messageIdRef = useRef(0);
  const sendControllerRef = useRef<AbortController | null>(null);

  const quickPrompts = initialQuestionId ? ['Giải thích từng bước câu này giúp mình', 'Vì sao đáp án mình chọn chưa phù hợp?', 'Phân tích từng phương án của câu này', 'Cho mình ví dụ tương tự để luyện lại'] : [
    'Phân biệt although và despite',
    'Bẫy lặp từ trong Part 2 là gì?',
    'Khi nào rút gọn mệnh đề về V-ing?',
    'Mẹo làm câu hỏi Not/True Part 7',
  ];

  useEffect(() => {
    if (isOpen) {
      let active = true;
      const controller = new AbortController();
      void Promise.resolve().then(() => {
        if (!active) return;
        setLoadingHistory(true);
        setMessages([]);
        setInput('');
        setSending(false);
        return api<ChatMessage[]>(historyPath, { signal: controller.signal })
          .then((data) => {
            if (active) setMessages(data);
          })
          .catch(() => {})
          .finally(() => {
            if (active) setLoadingHistory(false);
          });
      });

      return () => {
        active = false;
        controller.abort();
        sendControllerRef.current?.abort();
        sendControllerRef.current = null;
      };
    }
  }, [isOpen, historyPath]);

  useEffect(() => {
    if (!isOpen || !followMessagesRef.current) return;
    const frame = requestAnimationFrame(() => {
      const container = messagesContainerRef.current;
      if (!container) return;
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      container.scrollTo({ top: container.scrollHeight, behavior: sending || reducedMotion ? 'auto' : 'smooth' });
    });
    return () => cancelAnimationFrame(frame);
  }, [messages, sending, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input.trim();
    if (!text || sending || loadingHistory || sendControllerRef.current) return;
    followMessagesRef.current = true;
    const controller = new AbortController();
    sendControllerRef.current = controller;

    const nextMessageId = () => {
      messageIdRef.current += 1;
      return -messageIdRef.current;
    };
    const tempUserMsg: ChatMessage = {
      id: nextMessageId(),
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    if (!textToSend) setInput('');
    setSending(true);

    const assistantMessageId = nextMessageId();
    setMessages((prev) => [
      ...prev,
      {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString(),
      },
    ]);

    let accumulated = '';
    let frame: number | undefined;
    const flush = () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      frame = undefined;
      if (sendControllerRef.current !== controller) return;
      const content = accumulated;
      setMessages((prev) => prev.map((message) => (
        message.id === assistantMessageId ? { ...message, content } : message
      )));
    };
    controller.signal.addEventListener('abort', flush, { once: true });

    try {
      const response = await apiStream('/rag/chat-stream', {
        message: text,
        questionId: initialQuestionId || undefined,
        skillCode: initialSkillCode || undefined,
        attemptId: tutor.question?.attemptId,
        selectedAnswer: tutor.question?.selectedAnswer,
      }, controller.signal);
      for await (const event of readJsonSse<{ chunk?: string }>(response)) {
        if (controller.signal.aborted) return;
        if (!event.chunk) continue;
        accumulated += event.chunk;
        if (frame === undefined) frame = requestAnimationFrame(flush);
      }
      flush();
    } catch (error) {
      if (controller.signal.aborted) return;
      flush();
      setMessages((prev) => prev.map((message) => (
        message.id === assistantMessageId
          ? { ...message, content: `${message.content}${message.content ? '\n\n' : ''}${getErrorMessage(error, 'Chưa kết nối được AI. Vui lòng thử lại.')}` }
          : message
      )));
    } finally {
      if (frame !== undefined) cancelAnimationFrame(frame);
      controller.signal.removeEventListener('abort', flush);
      if (sendControllerRef.current === controller) {
        sendControllerRef.current = null;
        setSending(false);
      }
    }
  };

  const handleClearHistory = async () => {
    if (sending || loadingHistory) return;
    if (window.confirm('Xóa hội thoại đang xem với AI?')) {
      try {
        await api(historyPath, { method: 'DELETE' });
        setMessages([]);
      } catch {
        // Giữ nguyên nội dung hiện tại nếu thao tác xóa lịch sử thất bại.
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={dialog} role="complementary" aria-label="Gia sư AI" tabIndex={-1}
      className="tutor-workspace"
    >
      {/* Header */}
      <div className="tutor-workspace-header">
        <div className="flex items-center gap-2.5">
          <span className="tutor-duck-header-avatar"><DuckMascot /></span>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-ink-dark">Gia sư AI</h3>
            <p className="text-xs text-ink-medium">Cùng phân tích bài học</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={handleClearHistory}
              disabled={sending || loadingHistory}
            className="px-2 py-1 text-sm font-mono text-ink-light hover:text-rose-700 hover:bg-paper-kraft-light/40 rounded transition"
            >
              Xóa hội thoại
            </button>
          )}
          <button
            onClick={onClose}
            className="px-3 h-8 flex items-center justify-center rounded border border-paper-kraft text-ink-medium hover:bg-paper-kraft-light/50 font-mono text-sm"
          >
            Đóng
          </button>
        </div>
      </div>

      {initialQuestionId && (
        <div className="tutor-workspace-context">
          <span>{tutor.question?.label ?? `Câu hỏi #${initialQuestionId}`}</span>
          <button onClick={tutor.clear} className="rounded border border-paper-kraft px-2 py-1 text-xs">Hỏi chung · bỏ câu này</button>
        </div>
      )}

      {/* Messages List */}
      <div
        ref={messagesContainerRef}
        onScroll={(event) => {
          const container = event.currentTarget;
          followMessagesRef.current = container.scrollHeight - container.scrollTop - container.clientHeight < 80;
        }}
        className="tutor-workspace-messages"
      >
        {loadingHistory && (
          <div className="text-center py-8 text-sm text-ink-light font-mono">
            Đang tải lịch sử trò chuyện...
          </div>
        )}

        {!loadingHistory && messages.length === 0 && (
          <div className="tutor-duck-intro text-center py-6 space-y-3">

            <p className="text-base leading-6 text-ink-medium">
              Bạn muốn làm rõ điều gì?
            </p>
            <div className="flex flex-col gap-1.5 pt-2">
              <span className="font-mono text-xs text-ink-light uppercase">Gợi ý câu hỏi:</span>
              {quickPrompts.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(q)}
                  className="text-left p-3 rounded border border-paper-kraft bg-white hover:bg-paper-cream text-base text-ink-dark transition"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={`tutor-message tutor-message-${m.role}`}
          >
            <div
                className="tutor-message-content"
            >
              {m.role === 'user' ? m.content : (
                m.content ? <AiMarkdown content={m.content} streaming={sending && m.id === messages.at(-1)?.id} /> :
                  <span role="status" className="ai-thinking text-ink-light">Đang suy nghĩ<span> · · ·</span></span>
              )}
            </div>
            <span className="tutor-duck-author text-xs text-ink-medium mt-0.5 px-1">

              {m.role === 'user' ? 'Bạn' : 'Gia sư AI'}
            </span>
          </div>
        ))}



      </div>

      {/* Input Form */}
      <div className="tutor-workspace-composer">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            aria-label="Tin nhắn cho Gia sư AI"
            placeholder="Hỏi AI về ngữ pháp, bẫy đề thi..."
            disabled={sending || loadingHistory}
            className="flex-1 p-3 bg-paper-cream border border-paper-kraft rounded text-base text-ink-dark focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
          {sending ? <button type="button" onClick={() => sendControllerRef.current?.abort()}
            className="px-4 py-3 border border-paper-kraft rounded text-ink-dark hover:bg-paper-cream"
            aria-label="Dừng câu trả lời">Dừng</button> : <button
            type="submit"
            disabled={!input.trim() || sending || loadingHistory}
            className="px-5 py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-base font-bold rounded shadow transition"
          >
            Gửi
          </button>}
        </form>
      </div>
    </div>
  );
};
