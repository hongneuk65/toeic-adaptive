import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getErrorMessage } from '../lib/api';
import type { ExamSession } from '../types/exam';
import { PageHeader } from '../components/ui/PageHeader';

export const ExamListPage: React.FC = () => {
  const [loadingType, setLoadingType] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleStartExam = async (examType: 'FULL' | 'MINI' | 'PART_5') => {
    setLoadingType(examType);
    try {
      const data = await api<ExamSession>('/exam/start', {
        method: 'POST',
        data: { examType },
      });
      navigate(`/exam/${data.attemptId}`);
    } catch (err) {
      alert(getErrorMessage(err, 'Lỗi khởi tạo đề thi'));
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <div className="w-full space-y-4">
      <PageHeader
        eyebrow="Mô phỏng phòng thi chuẩn ETS"
        title="Hệ thống thi thử TOEIC"
        description="Ghi nhận thời gian thực và đo lường độ chính xác theo từng nhóm câu hỏi."
      />

      <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-3">
        {/* Full Test */}
        <div className="interactive-card relative flex min-h-[280px] flex-col justify-between rounded-xl border border-paper-kraft/70 bg-paper-white p-5 shadow-paper-subtle">
          <div className="staple top-3 left-4" />
          <div>
            <span className="font-mono text-xs font-bold text-slate-700 bg-paper-cream px-2 py-0.5 border border-paper-kraft">
              Đề đầy đủ
            </span>
            <h2 className="mt-3 font-display text-2xl font-semibold text-ink-dark">Full Test</h2>
            <div className="space-y-1 mt-4 text-sm font-body text-ink-medium">
              <p>• Quy mô: 200 câu hỏi (100 Listening, 100 Reading)</p>
              <p>• Thời lượng: 120 phút liên tục</p>
              <p>• Đánh giá áp lực làm bài thực tế</p>
            </div>
          </div>
          <button
            onClick={() => handleStartExam('FULL')}
            disabled={!!loadingType}
            className="w-full rounded bg-slate-900 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {loadingType === 'FULL' ? 'Đang tải đề thi...' : 'Bắt đầu Full Test'}
          </button>
        </div>

        {/* Mini Test */}
        <div className="interactive-card relative flex min-h-[280px] flex-col justify-between rounded-xl border border-paper-kraft/70 bg-paper-white p-5 shadow-paper-subtle">
          <div className="staple top-3 left-4" />
          <div>
            <span className="font-mono text-xs font-bold text-slate-700 bg-paper-cream px-2 py-0.5 border border-paper-kraft">
              Đề rút gọn
            </span>
            <h2 className="mt-3 font-display text-2xl font-semibold text-ink-dark">Mini Test</h2>
            <div className="space-y-1 mt-4 text-sm font-body text-ink-medium">
              <p>• Quy mô: 100 câu hỏi tổng hợp</p>
              <p>• Thời lượng: 60 phút</p>
              <p>• Kiểm tra nhanh trình độ giữa kỳ</p>
            </div>
          </div>
          <button
            onClick={() => handleStartExam('MINI')}
            disabled={!!loadingType}
            className="w-full rounded bg-slate-900 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {loadingType === 'MINI' ? 'Đang tải đề thi...' : 'Bắt đầu Mini Test'}
          </button>
        </div>

        {/* Part 5 */}
        <div className="interactive-card relative flex min-h-[280px] flex-col justify-between rounded-xl border border-paper-kraft/70 bg-paper-white p-5 shadow-paper-subtle">
          <div className="staple top-3 left-4" />
          <div>
            <span className="font-mono text-xs font-bold text-slate-700 bg-paper-cream px-2 py-0.5 border border-paper-kraft">
              Luyện chuyên sâu
            </span>
            <h2 className="mt-3 font-display text-2xl font-semibold text-ink-dark">Part 5 Test</h2>
            <div className="space-y-1 mt-4 text-sm font-body text-ink-medium">
              <p>• Quy mô: 30 câu trắc nghiệm ngữ pháp & từ vựng</p>
              <p>• Thời lượng: 20 phút</p>
              <p>• Rèn phản xạ hoàn thành câu nhanh</p>
            </div>
          </div>
          <button
            onClick={() => handleStartExam('PART_5')}
            disabled={!!loadingType}
            className="w-full rounded bg-slate-900 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {loadingType === 'PART_5' ? 'Đang tải đề thi...' : 'Bắt đầu Part 5'}
          </button>
        </div>
      </div>
    </div>
  );
};