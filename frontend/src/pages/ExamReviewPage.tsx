import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

interface ReviewResponse {
    id: number;
    examType: string;
    startedAt: string;
    submittedAt: string;
    listeningScore: number;
    readingScore: number;
    totalScore: number;
    answers: {
        id: number;
        questionId: number;
        selectedAnswer: string;
        isCorrect: boolean;
        question: {
            id: number;
            part: number;
            content: string;
            optionA: string;
            optionB: string;
            optionC: string;
            optionD: string;
            correctAnswer: string;
            explanation?: string;
        };
    }[];
}

export const ExamReviewPage: React.FC = () => {
    const { attemptId } = useParams<{ attemptId: string }>();
    const navigate = useNavigate();

    const [review, setReview] = useState<ReviewResponse | null>(null);
    const [filterPart, setFilterPart] = useState<number | 'ALL'>('ALL');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api<ReviewResponse>(`/exam/${attemptId}/review`)
            .then((data) => setReview(data))
            .catch((err) => alert(err.message || 'Lỗi tải kết quả'))
            .finally(() => setLoading(false));
    }, [attemptId]);

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Đang tổng hợp kết quả...</div>;
    }

    if (!review) {
        return <div className="p-8 text-center text-slate-500">Không tìm thấy dữ liệu bài thi.</div>;
    }

    const filteredAnswers = review.answers.filter((ans) =>
        filterPart === 'ALL' ? true : ans.question.part === filterPart,
    );

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Bảng điểm tổng quan */}
            <div className="bg-white p-6 border border-slate-200 rounded">
                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">Kết Quả Thi Thử</h1>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Đề thi: {review.examType} — Nộp lúc: {new Date(review.submittedAt).toLocaleTimeString()}
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/exam')}
                        className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded hover:bg-slate-50"
                    >
                        Về danh sách đề thi
                    </button>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center mt-4">
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded">
                        <span className="text-xs text-slate-500 block">Listening</span>
                        <span className="text-2xl font-bold text-slate-900">{review.listeningScore || 0}</span>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded">
                        <span className="text-xs text-slate-500 block">Reading</span>
                        <span className="text-2xl font-bold text-slate-900">{review.readingScore || 0}</span>
                    </div>
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded">
                        <span className="text-xs text-blue-700 font-semibold block">Tổng điểm</span>
                        <span className="text-2xl font-bold text-blue-900">{review.totalScore || 0}</span>
                    </div>
                </div>
            </div>

            {/* Lọc theo Part */}
            <div className="flex gap-2 overflow-x-auto pb-1">
                {(['ALL', 1, 2, 3, 4, 5, 6, 7] as const).map((p) => (
                    <button
                        key={p}
                        onClick={() => setFilterPart(p)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded border transition ${filterPart === p
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                    >
                        {p === 'ALL' ? 'Tất cả Part' : `Part ${p}`}
                    </button>
                ))}
            </div>

            {/* Chi tiết từng câu hỏi */}
            <div className="space-y-4">
                {filteredAnswers.map((ans, idx) => {
                    const q = ans.question;
                    return (
                        <div key={ans.id} className="bg-white p-5 border border-slate-200 rounded space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                    Part {q.part} — Câu {idx + 1}
                                </span>
                                <span
                                    className={`text-xs font-bold px-2 py-0.5 rounded ${ans.isCorrect ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                                        }`}
                                >
                                    {ans.isCorrect ? 'ĐÚNG' : 'SAI'}
                                </span>
                            </div>

                            <p className="text-sm font-bold text-slate-900">{q.content}</p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                                    const optText = q[`option${opt}` as keyof typeof q];
                                    const isUserPick = ans.selectedAnswer === opt;
                                    const isCorrectAnswer = q.correctAnswer === opt;

                                    let optClass = 'bg-white border-slate-200 text-slate-700';
                                    if (isCorrectAnswer) {
                                        optClass = 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold';
                                    } else if (isUserPick && !ans.isCorrect) {
                                        optClass = 'bg-rose-50 border-rose-500 text-rose-900 font-semibold';
                                    }

                                    return (
                                        <div key={opt} className={`p-2.5 border rounded flex gap-2 ${optClass}`}>
                                            <span className="font-bold">{opt}.</span>
                                            <span>{String(optText)}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            {q.explanation && (
                                <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded border border-slate-200">
                                    <span className="font-semibold text-slate-900">Giải thích: </span>
                                    {q.explanation}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};