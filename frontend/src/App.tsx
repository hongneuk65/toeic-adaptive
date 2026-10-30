import './styles/study-shell.css';
import './styles/learning-workspace.css';
import './styles/section-experiences.css';
import { RouteErrorBoundary } from './components/ui/RouteErrorBoundary';
const HistoryPage = lazy(() => import('./pages/HistoryPage').then(module => ({ default: module.HistoryPage })));
import { lazy, memo, Suspense, useEffect, useRef, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { useAuth } from './auth/useAuth';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
const RecommendationsPage = lazy(() => import('./pages/RecommendationsPage').then(module => ({ default: module.RecommendationsPage })));
const FlashcardFoldersPage = lazy(() => import('./pages/FlashcardFoldersPage').then(module => ({ default: module.FlashcardFoldersPage })));
const FlashcardStudyPage = lazy(() => import('./pages/FlashcardStudyPage').then(module => ({ default: module.FlashcardStudyPage })));
const TheoryReadingPage = lazy(() => import('./pages/TheoryReadingPage').then(module => ({ default: module.TheoryReadingPage })));
const TheoryQuizPage = lazy(() => import('./pages/TheoryQuizPage').then(module => ({ default: module.TheoryQuizPage })));
const ExamListPage = lazy(() => import('./pages/ExamListPage').then(module => ({ default: module.ExamListPage })));
const PlacementPage = lazy(() => import('./pages/PlacementPage').then(module => ({ default: module.PlacementPage })));
const ExamRoomPage = lazy(() => import('./pages/ExamRoomPage').then(module => ({ default: module.ExamRoomPage })));
const ExamReviewPage = lazy(() => import('./pages/ExamReviewPage').then(module => ({ default: module.ExamReviewPage })));
import { AiTutorFloatingButton } from './components/rag/AiTutorFloatingButton';
import { AiTutorDrawer } from './components/rag/AiTutorDrawer';
const ListeningPage = lazy(() => import('./pages/ListeningPage').then(module => ({ default: module.ListeningPage })));
const ReadingPage = lazy(() => import('./pages/ReadingPage').then(module => ({ default: module.ReadingPage })));
import { useInteractiveMotion } from './components/ui/useInteractiveMotion';
import { PublicRoute } from './auth/PublicRoute';
import { LearningStatusProvider } from './components/onboarding/LearningStatusProvider';
import { OnboardingPrompt } from './components/onboarding/OnboardingPrompt';
import { learningActionLabel, useLearningStatus } from './components/onboarding/useLearningStatus';
import { SelectionVocabulary } from './components/vocabulary/SelectionVocabulary';

const AdminPage = lazy(() => import('./pages/admin/AdminPage').then(module => ({ default: module.AdminPage })));

const navigation = [
  { title: 'Luyện tập', items: [{ label: 'Reading', path: '/reading' }, { label: 'Listening', path: '/listening' }] },
  { title: 'Ôn tập', items: [{ label: 'Kiến thức', path: '/theory' }, { label: 'Từ vựng', path: '/flashcards' }, { label: 'Lịch sử làm bài', path: '/history' }] },
];
const directLinks = [{ label: 'Trang chủ', path: '/dashboard' }, { label: 'Gợi ý học', path: '/recommendations' }, { label: 'Thi thử', path: '/exam' }];

function LearningNavigation() {
  const location = useLocation();
  const navigationRef = useRef<HTMLDivElement>(null);
  const current = [...directLinks, ...navigation.flatMap(group => group.items)].find(item => location.pathname.startsWith(item.path));
  const closeNavigation = () => navigationRef.current?.querySelectorAll('details[open]').forEach(details => details.removeAttribute('open'));
  useEffect(() => {
    const root = navigationRef.current;
    root?.querySelectorAll('details[open]').forEach(details => details.removeAttribute('open'));
  }, [location.pathname]);
  useEffect(() => {
    const root = navigationRef.current;
    const dismiss = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      const openDetails = (event.target as HTMLElement).closest('details[open]') || root?.querySelector('details[open]');
      if (openDetails) {
        event.preventDefault();
        openDetails.removeAttribute('open');
        openDetails.querySelector('summary')?.focus();
      }
    };
    const outside = (event: MouseEvent) => {
      if (root && !root.contains(event.target as Node)) root.querySelectorAll('details[open]').forEach(details => details.removeAttribute('open'));
    };
    root?.addEventListener('keydown', dismiss);
    document.addEventListener('click', outside);
    return () => { root?.removeEventListener('keydown', dismiss); document.removeEventListener('click', outside); };
  }, []);
  const link = (item: { label: string; path: string }) => <Link key={item.path} to={item.path} onClick={closeNavigation} aria-current={location.pathname.startsWith(item.path) ? 'page' : undefined} className="learning-nav-link">{item.label}</Link>;
  return <div className="learning-navigation" ref={navigationRef}>
    <nav className="desktop-learning-nav" aria-label="Điều hướng học tập">
      {link(directLinks[0])}
      {navigation.map(group => <details key={group.title} name="learning-navigation-group" className="nav-dropdown" data-active={group.items.some(item => location.pathname.startsWith(item.path)) || undefined}><summary>{group.title}</summary><div className="nav-dropdown-panel">{group.items.map(link)}</div></details>)}
      {directLinks.slice(1).map(link)}
    </nav>
    <details className="mobile-learning-navigation">
      <summary className="mobile-nav-trigger"><span>{current?.label || 'Trang chủ'}</span><span>Menu</span></summary>
      <nav className="mobile-learning-nav" aria-label="Điều hướng học tập">
        {link(directLinks[0])}
        {navigation.map(group => <div key={group.title} className="mobile-nav-group"><p>{group.title}</p>{group.items.map(link)}</div>)}
        {directLinks.slice(1).map(link)}
      </nav>
    </details>
  </div>;
}

const AppNavbar = ({ focusMode }: { focusMode: boolean }) => {
  const { logout } = useAuth();
  const { status } = useLearningStatus();
  return <header className="app-header">
    <a href="#learning-main" className="skip-link">Đến nội dung học</a>
    <div className="app-header-inner">
      <div className="app-navigation-capsule">
        <Link to="/dashboard" className="app-brand"><span className="app-brand-mark" aria-hidden="true">TA</span><span>TOEIC Adaptive</span></Link>
        {!focusMode && <LearningNavigation />}
      </div>
      <div className="app-header-actions">
        {!focusMode && <Link to="/recommendations" className="app-start-action">{learningActionLabel(status)}</Link>}
        <button onClick={logout} className="app-account-action">Đăng xuất</button>
      </div>
    </div>
  </header>;
};
const LearningPages = memo(function LearningPages() {
  return (
        <Routes>
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/recommendations" element={<RecommendationsPage />} />
          <Route path="/listening" element={<ListeningPage />} />
          <Route path="/reading" element={<ReadingPage />} />
          <Route path="/flashcards" element={<FlashcardFoldersPage />} />
          <Route path="/flashcards/:topic" element={<FlashcardStudyPage />} />
          <Route path="/theory" element={<TheoryReadingPage />} />
          <Route path="/theory/:lessonId/quiz" element={<TheoryQuizPage />} />
          <Route path="/exam" element={<ExamListPage />} />
          <Route path="/placement" element={<PlacementPage />} />
          <Route path="/exam/:attemptId" element={<ExamRoomPage />} />
          <Route path="/exam/:attemptId/review" element={<ExamReviewPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
  );
});

const AppLayout: React.FC = () => {
  const [tutorOpen, setTutorOpen] = useState(false);
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const firstRoute = useRef(true);

  // Ẩn nút AI Tutor khi đang trong phòng thi tính giờ trực tiếp
  const isExamRoom = /^\/exam\/\d+$/.test(location.pathname) && !location.pathname.includes('/review');
  const isExamWorkspace = isExamRoom || /^\/exam\/\d+\/review\/?$/.test(location.pathname);
  const isPlacement = location.pathname === '/placement' || location.pathname === '/placement/';

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    if (firstRoute.current) firstRoute.current = false;
    else mainRef.current?.focus({ preventScroll: true });
  }, [location.pathname]);

  return (
    <div data-section={location.pathname.split('/')[1]} className={`min-h-screen flex flex-col w-full ${location.pathname === '/dashboard' ? 'home-layout' : ''} ${isExamWorkspace ? 'exam-room-layout' : location.pathname !== '/dashboard' ? 'study-layout' : ''}`}>
      <AppNavbar focusMode={isExamRoom} />
      <OnboardingPrompt />
      <div className="learning-shell">
      <main ref={mainRef} id="learning-main" tabIndex={-1} className="app-content">
        <RouteErrorBoundary key={location.pathname}><Suspense fallback={<p role="status" className="p-6">Đang mở trang học…</p>}><LearningPages /></Suspense></RouteErrorBoundary>
      </main></div>
      {!isExamRoom && !isPlacement && <SelectionVocabulary key={location.pathname} source={location.pathname} />}

      {!isExamRoom && !isPlacement && !location.pathname.endsWith('/review') && !location.pathname.startsWith('/reading') && (
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

function AuthenticatedLearningLayout() {
  const { user } = useAuth();
  return <LearningStatusProvider key={user?.id}><AppLayout /></LearningStatusProvider>;
}

export default function App() {
  useInteractiveMotion();
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route path="/admin/*" element={<RouteErrorBoundary><Suspense fallback={<div className="p-8" role="status">Đang mở trang quản trị…</div>}><AdminPage /></Suspense></RouteErrorBoundary>} />
            <Route path="/*" element={<AuthenticatedLearningLayout />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
