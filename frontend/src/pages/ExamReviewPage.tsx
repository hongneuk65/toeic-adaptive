import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAsyncResource } from '../hooks/useAsyncResource';
import { buildExamGroups, displayExamNumber } from '../lib/exam-navigation';
import type { ExamSession, ExamQuestion } from '../types/exam';
import { ExamStimulus } from '../components/exam/ExamStimulus';
import { AiMarkdown } from '../components/rag/AiMarkdown';
import { RagExplanationModal } from '../components/rag/RagExplanationModal';
import { formatReviewExplanation } from '../lib/review-explanation';
import '../styles/exam-room.css';
import '../styles/exam-review.css';

interface ReviewAnswer { id: number; questionId: number; selectedAnswer: string; isCorrect: boolean; question: ExamQuestion & {correctAnswer:string;explanation?:string} }
interface ReviewResponse {id:number;examType:ExamSession['examType'];selectedParts?:number[];totalScore:number;listeningScore:number;readingScore:number;answers:ReviewAnswer[]}

export function ExamReviewPage() {
  const {attemptId}=useParams();
  const load=useCallback((signal:AbortSignal)=>api<ReviewResponse>(`/exam/${attemptId}/review`,{signal}),[attemptId]);
  const {data,loading,error,reload}=useAsyncResource(load);
  if(loading) return <p role="status" className="exam-load-state">Đang tải bài chữa…</p>;
  if(!data) return <div role="alert" className="exam-load-state"><p>{error || 'Không tìm thấy bài thi.'}</p><button className="secondary-button" onClick={reload}>Thử lại</button></div>;
  return <ExamReview key={data.id} review={data}/>;
}

function ExamReview({review}:{review:ReviewResponse}) {
  const navigate=useNavigate();
  const questions=useMemo(()=>review.answers.map(answer=>answer.question),[review]);
  const groups=useMemo(()=>buildExamGroups(questions),[questions]);
  const [groupIndex,setGroupIndex]=useState(0);
  const [palette,setPalette]=useState(false);
  const [wrongOnly,setWrongOnly]=useState(false);
  const [aiQuestion,setAiQuestion]=useState<ReviewAnswer|null>(null);
  const material=useRef<HTMLElement>(null);
  const answersPane=useRef<HTMLElement>(null);
  const paletteRef=useRef<HTMLDivElement>(null);
  const paletteButton=useRef<HTMLButtonElement>(null);
  const group=groups[groupIndex];
  const question=group ? questions[group.indices[0]] : undefined;
  const correct=review.answers.filter(answer=>answer.isCorrect).length;
  const number=(index:number)=>displayExamNumber(review.examType,index,questions);
  useEffect(()=>{material.current?.scrollTo({top:0});answersPane.current?.scrollTo({top:0});},[groupIndex]);
  useEffect(()=>{
    if(!palette)return;
    const dismiss=(event:MouseEvent)=>{if(!paletteRef.current?.contains(event.target as Node)&&!paletteButton.current?.contains(event.target as Node))setPalette(false);};
    document.addEventListener('mousedown',dismiss);return()=>document.removeEventListener('mousedown',dismiss);
  },[palette]);
  const jump=(index:number)=>{const next=groups.findIndex(item=>item.indices.includes(index));if(next>=0)setGroupIndex(next);setPalette(false);paletteButton.current?.focus();};
  if(!question || !group) return <div className="exam-load-state"><p>Bài thi chưa có câu hỏi để chữa.</p><button className="secondary-button" onClick={()=>navigate('/exam')}>Chọn đề khác</button></div>;
  const blankNumbers=Object.fromEntries(group.indices.map(index=>[questions[index].stimulus?.questionPosition ?? -1,number(index)]));
  const groupLabel=group.indices.length>1?`${number(group.indices[0])}–${number(group.indices.at(-1)!)}`:String(number(group.indices[0]));
  return <div className="exam-workbench exam-review-workbench">
    <header className="exam-toolbar">
      <div className="exam-toolbar-title"><span className="exam-part-badge">CHỮA BÀI · PART {question.part}</span><span className="exam-progress"><strong>{correct}</strong> / {questions.length} đúng</span></div>
      <div className="review-score"><strong>{review.totalScore ?? 0}</strong><span>điểm tham khảo · L {review.listeningScore ?? 0} / R {review.readingScore ?? 0}</span></div>
      <button className="exam-submit" onClick={()=>navigate('/exam')}>Chọn đề khác</button>
    </header>
    <div className="exam-split">
      <section ref={material} className="exam-column exam-material-column" aria-label="Tư liệu gốc của bài thi" tabIndex={0}>
        <div className="exam-column-heading"><h2>{question.part<=4?'Listening':'Reading'}</h2><span>Câu {groupLabel} · bôi đen để tra từ</span></div>
        <div className="exam-material-body space-y-5">
          {question.audioUrl && <div className="review-audio"><p>Nghe lại audio của nhóm câu</p><audio key={question.audioUrl} src={question.audioUrl} controls preload="metadata" className="w-full" aria-label={`Audio câu ${groupLabel}`}/></div>}
          <ExamStimulus question={question} blankNumbers={blankNumbers}/>
          {question.part===2 && <p className="text-sm text-ink-medium">Lời thoại và các phương án được hiển thị bên phải để đối chiếu sau khi nộp bài.</p>}
        </div>
      </section>
      <section ref={answersPane} className="exam-column exam-questions-column" aria-label="Đáp án và giải thích" tabIndex={0}>
        <div className="exam-column-heading"><h2>Đối chiếu đáp án</h2><span>Xanh: đáp án đúng · đỏ: lựa chọn sai</span></div>
        <div className="exam-question-list">{group.indices.map(index=>{
          const answer=review.answers[index];const q=answer.question;
          return <article key={answer.id} className="exam-question-block" aria-label={`Chữa câu ${number(index)}`}>
            <div className="review-question-heading"><h3>Câu {number(index)}</h3><span className={`review-state ${answer.isCorrect?'correct':answer.selectedAnswer?'incorrect':'unanswered'}`}>{answer.isCorrect?'Đúng':answer.selectedAnswer?'Chưa đúng':'Chưa trả lời'}</span></div>
            {q.content && <p className="exam-question-content">{q.content}</p>}
            <div className="exam-options">{(['A','B','C','D'] as const).filter(option=>!(q.part===2&&option==='D')).map(option=>{
              const text=q[`option${option}`];if(!text?.trim())return null;
              const isCorrect=q.correctAnswer===option;const picked=answer.selectedAnswer===option;
              return <div key={option} className={`exam-option review-option ${isCorrect?'correct':picked?'incorrect':''}`}><span className="exam-option-letter">{option}</span><div className="min-w-0"><p>{text}</p>{(isCorrect||picked)&&<span className="review-option-label">{isCorrect?'Đáp án đúng':''}{isCorrect&&picked?' · ':''}{picked?'Bạn đã chọn':''}</span>}</div></div>;
            })}</div>
            <section className="review-explanation" aria-label={`Giải thích câu ${number(index)}`}><h4>Giải thích</h4>{q.explanation?.trim()?<AiMarkdown content={formatReviewExplanation(q.explanation)}/>:<p>Chưa có lời giải cho câu này. Bạn có thể yêu cầu AI hỗ trợ.</p>}</section>
            <button className="secondary-button" onClick={()=>setAiQuestion(answer)}>Giải thích thêm bằng AI</button>
          </article>;
        })}</div>
      </section>
    </div>
    <footer className="exam-footer">
      <button className="exam-nav-button" disabled={groupIndex===0} onClick={()=>setGroupIndex(value=>value-1)}>Nhóm trước</button>
      <div className="review-palette-container" ref={paletteRef} onKeyDown={event=>{if(event.key==='Escape'){setPalette(false);paletteButton.current?.focus();}}}>
        <button ref={paletteButton} className="exam-palette-trigger" aria-expanded={palette} aria-controls="review-question-palette" onClick={()=>setPalette(value=>!value)}>Danh sách câu <span>{groupLabel}</span></button>
        {palette&&<div id="review-question-palette" className="exam-palette"><div className="review-palette-heading"><strong>Đi đến câu hỏi</strong><button aria-label="Đóng danh sách câu" onClick={()=>{setPalette(false);paletteButton.current?.focus();}}>×</button></div><label className="review-filter"><input type="checkbox" checked={wrongOnly} onChange={event=>setWrongOnly(event.target.checked)}/>Chỉ câu sai / chưa trả lời</label><div className="exam-palette-grid">{review.answers.map((answer,index)=>(!wrongOnly||!answer.isCorrect)&&<button key={answer.id} aria-label={`Câu ${number(index)}, ${answer.isCorrect?'đúng':answer.selectedAnswer?'sai':'chưa trả lời'}`} aria-current={group.indices.includes(index)?'true':undefined} className={`review-palette-item ${answer.isCorrect?'correct':answer.selectedAnswer?'incorrect':'unanswered'}`} onClick={()=>jump(index)}>{number(index)}</button>)}</div>{wrongOnly&&correct===questions.length&&<p className="text-sm">Bạn đã trả lời đúng tất cả câu.</p>}</div>}
      </div>
      <button className="exam-nav-button" disabled={groupIndex===groups.length-1} onClick={()=>setGroupIndex(value=>value+1)}>Nhóm tiếp</button>
    </footer>
    {aiQuestion&&<RagExplanationModal isOpen attemptId={review.id} questionId={aiQuestion.questionId} selectedAnswer={aiQuestion.selectedAnswer||'CHƯA_CHỌN'} onClose={()=>setAiQuestion(null)}/>}
  </div>;
}
