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
import { StudyIcon } from '../components/StudyIcon';
import '../styles/forum-home.css';
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
  const stats = [...(reading ? [{ label: 'Bài đọc đã nộp', value: completed.length }] : []), ...(listening ? [{ label: 'Phiên nghe đã lưu', value: listening.sessions.length }] : []), ...(mastery ? [{ label: 'Kỹ năng đã luyện', value: practiced.length }] : [])];
  return <div className="forum-home">
    <section className="forum-hero" aria-labelledby="forum-hero-title">
      <div className="forum-hero-copy">
        <h1 id="forum-hero-title"><span className="forum-hero-wordmark">TOEIC<sup>™</sup></span><span className="forum-hero-sub">Adaptive Learning<span className="forum-hero-bubble" aria-hidden="true" /></span></h1>
        <p className="forum-hero-alert"><span aria-hidden="true">🔔</span> Học đúng điểm yếu, tiến bộ mỗi ngày</p>
        <p className="forum-hero-kicker">Lộ trình luyện thi TOEIC thích ứng</p>
        <div className="forum-hero-actions">
          <Link to={curriculum?.enrollment ? '/curriculum' : '/recommendations'} className="primary-button forum-hero-cta">{learningActionLabel(learningStatus)} <span aria-hidden="true">→</span></Link>
          <Link to="/placement" className="forum-hero-link">Kiểm tra trình độ</Link>
        </div>
        {learningStatusError && <p role="status" className="forum-hero-status">Chưa tải được trạng thái học. <button onClick={refreshLearningStatus}>Thử lại</button></p>}
      </div>
      <div className="forum-hero-stage">
        <div className="forum-hero-blob">
          <HomeProgress hasLearningActivity={learningStatus?.hasLearningActivity} refreshing={resource.loading} loading={resource.loading && !resource.data} error={Boolean(resource.error || resource.data?.partial)} onRetry={resource.reload} resumes={resumes} nextSkill={nextSkill ? `${nextSkill.skillName} (Part ${nextSkill.part})` : undefined} stats={stats} />
        </div>
        <div className="forum-hero-badge" aria-hidden="true"><strong>990</strong><span>TOEIC</span></div>
      </div>
    </section>

    <section className="forum-section" aria-labelledby="forum-diff-title">
      <h2 id="forum-diff-title" className="forum-section-title"><span className="forum-spark" aria-hidden="true" />Điểm khác biệt chỉ có tại<br />TOEIC Adaptive</h2>
      <div className="forum-feature-grid">
        <article className="forum-feature forum-feature-slate"><span className="forum-feature-icon"><StudyIcon name="layers" /></span><h3>Lộ trình thích ứng</h3><p>Hệ thống ước lượng mức độ thành thạo theo từng kỹ năng và Part, rồi sắp xếp bài học tiếp theo đúng chỗ bạn còn yếu. Không học lại thứ đã vững.</p></article>
        <article className="forum-feature forum-feature-beige"><span className="forum-feature-icon"><StudyIcon name="headphones" /></span><h3>Linh hoạt tối đa về thời gian</h3><p>Mỗi bài đọc, đoạn nghe hay bộ từ vựng đều được lưu lại vị trí. Học vài phút giữa giờ hay cả buổi tối, bạn luôn tiếp tục đúng chỗ đã dừng.</p></article>
        <article className="forum-feature forum-feature-rose"><span className="forum-feature-icon"><StudyIcon name="exam" /></span><h3>Gia sư AI theo ngữ cảnh</h3><p>Hỏi ngay trên câu đang làm: gia sư đọc đề, đáp án và lời giải để giải thích vì sao đúng, vì sao sai, kèm từ vựng cần nhớ.</p></article>
      </div>
    </section>

    <HomePrograms />

    <footer className="forum-footer" aria-label="Chân trang">
      <div className="forum-footer-main">
        <div className="forum-footer-identity"><Link to="/dashboard" className="app-brand forum-footer-brand" aria-label="TOEIC Adaptive"><span className="app-brand-mark" aria-hidden="true">TOEIC</span><span className="app-brand-name" aria-hidden="true">ADAPTIVE</span></Link><p>Học theo mục tiêu. Ôn theo tiến độ của bạn.</p></div>
        <nav aria-label="Luyện tập"><h2>Luyện tập</h2><ul><li><Link to="/reading">Luyện đọc</Link></li><li><Link to="/listening">Luyện nghe</Link></li><li><Link to="/exam">Thi thử</Link></li></ul></nav>
        <nav aria-label="Học và ôn tập"><h2>Học và ôn tập</h2><ul><li><Link to="/curriculum">Lộ trình học</Link></li><li><Link to="/theory">Kiến thức</Link></li><li><Link to="/flashcards">Từ vựng</Link></li><li><Link to="/recommendations">Gợi ý học tiếp</Link></li></ul></nav>
      </div>
      <div className="forum-footer-bottom"><small>© {new Date().getFullYear()} TOEIC Adaptive</small><span>Không liên kết với hoặc được ETS chứng nhận.</span></div>
    </footer>
  </div>;
};
