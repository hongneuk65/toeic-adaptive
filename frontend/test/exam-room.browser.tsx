// Vite-only test entry, excluded from the production entry graph.
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { ExamRoom } from '../src/pages/ExamRoomPage';
import { buildExamGroups } from '../src/lib/exam-navigation';
import { saveListeningCursor } from '../src/lib/exam-listening';
import '../src/index.css';

const fixture = await fetch('./fixtures/exam-room.json').then(r => r.json()) as import('../src/types/exam').ExamSession;
const requested = Number(new URLSearchParams(location.search).get('part') || 1);
const groups = buildExamGroups(fixture.questions).filter(g => g.part <= 4);
const attemptId = -99000 - requested;
saveListeningCursor(attemptId, { maxGroupIndex: Math.max(0, groups.findIndex(g => g.part === requested)), readingUnlocked: requested >= 5 });
createRoot(document.getElementById('root')!).render(<MemoryRouter><div className="exam-room-layout" style={{display:'flex'}}><main className="app-content"><ExamRoom exam={{ ...fixture, attemptId, examType:'FULL', startedAt:new Date().toISOString(), totalQuestions:fixture.questions.length }} /></main></div></MemoryRouter>);
