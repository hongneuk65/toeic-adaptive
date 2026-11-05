import { learningActionLabel, useLearningStatus } from '../components/onboarding/useLearningStatus';
import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAsyncResource } from '../hooks/useAsyncResource';
import type { ReadingCatalog } from '../types/reading';
import type { ListeningCatalog } from '../types/listening';
import type { UserMasteryProfile } from '../types/mastery';
import type { CurriculumOverview } from '../types/curriculum';

import { HomePrograms } from '../components/home/HomePrograms';
import { HomeProgress } from '../components/home/HomeProgress';
import '../prep-home.css';
import '../styles/home-studio.css';
export const DashboardPage = () => {
  const { status: learningStatus, error: learningStatusError, refresh: refreshLearningStatus } = useLearningStatus();
  const resource = useAsyncResource(useCallback(async (signal: AbortSignal) => {
    const results = await Promise.allSettled([
      api<ReadingCatalog>('/reading', { signal }),
      api<ListeningCatalog>('/listening', { signal }),
      api<UserMasteryProfile>('/mastery/me', { signal }),
      api<CurriculumOverview>('/curriculum', { signal }),
    ]);
    return {
      reading: results[0].status === 'fulfilled' ? results[0].value : undefined,
      listening: results[1].status === 'fulfilled' ? results[1].value : undefined,
      mastery: results[2].status === 'fulfilled' ? results[2].value : undefined,
      curriculum: results[3].status === 'fulfilled' && Array.isArray(results[3].value.tracks) ? results[3].value : undefined,
      partial: results.some(result => result.status === 'rejected'),
    };
  }, []));
  const { reading, listening, mastery, curriculum } = resource.data || {};
  const ongoing = reading?.attempts.filter(attempt => !attempt.submittedAt) || [];
  const courseNext = curriculum?.enrollment ? curriculum.today[0] : undefined;
  const resumes = [
    ...(courseNext ? [{key: `curriculum-${courseNext.id}`, path: `/curriculum?unit=${encodeURIComponent(courseNext.id)}`, title: courseNext.title, detail: courseNext.reason === 'review' ? 'Lộ trình · đến hạn ôn' : 'Lộ trình · bài tiếp theo'}] : []),
    ...ongoing.slice(0, 2).map(attempt => ({
      key: `reading-${attempt.id}`, path: `/reading?attempt=${attempt.id}`,
      title: reading?.articles.find(article => article.version?.id === attempt.versionId)?.title || 'Bài đọc đang học',
      detail: `Reading · đang ở câu ${attempt.currentIndex + 1}`,
    })),
    ...(listening?.sessions.slice(0, 2).map(session => ({
      key: `listening-${session.id}`, path: `/listening?session=${session.id}`,
      title: session.source.title, detail: `Listening · đoạn ${Math.floor(session.start)}–${Math.floor(session.end)} giây`,
    })) || []),
  ];
  const practiced = mastery?.skills.filter(skill => skill.practiceCount > 0) || [];
  const nextSkill = [...practiced].sort((a, b) => a.masteryScore - b.masteryScore)[0];
  const completed = reading?.attempts.filter(attempt => attempt.submittedAt) || [];
  return <div className="prep-home home-studio">
    <section className="prep-home-hero" aria-labelledby="prep-home-title">
      <div className="prep-home-hero-content">
        <div className="home-studio-welcome">
          <p className="home-studio-eyebrow">KHÔNG GIAN HỌC CỦA BẠN</p>
          <h1 id="prep-home-title">Học TOEIC,<br /><span>theo nhịp của bạn.</span></h1>
          <div className="home-discover-dock"><Link to={curriculum?.enrollment ? '/curriculum' : '/recommendations'} className="prep-home-hero-cta">{learningActionLabel(learningStatus)}</Link></div>
          {learningStatusError && <p role="status" className="home-studio-status">Chưa tải được trạng thái học. <button onClick={refreshLearningStatus}>Thử lại</button></p>}
        </div>
        <HomeProgress hasLearningActivity={learningStatus?.hasLearningActivity} refreshing={resource.loading} loading={resource.loading && !resource.data} error={Boolean(resource.error || resource.data?.partial)} onRetry={resource.reload} resumes={resumes} nextSkill={nextSkill ? `${nextSkill.skillName} (Part ${nextSkill.part})` : undefined} stats={[...(reading ? [{ label: 'Bài đọc đã nộp', value: completed.length }] : []), ...(listening ? [{ label: 'Phiên nghe đã lưu', value: listening.sessions.length }] : []), ...(mastery ? [{ label: 'Kỹ năng đã luyện', value: practiced.length }] : [])]} />
      </div>
    </section>
    <HomePrograms />
    <footer className="prep-home-footer study-footer" aria-label="Chân trang">
      <div className="study-footer-main">
        <div className="study-footer-identity"><Link to="/dashboard" className="prep-home-footer-brand"><span className="study-footer-mark" aria-hidden="true">TA</span>TOEIC Adaptive</Link><p>Học theo mục tiêu. Ôn theo tiến độ của bạn.</p></div>
        <nav aria-label="Luyện tập"><h2>Luyện tập</h2><ul><li><Link to="/reading">Luyện đọc</Link></li><li><Link to="/listening">Luyện nghe</Link></li><li><Link to="/exam">Thi thử</Link></li></ul></nav>
        <nav aria-label="Học và ôn tập"><h2>Học và ôn tập</h2><ul><li><Link to="/curriculum">Lộ trình học</Link></li><li><Link to="/theory">Kiến thức</Link></li><li><Link to="/flashcards">Từ vựng</Link></li><li><Link to="/recommendations">Gợi ý học tiếp</Link></li></ul></nav>
      </div>
      <div className="study-footer-bottom"><small>© {new Date().getFullYear()} TOEIC Adaptive</small><span>Không liên kết với hoặc được ETS chứng nhận.</span></div>
    </footer>
  </div>;
};


