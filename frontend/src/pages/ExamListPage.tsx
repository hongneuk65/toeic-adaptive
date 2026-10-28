import { StudyIcon } from '../components/StudyIcon';
import '../styles/exam-selection.css';
import { useCallback, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, getErrorMessage } from '../lib/api';
import type { ExamSession } from '../types/exam';
import { useAsyncResource } from '../hooks/useAsyncResource';

interface ExamCatalog {
  source: 'SANTA_EDNET';
  totalQuestions: number;
  byPart: { part: number; count: number }[];
  modes: { examType: ExamSession['examType']; available: boolean; questionCount: number }[];
}
const parts = [
  { part: 1, label: 'Mô tả tranh', count: 6, minutes: 2.7 },
  { part: 2, label: 'Hỏi và đáp', count: 25, minutes: 11.25 },
  { part: 3, label: 'Hội thoại', count: 39, minutes: 17.55 },
  { part: 4, label: 'Bài nói ngắn', count: 30, minutes: 13.5 },
  { part: 5, label: 'Hoàn thành câu', count: 30, minutes: 20 },
  { part: 6, label: 'Hoàn thành đoạn văn', count: 16, minutes: 10 },
  { part: 7, label: 'Đọc hiểu', count: 54, minutes: 45 },
] as const;
const modes = [
  { type: 'CUSTOM', label: 'Tự chọn Part', detail: 'Chọn một hoặc nhiều Part', description: 'Tập trung vào phần bạn muốn luyện hôm nay.' },
  { type: 'MINI', label: 'Đề rút gọn', detail: '100 câu · 60 phút', description: 'Luyện cả Listening và Reading.' },
  { type: 'FULL', label: 'Đề đầy đủ', detail: '200 câu · 120 phút', description: 'Dành một phiên riêng để luyện toàn bộ đề.' },
] as const;

export const ExamListPage = () => {
  const [searchParams] = useSearchParams();
  const [selected, setSelected] = useState<'FULL' | 'MINI' | 'CUSTOM'>('CUSTOM');
  const [selectedParts, setSelectedParts] = useState<number[]>(() => {
    const raw = searchParams.get('parts') ?? searchParams.get('part');
    if (raw === null) return [5];
    return [...new Set(raw.split(',').map(value => value.trim()).filter(value => /^[1-7]$/.test(value)).map(Number))].sort((a,b) => a-b);
  });
  const [busy, setBusy] = useState(false);
  const starting = useRef(false);
  const [error, setError] = useState('');
  const catalog = useAsyncResource(useCallback((signal: AbortSignal) => api<ExamCatalog>('/exam/catalog', { signal }), []));
  const available = (part: number, count: number) => (catalog.data?.byPart.find(item => item.part===part)?.count ?? 0) >= count;
  const availableParts = parts.filter(item => available(item.part,item.count)).map(item => item.part);
  const selectedMode = catalog.data?.modes.find(mode => mode.examType===selected);
  const chosen = parts.filter(item => selectedParts.includes(item.part));
  const questionCount = selected==='CUSTOM' ? chosen.reduce((sum,item) => sum+item.count,0) : selectedMode?.questionCount ?? 0;
  const estimatedMinutes = Math.ceil(chosen.reduce((sum,item) => sum+item.minutes,0));
  const customReady = chosen.length>0 && chosen.every(item => available(item.part,item.count));
  const ready = !catalog.loading && !catalog.error && (selected==='CUSTOM' ? customReady : selectedMode?.available===true);
  const navigate = useNavigate();
  const start = async () => {
    if (starting.current || !ready) return;
    starting.current=true;setBusy(true);setError('');
    try {
      const exam = await api<ExamSession>('/exam/start', {method:'POST',data:{examType:selected,...(selected==='CUSTOM' ? {parts:[...selectedParts].sort((a,b)=>a-b)} : {})}});
      navigate(`/exam/${exam.attemptId}`);
    } catch(cause) {setError(getErrorMessage(cause,'Chưa tạo được đề. Hãy thử lại.'));}
    finally {starting.current=false;setBusy(false);}
  };
  const duration = selected === 'CUSTOM' ? estimatedMinutes : selected === 'FULL' ? 120 : 60;
  const readiness = catalog.loading ? 'Đang kiểm tra ngân hàng câu hỏi…' : catalog.error ? 'Chưa tải được dữ liệu. Vui lòng thử lại.' : ready ? 'Sẵn sàng bắt đầu' : selected === 'CUSTOM' && !chosen.length ? 'Chọn ít nhất một Part để tiếp tục.' : 'Chưa đủ câu hỏi cho lựa chọn này.';
  return <div className="exam-selection">
    <aside className="exam-selection-header"><div><p className="exam-selection-eyebrow">DÀNH CHO NGƯỜI MỚI</p><h2>Chưa biết nên bắt đầu từ đâu?</h2><p>Làm bài đánh giá đầu vào với câu hỏi thích ứng để nhận gợi ý học phù hợp.</p></div><Link to="/placement" className="primary-button">Đánh giá đầu vào →</Link></aside>
    <header className="exam-selection-header"><div><p className="exam-selection-eyebrow">LUYỆN TẬP & LUYỆN THI</p><h1>Chọn bài luyện TOEIC</h1><p>Luyện riêng từng phần hoặc kiểm tra cả hai kỹ năng trong một bài thi.</p></div><Link to="/history"><StudyIcon name="clock" />Lịch sử làm bài</Link></header>
    <fieldset className="exam-selection-modes" disabled={busy}><legend className="sr-only">Hình thức luyện thi</legend>{modes.map(mode => <label key={mode.type} data-selected={selected === mode.type || undefined}><input type="radio" name="exam-mode" value={mode.type} checked={selected === mode.type} onChange={() => {setSelected(mode.type);setError('');}} /><span><strong>{mode.label}</strong><small>{mode.detail}</small></span></label>)}</fieldset>
    <section className="exam-selection-workspace" aria-label="Thiết lập bài luyện">
      <div className="exam-selection-content">
        {selected === 'CUSTOM' ? <>
          <div className="exam-selection-section-title"><div><h2>Bạn muốn luyện phần nào?</h2><p>Chọn một hoặc nhiều Part cho phiên luyện này.</p></div><div className="exam-selection-tools"><button disabled={busy || catalog.loading || !!catalog.error || !availableParts.length} onClick={() => {setSelectedParts(availableParts);setError('');}}>Chọn tất cả</button><button disabled={busy || !selectedParts.length} onClick={() => {setSelectedParts([]);setError('');}}>Bỏ chọn</button></div></div>
          <fieldset className="exam-selection-parts" disabled={busy || catalog.loading || !!catalog.error}><legend className="sr-only">Các Part cần luyện</legend>{[true,false].map(listening => <div className="exam-selection-group" key={String(listening)}><h3><StudyIcon name={listening ? 'headphones' : 'book'} />{listening ? 'Listening' : 'Reading'}<small>Part {listening ? '1–4' : '5–7'}</small></h3>{parts.filter(item => (item.part <= 4) === listening).map(item => {const enabled = available(item.part,item.count); return <label key={item.part} data-selected={selectedParts.includes(item.part) || undefined} data-unavailable={!enabled || undefined}><input type="checkbox" checked={selectedParts.includes(item.part)} disabled={!enabled} onChange={event => {setSelectedParts(values => event.target.checked ? [...values,item.part] : values.filter(value => value !== item.part));setError('');}} /><span className="exam-selection-part-name"><strong>Part {item.part} · {item.label}</strong>{!enabled && !catalog.loading && !catalog.error && <small>Chưa đủ dữ liệu</small>}</span><span>{item.count} câu</span></label>;})}</div>)}</fieldset>
        </> : <div className="exam-selection-timed"><p className="exam-selection-eyebrow">{selected === 'FULL' ? 'FULL TEST' : 'MINI TEST'}</p><h2>{selected === 'FULL' ? 'Một phiên thi đầy đủ' : 'Kiểm tra gọn trong 60 phút'}</h2><p>{selected === 'FULL' ? 'Luyện sức bền và phân bổ thời gian cho toàn bộ bài thi TOEIC.' : 'Luyện cả hai kỹ năng khi bạn chưa có thời gian làm đề đầy đủ.'}</p><div className="exam-selection-sections"><div><StudyIcon name="headphones" /><strong>Listening</strong><span>{selected === 'FULL' ? '100' : '50'} câu · Part 1–4</span></div><div><StudyIcon name="book" /><strong>Reading</strong><span>{selected === 'FULL' ? '100' : '50'} câu · Part 5–7</span></div></div><p className="exam-selection-note">Đồng hồ bắt đầu khi đề được tạo. Hãy chuẩn bị tai nghe và thời gian tập trung trước khi bắt đầu.</p></div>}
      </div>
      <section className="exam-selection-confirm" aria-label="Bài luyện đã chọn"><div><p className="exam-selection-eyebrow">PHIÊN LUYỆN CỦA BẠN</p><h2>{modes.find(mode => mode.type === selected)?.label}</h2><p className="exam-selection-chosen">{selected === 'CUSTOM' ? chosen.length ? chosen.map(item => `Part ${item.part}`).join(' · ') : 'Chưa chọn nội dung' : 'Listening & Reading · Part 1–7'}</p><div className="exam-selection-metrics"><span><strong>{questionCount}</strong> câu hỏi</span><span><strong>{duration}</strong> phút{selected === 'CUSTOM' ? ' ước tính' : ''}</span></div></div><div className="exam-selection-launch"><p id="exam-readiness" role="status">{readiness}</p>{catalog.error && <button className="exam-selection-retry" onClick={catalog.reload}>Thử tải lại</button>}{error && <p role="alert" className="exam-selection-error">{error}</p>}<button className="exam-selection-start" disabled={busy || !ready} aria-describedby="exam-readiness" onClick={() => void start()}>{busy ? 'Đang tạo đề…' : 'Bắt đầu làm bài'}<span aria-hidden="true">→</span></button></div></section>
    </section>
    <footer className="exam-selection-footer"><p><StudyIcon name="exam" />Lời giải mở sau khi nộp bài · Kết quả được lưu vào lịch sử.</p><span>Điểm quy đổi mang tính tham khảo.</span></footer>
  </div>;
};
