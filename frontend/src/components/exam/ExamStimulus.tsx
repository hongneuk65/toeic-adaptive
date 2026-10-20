import type { ExamRenderNode, ExamQuestion } from '../../types/exam';

function RenderNode({ node, activeNumber, blankNumbers }: { node: ExamRenderNode; activeNumber: number; blankNumbers: Record<number, number> }) {
  if (node.type === 'text') return <span className={`${node.bold ? 'exam-text-bold' : ''} ${node.underline ? 'exam-text-underline' : ''}`}>{node.text}</span>;
  if (node.type === 'blank') {
    const number = blankNumbers[node.number] ?? node.number;
    return <mark className="exam-blank" data-active={node.number === activeNumber || undefined} aria-label={`Chỗ trống câu ${number}`}>({number}) ______</mark>;
  }
  if (node.type === 'image') return <img src={node.url} alt={node.alt} loading="lazy" />;
  const children = node.children.map((child, index) => <RenderNode key={index} node={child} activeNumber={activeNumber} blankNumbers={blankNumbers} />);
  if (node.type === 'table') return <div className="exam-table-scroll"><table><tbody>{children}</tbody></table></div>;
  if (node.type === 'row') return <tr>{children}</tr>;
  if (node.type === 'cell') return <td colSpan={node.colSpan} rowSpan={node.rowSpan}>{children}</td>;
  if (node.type === 'paragraph') return <p>{children}</p>;
  return <div className="exam-document-group">{children}</div>;
}

export function ExamStimulus({ question, blankNumbers }: { question: ExamQuestion; blankNumbers: Record<number, number> }) {
  const activeNumber = question.part === 6 ? question.stimulus?.questionPosition ?? -1 : -1;
  if (question.stimulus?.documents.length) return <div className="exam-documents">{question.stimulus.documents.map((document, index) => <article key={document.id} className="exam-document" aria-label={`Tài liệu ${index + 1}`}>{question.stimulus!.documents.length > 1 && <h3>Tài liệu {index + 1}</h3>}{document.blocks.map((node, nodeIndex) => <RenderNode key={nodeIndex} node={node} activeNumber={activeNumber} blankNumbers={blankNumbers} />)}</article>)}</div>;
  return <>{question.imageUrl && <img className="exam-source-image" src={question.imageUrl} alt="Hình ảnh của bài thi" />}{question.passage && <article className="exam-document exam-legacy-passage">{question.passage}</article>}{!question.imageUrl && !question.passage && <div className="exam-material-note" data-text-only="true"><span>PART {question.part}</span><h3>{question.part === 5 ? 'Incomplete Sentences' : 'Tư liệu bài thi'}</h3><p>{question.part === 5 ? 'Chọn từ hoặc cụm từ thích hợp để hoàn thành câu.' : 'Đọc câu hỏi và chọn đáp án phù hợp.'}</p></div>}</>;
}
