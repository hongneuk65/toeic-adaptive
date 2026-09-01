import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

interface Question {
    id: number;
    content: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
}

interface QuizResult {
    totalQuestions: number;
    correctCount: number;
    scorePercentage: number;
    details: {
        questionId: number;
        selectedAnswer: string;
        correctAnswer: string;
        isCorrect: boolean;
        explanation?: string;
    }[];
}

export const TheoryQuizPage: React.FC = () => {
    const { lessonId } = useParams<{ lessonId: string }>();
    const navigate = useNavigate();

    const [questions, setQuestions] = useState<Question[]>([]);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [result, setResult] = useState<QuizResult | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api<Question[]>(`/theory/${lessonId}/quiz`)
            .then((data) => setQuestions(data))
            .catch((err) => console.error(err))
            .finally(() => setLoading(false));
    }, [lessonId]);

    const handleSelect = (qId: number, opt: string) => {
        if (result) return;
        setAnswers((prev) => ({ ...prev, [qId]: opt }));
    };

    const handleSubmit = async () => {
        const list = Object.entries(answers).map(([qId, selectedAnswer]) => ({
            questionId: Number(qId),
            selectedAnswer,
        }));

        if (list.length < questions.length) {
            alert('Vui lòng chọn đáp án cho tất cả câu hỏi trước khi nộp bài!');
            return;
        }

        try {
            const res = await api<QuizResult>(`/theory/${lessonId}/quiz/submit`, {
                method: 'POST',
                data: { answers: list },
            });
            setResult(res);
        } catch (err: any) {
            alert(err.message || 'Lỗi khi nộp bài');
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header thanh điều hướng phòng thi */}
            <div className="bg-white p-4 border border-slate-200 rounded flex justify-between items-center shadow-sm">
                <button
                    onClick={() => navigate('/theory')}
                    className="font-hand text-lg font-bold text-slate-700 hover:text-accent-coral transition"
                >
                    ← Quay lại đọc lý thuyết
                </button>
                <h1 className="font-body font-bold text-lg text-slate-800">
                    Mini-quiz Luyện Tập Củng Cố
                </h1>
                {result && (
                    <span className="font-body font-bold text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded">
                        Điểm: {result.scorePercentage}% ({result.correctCount}/{result.totalQuestions})
                    </span>
                )}
            </div>

            {loading ? (
                <div className="bg-white p-8 text-center text-slate-400 font-body">Đang tải đề thi...</div>
            ) : questions.length === 0 ? (
                <div className="bg-white p-8 text-center text-slate-500 font-body">Chưa có câu hỏi cho bài này.</div>
            ) : (
                <div className="space-y-6">
                    {questions.map((q, idx) => {
                        const detail = result?.details.find((d) => d.questionId === q.id);
                        return (
                            <div key={q.id} className="bg-white p-6 rounded border border-slate-200 shadow-sm space-y-4">
                                <p className="font-body font-bold text-slate-900 text-base leading-snug">
                                    <span className="text-blue-700 mr-2">Câu {idx + 1}:</span>
                                    {q.content}
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                                        const optText = q[`option${opt}` as keyof Question];
                                        const isSelected = answers[q.id] === opt;

                                        let btnClass = 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50';
                                        if (isSelected) btnClass = 'border-blue-600 bg-blue-50 text-blue-900 ring-1 ring-blue-600 font-semibold';

                                        if (detail) {
                                            if (detail.correctAnswer === opt) {
                                                btnClass = 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-600 font-bold';
                                            } else if (isSelected && !detail.isCorrect) {
                                                btnClass = 'border-rose-500 bg-rose-50 text-rose-900 ring-1 ring-rose-500';
                                            }
                                        }

                                        return (
                                            <button
                                                key={opt}
                                                onClick={() => handleSelect(q.id, opt)}
                                                className={`p-3 text-left font-body text-sm border rounded transition flex items-start gap-2 ${btnClass}`}
                                            >
                                                <span className="font-bold">{opt}.</span>
                                                <span>{optText}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {detail && detail.explanation && (
                                    <div className="font-body text-sm text-slate-700 bg-slate-50 p-3 rounded border border-slate-200">
                                        <span className="font-bold text-blue-700">Giải thích: </span>
                                        {detail.explanation}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {!result && (
                        <button
                            onClick={handleSubmit}
                            className="w-full py-3.5 bg-blue-700 hover:bg-blue-800 text-white font-body text-base font-bold rounded shadow transition"
                        >
                            Nộp bài Mini-quiz
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};