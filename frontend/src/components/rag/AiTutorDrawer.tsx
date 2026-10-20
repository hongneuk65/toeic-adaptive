import React, { useState, useEffect, useRef } from 'react';
import { api, apiStream } from '../../lib/api';
import { readJsonSse } from '../../lib/sse';
import { AiMarkdown } from './AiMarkdown';
import { DuckMascot } from '../mascot/DuckMascot';
import './tutor-duck.css';
import type { ChatMessage } from '../../types/rag';
import { useDialogFocus } from '../../hooks/useDialogFocus';

const DEFAULT_DRAWER_WIDTH = 720;
const MIN_DRAWER_WIDTH = 380;

const getMaxDrawerWidth = () => Math.max(MIN_DRAWER_WIDTH, Math.floor(window.innerWidth * 0.5));

interface AiTutorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuestionId?: number | null;
  initialSkillCode?: string | null;
}

export const AiTutorDrawer: React.FC<AiTutorDrawerProps> = ({
  isOpen,
  onClose,
  initialQuestionId,
  initialSkillCode,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const dialog = useRef<HTMLDivElement>(null);
  useDialogFocus(dialog, isOpen, onClose);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [drawerWidth, setDrawerWidth] = useState(() => Math.min(DEFAULT_DRAWER_WIDTH, getMaxDrawerWidth()));
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const followMessagesRef = useRef(true);
  const resizeStartRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const messageIdRef = useRef(0);
  const sendControllerRef = useRef<AbortController | null>(null);

  const quickPrompts = [
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
        setSending(false);
        return api<ChatMessage[]>('/rag/chat-history', { signal: controller.signal })
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
  }, [isOpen, initialQuestionId, initialSkillCode]);

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
      }, controller.signal);
      for await (const event of readJsonSse<{ chunk?: string }>(response)) {
        if (controller.signal.aborted) return;
        if (!event.chunk) continue;
        accumulated += event.chunk;
        if (frame === undefined) frame = requestAnimationFrame(flush);
      }
      flush();
    } catch {
      if (controller.signal.aborted) return;
      flush();
      setMessages((prev) => prev.map((message) => (
        message.id === assistantMessageId
          ? { ...message, content: `${message.content}${message.content ? '\n\n' : ''}Kết nối tạm gián đoạn. Câu trả lời chưa hoàn tất. Bạn vui lòng thử lại nhé!` }
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
    if (window.confirm('Xóa toàn bộ lịch sử trò chuyện với AI?')) {
      try {
        await api('/rag/chat-history', { method: 'DELETE' });
        setMessages([]);
      } catch {
        // Giữ nguyên nội dung hiện tại nếu thao tác xóa lịch sử thất bại.
      }
    }
  };

  const updateDrawerWidth = (width: number) => {
    setDrawerWidth(Math.min(getMaxDrawerWidth(), Math.max(MIN_DRAWER_WIDTH, width)));
  };

  const handleResizeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeStartRef.current = {
      startX: event.clientX,
      startWidth: drawerWidth,
    };
  };

  const handleResize = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeStartRef.current) return;

    // Drawer neo bên phải: kéo tay nắm sang trái sẽ làm panel rộng hơn.
    updateDrawerWidth(
      resizeStartRef.current.startWidth + resizeStartRef.current.startX - event.clientX,
    );
  };

  const handleResizeEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    resizeStartRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleResizeKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      updateDrawerWidth(drawerWidth + 24);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      updateDrawerWidth(drawerWidth - 24);
    } else if (event.key === 'Home') {
      event.preventDefault();
      updateDrawerWidth(MIN_DRAWER_WIDTH);
    } else if (event.key === 'End') {
      event.preventDefault();
      updateDrawerWidth(getMaxDrawerWidth());
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={dialog} role="dialog" aria-modal="true" aria-label="Gia sư AI" tabIndex={-1}
      className="tutor-enter fixed inset-y-0 right-0 z-50 w-full sm:w-[var(--drawer-width)] sm:max-w-[70vw] bg-paper-white border-l border-paper-kraft flex flex-col font-body text-base"
      style={{ '--drawer-width': `${drawerWidth}px` } as React.CSSProperties}
    >
      {/* Tay nắm kéo rộng/hẹp panel. Trên mobile panel đã full-width nên không cần kéo. */}
      <div
        role="separator"
        aria-label="Điều chỉnh độ rộng Trợ lý AI Tutor"
        aria-orientation="vertical"
        aria-valuemin={MIN_DRAWER_WIDTH}
        aria-valuemax={getMaxDrawerWidth()}
        aria-valuenow={Math.min(drawerWidth, getMaxDrawerWidth())}
        tabIndex={0}
        className="group absolute inset-y-0 left-0 z-20 hidden w-3 -translate-x-1/2 cursor-ew-resize touch-none items-center justify-center sm:flex"
        onPointerDown={handleResizeStart}
        onPointerMove={handleResize}
        onPointerUp={handleResizeEnd}
        onPointerCancel={handleResizeEnd}
        onKeyDown={handleResizeKeyDown}
      >
        <span className="h-16 w-1 rounded-full bg-paper-kraft/70 transition-colors group-hover:bg-slate-900 group-focus:bg-slate-900" />
      </div>

      {/* Header */}
      <div className="tutor-duck-header p-4 border-b border-paper-kraft flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="tutor-duck-header-avatar"><DuckMascot /></span>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-ink-dark">Gia sư AI</h3>
            <p className="text-xs text-ink-medium">Hỏi đáp và giải thích bài học</p>
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
        <div className="p-2.5 bg-paper-cream border-b border-paper-kraft text-ink-dark font-mono text-sm flex items-center justify-between">
          <span>Đang trao đổi về câu hỏi #{initialQuestionId}</span>
          {initialSkillCode && <span className="font-bold">[{initialSkillCode}]</span>}
        </div>
      )}

      {/* Messages List */}
      <div
        ref={messagesContainerRef}
        onScroll={(event) => {
          const container = event.currentTarget;
          followMessagesRef.current = container.scrollHeight - container.scrollTop - container.clientHeight < 80;
        }}
        className="min-h-0 flex-1 p-4 overflow-y-auto overscroll-contain space-y-3 bg-paper-cream/30"
      >
        {loadingHistory && (
          <div className="text-center py-8 text-sm text-ink-light font-mono">
            Đang tải lịch sử trò chuyện...
          </div>
        )}

        {!loadingHistory && messages.length === 0 && (
          <div className="tutor-duck-intro text-center py-6 space-y-3">
            <DuckMascot className="tutor-duck-intro-avatar" />
            <p className="text-base leading-6 text-ink-medium">
              Chào bạn! Hãy hỏi mình bất kỳ thắc mắc nào về TOEIC nhé!
            </p>
            <div className="flex flex-col gap-1.5 pt-2">
              <span className="font-mono text-xs text-ink-light uppercase">Gợi ý câu hỏi:</span>
              {quickPrompts.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(q)}
                  className="text-left p-3 rounded border border-paper-kraft bg-white hover:bg-paper-cream text-base text-ink-dark transition"
                >
                  • {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={`message-enter flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
                className={`max-w-[90%] p-4 rounded-lg text-base leading-relaxed ${
                m.role === 'user'
                  ? 'bg-slate-900 text-white shadow-sm whitespace-pre-wrap'
                  : 'w-full bg-transparent text-ink-dark'
              }`}
            >
              {m.role === 'user' ? m.content : (
                m.content ? <AiMarkdown content={m.content} streaming={sending && m.id === messages.at(-1)?.id} /> :
                  <span role="status" className="ai-thinking text-ink-light">Đang suy nghĩ<span> · · ·</span></span>
              )}
            </div>
            <span className="tutor-duck-author text-xs text-ink-medium mt-0.5 px-1">
              {m.role !== 'user' && <DuckMascot className="tutor-duck-message-avatar" />}
              {m.role === 'user' ? 'Bạn' : 'Gia sư AI'}
            </span>
          </div>
        ))}



      </div>

      {/* Input Form */}
      <div className="p-3 border-t border-paper-kraft bg-paper-white space-y-2">
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
