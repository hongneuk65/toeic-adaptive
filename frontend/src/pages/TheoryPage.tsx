import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface LessonSummary {
    id: number;
    title: string;
    part: number;
    skillId: number;
}

interface LessonDetail {
    id: number;
    title: string;
    content: string;
    part: number;
    skill: { name: string; code: string };
}

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

export const TheoryPage: React.FC = () => {
    const [selectedPart, setSelectedPart] = useState(5);
    const [lessons, setLessons] = useState<LessonSummary[]>([]);
    const [currentLesson, setCurrentLesson] = useState<LessonDetail | null>(null);

    // Trạng thái mini-quiz
    const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
    const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
    const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        api<LessonSummary[]>(`/theory/part/${selectedPart}`).then((data) => {
            setLessons(data);
            if (data.length > 0) {
                loadLesson(data[0].id);
            } else {
                setCurrentLesson(null);
                setQuizQuestions([]);
            }
        });
    }, [selectedPart]);

    const loadLesson = async (id: number) => {
        setLoading(true);
        setQuizResult(null);
        setUserAnswers({});
        try {
            const [detail, quiz] = await Promise.all([
                api<LessonDetail>(`/theory/${id}`),
                api<Question[]>(`/theory/${id}/quiz`),
            ]);
            setCurrentLesson(detail);
            setQuizQuestions(quiz);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectOption = (questionId: number, option: string) => {
        if (quizResult) return;
        setUserAnswers((prev) => ({ ...prev, [questionId]: option }));
    };

    const handleSubmitQuiz = async () => {
        if (!currentLesson) return;
        const answers = Object.entries(userAnswers).map(([qId, ans]) => ({
            questionId: Number(qId),
            selectedAnswer: ans,
        }));

        if (answers.length < quizQuestions.length) {
            alert('Bạn vui lòng hoàn thành tất cả các câu hỏi trước khi nộp bài!');
            return;
        }

        try {
            const result = await api<QuizResult>(`/theory/${currentLesson.id}/quiz/submit`, {
                method: 'POST',
                data: { answers },
            });
            setQuizResult(result);
        } catch (err: any) {
            alert(err.message || 'Lỗi khi nộp bài');
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Thanh chọn Part 1 -> 7 (Phong cách Paper Tabs) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-paper-kraft-light">
                {[1, 2, 3, 4, 5, 6, 7].map((partNumber) => (
                    <button
                        key={partNumber}
                        onClick={() => setSelectedPart(partNumber)}
                        className={`px-5 py-2 font-hand text-xl font-bold rounded-t-sm transition ${selectedPart === partNumber
                                ? 'bg-paper-white text-accent-coral border-t-2 border-accent-coral shadow-paper-subtle'
                                : 'bg-paper-cream text-ink-medium hover:bg-paper-kraft-light/30'
                            }`}
                    >
                        Part {partNumber}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Cột danh mục bài học (Sổ tay thư mục) */}
                <div className="bg-paper-white p-4 border border-paper-kraft-light/60 shadow-paper-subtle rounded-sm h-fit space-y-2">
                    <h2 className="font-hand text-lg font-bold text-ink-medium uppercase tracking-wider border-b border-paper-kraft-light pb-2">
                        Mục lục Part {selectedPart}
                    </h2>

                    {lessons.length === 0 ? (
                        <p className="font-body text-xs text-ink-light py-2">Chưa có bài học nào cho Part {selectedPart}.</p>
                    ) : (
                        lessons.map((lesson) => (
                            <button
                                key={lesson.id}
                                onClick={() => loadLesson(lesson.id)}
                                className={`w-full text-left p-2.5 rounded-sm font-body text-sm transition ${currentLesson?.id === lesson.id
                                        ? 'bg-paper-sky text-accent-navy font-bold border-l-4 border-accent-navy'
                                        : 'text-ink-dark hover:bg-paper-cream'
                                    }`}
                            >
                                {lesson.title}
                            </button>
                        ))
                    )}
                </div>

                {/* Khung nội dung bài học & Mini-quiz (ĐẢM BẢO RÕ RÀNG, PHÔNG CHỮ TIÊU CHUẨN) */}
                <div className="md:col-span-3 space-y-6">
                    {loading ? (
                        <div className="bg-paper-white p-8 border border-paper-kraft-light/60 text-center font-hand text-xl text-ink-light">
                            Đang mở trang bài giảng...
                        </div>
                    ) : currentLesson ? (
                        <>
                            {/* Vùng bài đọc lý thuyết */}
                            <div className="bg-white p-6 sm:p-8 rounded-sm border border-slate-200 shadow-sm space-y-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold px-2.5 py-1 bg-blue-50 text-blue-700 rounded border border-blue-200 font-mono">
                                        {currentLesson.skill.code}
                                    </span>
                                    <span className="text-xs text-slate-500 font-body">• {currentLesson.skill.name}</span>
                                </div>

                                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-body tracking-tight">
                                    {currentLesson.title}
                                </h1>

                                {/* Nội dung lý thuyết dùng font tiêu chuẩn, dễ đọc, khoảng cách dòng thoáng */}
                                <div className="font-body text-slate-800 text-base leading-relaxed whitespace-pre-line border-t border-slate-100 pt-4">
                                    {currentLesson.content}
                                </div>
                            </div>

                            {/* VÙNG LÀM MINI-QUIZ (DỄ NHÌN, PHÔNG CHỮ CHUẨN THI CỬ) */}
                            {quizQuestions.length > 0 && (
                                <div className="bg-white p-6 sm:p-8 rounded-sm border border-slate-200 shadow-sm space-y-6">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-200 pb-4">
                                        <div>
                                            <h3 className="font-body text-xl font-bold text-slate-900">
                                                Bài tập củng cố (Mini-quiz)
                                            </h3>
                                            <p className="font-body text-xs text-slate-500 mt-0.5">
                                                Chọn đáp án đúng nhất cho các câu hỏi bên dưới
                                            </p>
                                        </div>

                                        {quizResult && (
                                            <span className="font-body text-sm font-bold text-blue-800 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded">
                                                Kết quả: {quizResult.correctCount}/{quizResult.totalQuestions} câu ({quizResult.scorePercentage}%)
                                            </span>
                                        )}
                                    </div>

                                    {/* Danh sách câu hỏi */}
                                    <div className="space-y-6">
                                        {quizQuestions.map((q, idx) => {
                                            const resultDetail = quizResult?.details.find((d) => d.questionId === q.id);
                                            return (
                                                <div
                                                    key={q.id}
                                                    className="p-5 bg-slate-50 border border-slate-200 rounded space-y-4"
                                                >
                                                    {/* Câu hỏi: Phông chuẩn font-body, chữ đậm, nét rõ */}
                                                    <p className="font-body font-bold text-slate-900 text-base leading-snug">
                                                        <span className="text-blue-700 mr-1.5">Câu {idx + 1}:</span>
                                                        {q.content}
                                                    </p>

                                                    {/* 4 phương án A B C D */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                        {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                                                            const optText = q[`option${opt}` as keyof Question];
                                                            const isSelected = userAnswers[q.id] === opt;

                                                            // Mặc định: Giao diện thi rõ ràng, nền trắng, viền xám
                                                            let btnClass = 'border-slate-300 bg-white text-slate-800 hover:bg-slate-100 hover:border-slate-400';

                                                            if (isSelected) {
                                                                btnClass = 'border-blue-600 bg-blue-50 text-blue-900 ring-1 ring-blue-600 font-semibold';
                                                            }

                                                            // Sau khi nộp bài: Tô màu đáp án
                                                            if (resultDetail) {
                                                                if (resultDetail.correctAnswer === opt) {
                                                                    btnClass = 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-600 font-bold';
                                                                } else if (isSelected && !resultDetail.isCorrect) {
                                                                    btnClass = 'border-rose-500 bg-rose-50 text-rose-900 ring-1 ring-rose-500';
                                                                }
                                                            }

                                                            return (
                                                                <button
                                                                    key={opt}
                                                                    type="button"
                                                                    onClick={() => handleSelectOption(q.id, opt)}
                                                                    className={`p-3 text-left font-body text-sm border rounded transition flex items-start gap-2 ${btnClass}`}
                                                                >
                                                                    <span className="font-bold shrink-0">{opt}.</span>
                                                                    <span>{optText}</span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>

                                                    {/* Lời giải thích khi đã chấm điểm */}
                                                    {resultDetail && resultDetail.explanation && (
                                                        <div className="font-body text-sm text-slate-700 bg-white p-3.5 rounded border border-slate-200 mt-2">
                                                            <span className="font-bold text-blue-700">Giải thích: </span>
                                                            {resultDetail.explanation}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {!quizResult && (
                                        <button
                                            onClick={handleSubmitQuiz}
                                            className="w-full py-3 bg-blue-700 hover:bg-blue-800 text-white font-body text-base font-bold rounded shadow transition"
                                        >
                                            Nộp bài Mini-quiz
                                        </button>
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="bg-paper-white p-8 border border-paper-kraft-light text-center font-hand text-xl text-ink-medium">
                            Hãy chọn một bài học từ mục lục bên trái để bắt đầu học nhé.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
