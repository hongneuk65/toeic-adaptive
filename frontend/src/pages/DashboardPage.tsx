import { Link } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';

const activities = [
  { path: '/flashcards', label: 'Từ vựng', description: 'Ôn từ theo chủ đề với flashcard và phát âm.', symbol: 'Aa' },
  { path: '/theory', label: 'Lý thuyết', description: 'Củng cố kiến thức và kiểm tra qua bài quiz.', symbol: '01' },
  { path: '/exam', label: 'Thi thử', description: 'Luyện đề đầy đủ hoặc tập trung vào Part 5.', symbol: '07' },
];

export const DashboardPage = () => (
  <div className="space-y-8">
    <PageHeader title="Hôm nay bạn muốn học gì?" description="Chọn một hoạt động để tiếp tục luyện TOEIC theo nhịp của bạn." />
    <section className="study-note flex flex-col justify-between gap-6 p-6 sm:p-8 md:flex-row md:items-center">
      <div className="max-w-xl">
        <p className="mb-3 text-xs font-semibold tracking-wide text-accent-coral">GHI CHÚ HỌC TẬP</p>
        <h2 className="text-xl font-semibold tracking-tight text-ink-dark sm:text-2xl">Bắt đầu từ kỹ năng cần cải thiện</h2>
        <p className="mt-3 text-sm leading-6 text-ink-medium">Xem gợi ý từ lịch sử làm bài và chọn bài luyện phù hợp với trình độ hiện tại.</p>
      </div>
      <Link to="/recommendations" className="primary-button shrink-0">Xem gợi ý học tập</Link>
    </section>
    <section aria-label="Hoạt động học tập" className="grid gap-4 md:grid-cols-3">
      {activities.map((activity) => (
        <Link key={activity.path} to={activity.path} className="paper-card interactive-card group border border-paper-kraft p-6">
          <span className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl bg-paper-cream text-sm font-semibold text-accent-navy">{activity.symbol}</span>
          <h2 className="text-lg font-semibold text-ink-dark">{activity.label}</h2>
          <p className="mt-2 min-h-12 text-sm leading-6 text-ink-medium">{activity.description}</p>
          <span className="mt-6 inline-block text-sm font-medium text-accent-coral">Bắt đầu</span>
        </Link>
      ))}
    </section>
    <p className="text-sm text-ink-light">Sau mỗi bài luyện, vào Gợi ý để xem kỹ năng và lựa chọn bước học tiếp theo.</p>
  </div>
);
