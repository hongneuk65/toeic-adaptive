import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { FlashcardFoldersPage } from './pages/FlashcardFoldersPage';
import { FlashcardStudyPage } from './pages/FlashcardStudyPage';
import { TheoryReadingPage } from './pages/TheoryReadingPage';
import { TheoryQuizPage } from './pages/TheoryQuizPage';
import { ExamListPage } from './pages/ExamListPage';
import { ExamRoomPage } from './pages/ExamRoomPage';
import { ExamReviewPage } from './pages/ExamReviewPage';

const PaperNavbar: React.FC = () => {
  const { logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { label: 'BẢNG ĐIỀU KHIỂN', path: '/dashboard' },
    { label: 'THƯ MỤC FLASHCARD', path: '/flashcards' },
    { label: 'LÝ THUYẾT', path: '/theory' },
    { label: 'THI THỬ', path: '/exam' },
  ];

  return (
    <header className="w-full bg-paper-white border-b-2 border-paper-kraft shadow-paper-subtle sticky top-0 z-30">
      <div className="w-full px-6 lg:px-12 h-16 flex items-center justify-between">
        <div className="flex items-center gap-10">
          <span className="font-display text-3xl font-bold tracking-tight text-ink-dark border-r-2 border-paper-kraft pr-6">
            TOEIC ADAPTIVE
          </span>

          <nav className="flex items-center gap-2">
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-4 py-1.5 font-hand text-lg font-bold rounded-sm transition ${isActive
                    ? 'bg-paper-kraft-light/50 text-ink-dark border-b-2 border-accent-coral shadow-sm'
                    : 'text-ink-medium hover:text-ink-dark hover:bg-paper-cream'
                    }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-6">
          <span className="font-mono text-xs text-ink-light tracking-widest uppercase">
            HỆ THỐNG LUYỆN THI
          </span>
          <button
            onClick={logout}
            className="px-3 py-1 bg-paper-rose/80 border border-accent-coral/30 text-accent-coral font-hand text-base font-bold rounded hover:bg-paper-rose transition"
          >
            ĐĂNG XUẤT
          </button>
        </div>
      </div>
    </header>
  );
};

const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col w-full">
      <PaperNavbar />
      <main className="flex-1 w-full px-6 lg:px-12 py-8">
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
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
