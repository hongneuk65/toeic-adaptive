import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { useAuth } from './auth/useAuth';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { RecommendationsPage } from './pages/RecommendationsPage';
import { FlashcardFoldersPage } from './pages/FlashcardFoldersPage';
import { FlashcardStudyPage } from './pages/FlashcardStudyPage';
import { TheoryReadingPage } from './pages/TheoryReadingPage';
import { TheoryQuizPage } from './pages/TheoryQuizPage';
import { ExamListPage } from './pages/ExamListPage';
import { ExamRoomPage } from './pages/ExamRoomPage';
import { ExamReviewPage } from './pages/ExamReviewPage';
import { AiTutorFloatingButton } from './components/rag/AiTutorFloatingButton';
import { AiTutorDrawer } from './components/rag/AiTutorDrawer';
import { ListeningPage } from './pages/ListeningPage';
import { ReadingPage } from './pages/ReadingPage';

const navItems = [
  { label: 'Trang chủ', path: '/dashboard' },
  { label: 'Gợi ý', path: '/recommendations' },
  { label: 'Flashcard', path: '/flashcards' },
  { label: 'Lý thuyết', path: '/theory' },
  { label: 'Listening', path: '/listening' },
  { label: 'Reading', path: '/reading' },
  { label: 'Thi thử', path: '/exam' },
];

const PaperNavbar: React.FC = () => {
  const { logout } = useAuth();
  const location = useLocation();

  return (
    <header className="sticky top-0 z-30 w-full border-b border-paper-kraft/70 bg-paper-white/95 shadow-paper-subtle backdrop-blur">
      <div className="mx-auto flex min-h-16 w-full max-w-[1280px] items-center justify-between gap-4 px-4 py-2 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <Link to="/dashboard" className="flex shrink-0 items-center gap-2 font-display text-base font-semibold tracking-tight text-ink-dark">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-coral text-xs font-bold text-white">TA</span>
            TOEIC Adaptive
          </Link>

          <nav aria-label="Điều hướng chính" className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-current={isActive ? 'page' : undefined}
                  className={`study-nav rounded-md px-3 py-2 text-sm font-semibold transition ${isActive
                    ? 'bg-paper-cream text-accent-coral'
                    : 'text-ink-medium hover:bg-paper-cream hover:text-ink-dark'
                    }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={logout}
            className="rounded-lg px-3 py-2 text-sm font-medium text-ink-medium transition hover:bg-paper-cream"
          >
            Đăng xuất
          </button>
        </div>
      </div>
      <nav aria-label="Điều hướng di động" className="flex gap-1 overflow-x-auto border-t border-paper-kraft/30 px-4 py-2 md:hidden">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            aria-current={location.pathname.startsWith(item.path) ? 'page' : undefined}
            className={`study-nav shrink-0 rounded-md px-3 py-1.5 text-sm font-semibold ${location.pathname.startsWith(item.path)
              ? 'bg-paper-cream text-ink-dark'
              : 'text-ink-medium'
              }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
};

const AppLayout: React.FC = () => {
  const [tutorOpen, setTutorOpen] = useState(false);
  const location = useLocation();

  // Ẩn nút AI Tutor khi đang trong phòng thi tính giờ trực tiếp
  const isExamRoom = /^\/exam\/\d+$/.test(location.pathname) && !location.pathname.includes('/review');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col w-full">
      <PaperNavbar />
      <main key={location.pathname} className={`page-enter app-content flex-1 px-4 py-8 sm:px-6 lg:px-8 ${location.pathname === '/recommendations' ? 'app-content-wide' : ''}`}>
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/recommendations" element={<RecommendationsPage />} />
          <Route path="/listening" element={<ListeningPage />} />
          <Route path="/reading" element={<ReadingPage />} />
          <Route path="/flashcards" element={<FlashcardFoldersPage />} />
          <Route path="/flashcards/:topic" element={<FlashcardStudyPage />} />
          <Route path="/theory" element={<TheoryReadingPage />} />
          <Route path="/theory/:lessonId/quiz" element={<TheoryQuizPage />} />
          <Route path="/exam" element={<ExamListPage />} />
          <Route path="/exam/:attemptId" element={<ExamRoomPage />} />
          <Route path="/exam/:attemptId/review" element={<ExamReviewPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>

      {!isExamRoom && !location.pathname.startsWith('/reading') && (
        <>
          <AiTutorFloatingButton
            isOpen={tutorOpen}
            onClick={() => setTutorOpen(true)}
          />
          <AiTutorDrawer
            isOpen={tutorOpen}
            onClose={() => setTutorOpen(false)}
          />
        </>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/*" element={<AppLayout />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
