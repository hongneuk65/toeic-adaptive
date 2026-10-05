import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function AiMarkdown({ content, streaming = false }: { content: string; streaming?: boolean }) {
  return (
    <div className={`ai-markdown${streaming ? ' ai-markdown-streaming' : ''}`}>
      <Markdown remarkPlugins={[remarkGfm]} skipHtml components={{
        a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
        table: ({ children }) => <div className="overflow-x-auto"><table>{children}</table></div>,
      }}>{content}</Markdown>
      {streaming && <span className="ai-writing-cursor" aria-label="AI đang viết" />}
    </div>
  );
}
