import { useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAsyncResource } from '../hooks/useAsyncResource';
import type { ReadingCatalog } from '../types/reading';
import type { ListeningCatalog } from '../types/listening';
import type { UserMasteryProfile } from '../types/mastery';

import { HomePrograms } from '../components/home/HomePrograms';
import { HomeJourney, HomeTechnology } from '../components/home/HomeJourney';
import { HomeProgress } from '../components/home/HomeProgress';
import { DuckMascot } from '../components/mascot/DuckMascot';
import { HomeAtmosphere } from '../components/home/HomeAtmosphere';
import '../prep-home.css';
export const DashboardPage = () => {
  const homeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = homeRef.current;
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('marketing-revealed');
        observer.unobserve(entry.target);
      });
    }, { threshold: .12 });
    root.querySelectorAll('.prep-home-heading,.prep-home-product-preview,.prep-home-final-cta').forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, []);
  const resource = useAsyncResource(useCallback(async (signal: AbortSignal) => {
    const results = await Promise.allSettled([
      api<ReadingCatalog>('/reading', { signal }),
      api<ListeningCatalog>('/listening', { signal }),
      api<UserMasteryProfile>('/mastery/me', { signal }),
    ]);
    return {
      reading: results[0].status === 'fulfilled' ? results[0].value : undefined,
      listening: results[1].status === 'fulfilled' ? results[1].value : undefined,
      mastery: results[2].status === 'fulfilled' ? results[2].value : undefined,
      partial: results.some(result => result.status === 'rejected'),
    };
  }, []));
  const { reading, listening, mastery } = resource.data || {};
  const ongoing = reading?.attempts.filter(attempt => !attempt.submittedAt) || [];
  const resumes = [
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
  return <div ref={homeRef} className="prep-home">
    <section className="prep-home-hero" aria-labelledby="prep-home-title">
      <HomeAtmosphere />
      <div className="home-space-props" aria-hidden="true">
        <svg className="home-satellite" viewBox="0 0 180 120" fill="none"><path d="m69 58-25-18m66 34 25 18" stroke="#B7D5F6" strokeWidth="5" /><path d="m9 30 36-15 23 43-36 15Zm104 38 36-15 23 43-36 15Z" fill="#284E8C" stroke="#82B9E8" strokeWidth="2" /><path d="m21 25 23 43m-1-51 23 43M125 63l23 43m-1-51 23 43M20 51l36-15m68 52 36-15" stroke="#82B9E8" /><rect x="70" y="39" width="41" height="43" rx="8" fill="#DAE9FA" /><path d="m91 39 6-18m-2 1 11 4" stroke="#DAE9FA" strokeWidth="3" /><circle cx="91" cy="60" r="8" fill="#71BCEB" /></svg>
        <svg className="home-distant-planet" viewBox="0 0 160 160" fill="none"><circle cx="80" cy="80" r="55" fill="#5B639D" /><path d="M35 49c24 18 54 22 89 19M27 75c33 20 68 24 106 17M42 111c23 8 45 10 70 6" stroke="#A4B5DF" strokeWidth="10" opacity=".4" /><path d="M105 32c19 39 6 76-34 101a55 55 0 0 0 34-101Z" fill="#111E46" opacity=".45" /></svg>
      </div>
      <div className="prep-home-hero-content"><p className="home-cosmic-eyebrow"><span aria-hidden="true" />TOEIC ADAPTIVE · KHÁM PHÁ TRI THỨC</p><h1 id="prep-home-title">Học TOEIC<br />theo cách<br /><span>của bạn.</span></h1>
        <div className="home-discover-dock"><div className="home-astronaut-holder"><DuckMascot astronaut label="Chú vịt phi hành gia bám vào nút khám phá" /></div><a href="#programs" className="prep-home-hero-cta">Khám phá ngay</a></div>
      </div>
      <a className="home-scroll-cue" href="#learning-progress">Tiếp nối hành trình <span aria-hidden="true">↓</span></a>
    </section>
    <HomeProgress refreshing={resource.loading} loading={resource.loading && !resource.data} error={Boolean(resource.error || resource.data?.partial)} onRetry={resource.reload} resumes={resumes} nextSkill={nextSkill ? `${nextSkill.skillName} (Part ${nextSkill.part})` : undefined} stats={[...(reading ? [{ label: 'Bài Reading đã nộp', value: completed.length }] : []), ...(listening ? [{ label: 'Phiên Listening đã lưu', value: listening.sessions.length }] : []), ...(mastery ? [{ label: 'Kỹ năng đã luyện', value: practiced.length }] : [])]} />
    <HomePrograms />
    <HomeTechnology />
    <HomeJourney />
    <section className="prep-home-final-cta"><h2>Buổi học tiếp theo<br />bắt đầu từ đây.</h2><p>Chọn một nội dung và dành thời gian cho mục tiêu TOEIC của bạn.</p><Link to="/reading" className="prep-home-white-button">Bắt đầu luyện tập</Link></section>
    <footer className="prep-home-footer"><div><Link to="/dashboard" className="prep-home-footer-brand">TOEIC Adaptive</Link><p>Không gian luyện TOEIC theo nhịp của bạn.</p></div><nav aria-label="Nội dung học"><h2>Luyện tập</h2><Link to="/reading">Luyện đọc</Link><Link to="/listening">Luyện nghe</Link><Link to="/exam">Thi thử</Link></nav><nav aria-label="Ôn tập"><h2>Ôn tập</h2><Link to="/theory">Kiến thức</Link><Link to="/flashcards">Từ vựng</Link><Link to="/recommendations">Gợi ý học tiếp</Link></nav></footer>
  </div>;
};


