import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

interface StartExamResponse {
  attemptId: number;
  examType: string;
  totalQuestions: number;
  questions: any[];
}

export const ExamListPage: React.FC = () => {
  const [loadingType, setLoadingType] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleStartExam = async (examType: 'FULL' | 'MINI' | 'PART_5') => {
    setLoadingType(examType);
    try {
      const data = await api<StartExamResponse>('/exam/start', {
        method: 'POST',
        data: { examType },
      });
      sessionStorage.setItem(`exam_${data.attemptId}`, JSON.stringify(data));
      navigate(`/exam/${data.attemptId}`);
    } catch (err: any) {
      alert(err.message || 'Lỗi khởi tạo đề thi');
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="w-full bg-paper-white p-6 border-2 border-paper-kraft shadow-paper-subtle rounded-sm">
        <span className="font-mono text-xs font-bold text-accent-coral tracking-widest uppercase">
          MÔ PHỎNG PHÒNG THI CHUẨN ETS
        </span>
        <h1 className="font-display text-4xl font-bold text-ink-dark mt-1">
          Hệ Thống Thi Thử TOEIC
        </h1>
        <p className="font-body text-xs text-ink-medium mt-1">
          Hệ thống ghi nhận thời gian thực và đo lường độ chính xác theo từng nhóm câu hỏi.
        </p>
      </div>

      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Full Test */}
        <div className="bg-paper-white p-8 border-2 border-paper-kraft rounded-sm shadow-paper-subtle flex flex-col justify-between min-h-[300px] relative">
          <div className="staple top-3 left-4" />
          <div>
            <span className="font-mono text-xs font-bold text-slate-700 bg-paper-cream px-2 py-0.5 border border-paper-kraft">
              ĐỀ THI CHUẨN 100%
            </span>
            <h2 className="font-display text-4xl font-bold text-ink-dark mt-4">Full Test</h2>
            <div className="space-y-1 mt-4 text-xs font-body text-ink-medium">
              <p>• Quy mô: 200 câu hỏi (100 Listening, 100 Reading)</p>
              <p>• Thời lượng: 120 phút liên tục</p>
              <p>• Đánh giá áp lực làm bài thực tế</p>
            </div>
          </div>
          <button
            onClick={() => handleStartExam('FULL')}
            disabled={!!loadingType}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-body text-sm font-bold rounded transition disabled:opacity-50"
          >
            {loadingType === 'FULL' ? 'Đang tải đề thi...' : 'BẮT ĐẦU THI FULL TEST'}
          </button>
        </div>

        {/* Mini Test */}
        <div className="bg-paper-white p-8 border-2 border-paper-kraft rounded-sm shadow-paper-subtle flex flex-col justify-between min-h-[300px] relative">
          <div className="staple top-3 left-4" />
          <div>
            <span className="font-mono text-xs font-bold text-slate-700 bg-paper-cream px-2 py-0.5 border border-paper-kraft">
              ĐỀ THI RÚT GỌN
            </span>
            <h2 className="font-display text-4xl font-bold text-ink-dark mt-4">Mini Test</h2>
            <div className="space-y-1 mt-4 text-xs font-body text-ink-medium">
              <p>• Quy mô: 100 câu hỏi tổng hợp</p>
              <p>• Thời lượng: 60 phút</p>
              <p>• Kiểm tra nhanh trình độ giữa kỳ</p>
            </div>
          </div>
          <button
            onClick={() => handleStartExam('MINI')}
            disabled={!!loadingType}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-body text-sm font-bold rounded transition disabled:opacity-50"
          >
            {loadingType === 'MINI' ? 'Đang tải đề thi...' : 'BẮT ĐẦU THI MINI TEST'}
          </button>
        </div>

        {/* Part 5 */}
        <div className="bg-paper-white p-8 border-2 border-paper-kraft rounded-sm shadow-paper-subtle flex flex-col justify-between min-h-[300px] relative">
          <div className="staple top-3 left-4" />
          <div>
            <span className="font-mono text-xs font-bold text-slate-700 bg-paper-cream px-2 py-0.5 border border-paper-kraft">
              LUYỆN CHUYÊN SÂU
            </span>
            <h2 className="font-display text-4xl font-bold text-ink-dark mt-4">Part 5 Test</h2>
            <div className="space-y-1 mt-4 text-xs font-body text-ink-medium">
              <p>• Quy mô: 30 câu trắc nghiệm ngữ pháp & từ vựng</p>
              <p>• Thời lượng: 20 phút</p>
              <p>• Rèn phản xạ hoàn thành câu nhanh</p>
            </div>
          </div>
          <button
            onClick={() => handleStartExam('PART_5')}
            disabled={!!loadingType}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-body text-sm font-bold rounded transition disabled:opacity-50"
          >
            {loadingType === 'PART_5' ? 'Đang tải đề thi...' : 'BẮT ĐẦU THI PART 5'}
          </button>
        </div>
      </div>
    </div>
  );
};