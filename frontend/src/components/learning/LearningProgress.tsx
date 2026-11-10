import { useCallback, useEffect, useId, useState } from 'react';
import { api } from '../../lib/api';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { LEARNING_PROGRESS_UPDATED } from '../../lib/learning-progress';
import './learning-progress.css';
interface Point { date: string; attempts: number; newQuestions: number; newCorrect: number; revisits: number; repeatedErrors: number; corrected: number; }
interface Progress { days: number; points: Point[]; truncated: boolean; }
type Mode = 'accuracy' | 'errors' | 'activity';
const modes: [Mode,string][] = [['accuracy','Tỷ lệ đúng'],['errors','Lỗi lặp lại'],['activity','Số câu luyện']];
const numberFormat = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });
const shortDate = (date: string) => `${date.slice(8,10)}/${date.slice(5,7)}`;
export function LearningProgress() {
  const [days,setDays] = useState('30'), [part,setPart] = useState('0'), [difficulty,setDifficulty] = useState('ALL');
  const [mode,setMode] = useState<Mode>('accuracy');
  const titleId = useId();
  const load = useCallback((signal: AbortSignal) => api<Progress>(`/mastery/progress?days=${days}&part=${part}&difficulty=${difficulty}`, {signal}), [days,part,difficulty]);
  const {data,loading,error,reload} = useAsyncResource(load);
  useEffect(() => { window.addEventListener(LEARNING_PROGRESS_UPDATED,reload); window.addEventListener('focus',reload); return () => { window.removeEventListener(LEARNING_PROGRESS_UPDATED,reload); window.removeEventListener('focus',reload); }; },[reload]);
  const points = Array.isArray(data?.points) ? data.points : [];
  const total = points.reduce((s,p) => ({attempts:s.attempts+p.attempts,newQuestions:s.newQuestions+p.newQuestions,newCorrect:s.newCorrect+p.newCorrect,revisits:s.revisits+p.revisits,repeatedErrors:s.repeatedErrors+p.repeatedErrors}),{attempts:0,newQuestions:0,newCorrect:0,revisits:0,repeatedErrors:0});
  const count = (p:Point) => mode === 'accuracy' ? p.newQuestions : mode === 'errors' ? p.revisits : p.attempts;
  const value = (p:Point) => mode === 'accuracy' ? p.newCorrect/p.newQuestions*100 : mode === 'errors' ? p.repeatedErrors/p.revisits*100 : p.attempts;
  const peak = Math.max(1, ...points.map(p => p.attempts));
  const step = Math.max(1, Math.ceil(peak / 4));
  const max = mode === 'activity' ? step * 4 : 100;
  const x = (index: number) => (index + 0.5) / points.length * 100;
  const y = (amount: number) => 100 - amount / max * 100;
  const observed = points.filter(p => count(p) > 0);
  const denominator = mode === 'accuracy' ? total.newQuestions : total.revisits;
  const numerator = mode === 'accuracy' ? total.newCorrect : total.repeatedErrors;
  const metric = mode === 'activity'
    ? numberFormat.format(total.attempts)
    : denominator ? `${numberFormat.format(numerator / denominator * 100)}%` : '—';
  const summary = mode === 'accuracy' ? `${total.newCorrect}/${total.newQuestions} câu mới trả lời đúng`
    : mode === 'errors' ? `${numerator}/${total.revisits} lượt gặp lại vẫn trả lời sai`
    : `${total.attempts} lượt trả lời đã ghi nhận`;
  const chartLabel = modes.find(([key]) => key === mode)?.[1];
  const dateTicks = [0, Math.floor((points.length - 1) / 2), points.length - 1];
  const axisTicks = [0, 1, 2, 3, 4];

  return <section className="learning-progress" aria-labelledby={titleId}>
    <div className="progress-heading"><h2 id={titleId}>Tiến bộ của bạn</h2>
      <label>Thời gian<select value={days} onChange={e=>setDays(e.target.value)}><option value="7">7 ngày</option><option value="30">30 ngày</option><option value="90">90 ngày</option></select></label>
    </div>
    <div className="progress-modes" role="group" aria-label="Loại biểu đồ tiến bộ">{modes.map(([key,label])=><button key={key} aria-pressed={mode===key} onClick={()=>setMode(key)}>{label}</button>)}</div>
    <details className="progress-refine">
      <summary>{part === '0' && difficulty === 'ALL' ? 'Lọc theo Part và độ khó' : 'Lọc theo Part và độ khó · Đang áp dụng'}</summary>
      <div className="progress-filters">
        <label>Phần thi<select value={part} onChange={e=>setPart(e.target.value)}><option value="0">Tất cả Part</option>{[1,2,3,4,5,6,7].map(p=><option key={p} value={p}>Part {p}</option>)}</select></label>
        <label>Độ khó<select value={difficulty} onChange={e=>setDifficulty(e.target.value)}><option value="ALL">Tất cả mức</option><option value="EASY">Dễ</option><option value="MEDIUM">Vừa</option><option value="HARD">Khó</option></select></label>
      </div>
    </details>
    {loading ? <p role="status">Đang tải tiến bộ…</p> : error ? <p role="alert">Chưa tải được tiến bộ. <button className="text-action" onClick={reload}>Thử lại</button></p> : !total.attempts ? <div className="progress-empty"><h3>Chưa có kết quả trong khoảng này</h3><p>Hoàn thành bài luyện hoặc chọn khoảng thời gian khác để bắt đầu theo dõi.</p></div> : <>
      <div className="progress-summary">
        <strong>{metric}</strong>
        <p>{summary}</p>
      </div>
      {!observed.length ? <p className="progress-empty">{mode==='errors' ? 'Chưa có lượt gặp lại câu từng sai trong khoảng này.' : 'Chưa có câu gặp lần đầu trong khoảng này.'}</p> :
        <div className="progress-chart" data-mode={mode} role="img" aria-label={`${chartLabel} theo ngày. Xem số liệu chính xác ở bảng bên dưới.`}>
          <div className="progress-chart-unit">{mode === 'activity' ? 'Lượt trả lời' : 'Tỷ lệ (%)'}</div>
          <div className="progress-y-axis" aria-hidden="true">
            {axisTicks.map(tick => <span key={tick} style={{ top: `${tick * 25}%` }}>{max - tick * max / 4}</span>)}
          </div>
          <div className="progress-plot" aria-hidden="true">
            {axisTicks.map(tick => <span key={tick} className="progress-grid" style={{ top: `${tick * 25}%` }} />)}
            {mode !== 'activity' && <svg viewBox="0 0 100 100" preserveAspectRatio="none">
              {points.map((point, index) => {
                const previous = points[index - 1];
                if (!previous || !count(previous) || !count(point)) return null;
                return <line key={point.date} x1={x(index - 1)} y1={y(value(previous))}
                  x2={x(index)} y2={y(value(point))} vectorEffect="non-scaling-stroke" />;
              })}
            </svg>}
            {points.map((point, index) => {
              if (!count(point)) return null;
              const amount = value(point);
              const title = `${shortDate(point.date)} · ${numberFormat.format(amount)}${mode === 'activity' ? ' lượt' : `% · ${count(point)} lượt`}`;
              return mode === 'activity'
                ? <span key={point.date} title={title} className="progress-bar" style={{ left: `${x(index)}%`, height: `${100 - y(amount)}%`, width: `${68 / points.length}%` }} />
                : <span key={point.date} title={title} className="progress-dot" style={{ left: `${x(index)}%`, top: `${y(amount)}%` }} />;
            })}
          </div>
          <div className="progress-x-axis" aria-hidden="true">
            {[...new Set(dateTicks)].map(index => <span key={index} style={{ left: `clamp(16px, ${x(index)}%, 100% - 16px)` }}>{shortDate(points[index].date)}</span>)}
          </div>
        </div>}
      <details className="progress-details"><summary>Xem số liệu từng ngày</summary><div className="progress-table-scroll"><table><caption>Kết quả thực tế · giờ Việt Nam</caption><thead><tr><th>Ngày</th><th>Đúng câu mới</th><th>Sai khi gặp lại</th><th>Lượt luyện</th></tr></thead><tbody>{points.filter(p=>p.attempts>0).map(p=><tr key={p.date}><td>{shortDate(p.date)}</td><td>{p.newQuestions?`${p.newCorrect}/${p.newQuestions}`:'—'}</td><td>{p.revisits?`${p.repeatedErrors}/${p.revisits}`:'—'}</td><td>{p.attempts}</td></tr>)}</tbody></table></div></details>
    </>}
    {data?.truncated && <p role="status">Dữ liệu vượt giới hạn 20.000 bản ghi kỹ năng; hãy chọn khoảng ngắn hơn.</p>}
    <details className="progress-details">
      <summary>Cách đọc biểu đồ</summary>
      <p className="progress-note">{mode==='accuracy'?'Chỉ tính lần đầu gặp từng câu trong lịch sử đã lưu.':mode==='errors'?'Tỷ lệ sai khi gặp lại câu từng trả lời sai. Kết quả này chưa chứng minh đã sửa lỗi trên câu mới.':'Số câu luyện phản ánh hoạt động trong kỳ.'} Ngày thiếu dữ liệu để trống.</p>
      <p className="progress-scope">Biểu đồ dùng kết quả câu hỏi có gắn kỹ năng và không quy đổi sang điểm TOEIC.</p>
    </details>
  </section>;
}
