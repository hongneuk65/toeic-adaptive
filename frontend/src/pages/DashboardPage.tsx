import React from 'react';
import { useNavigate } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="w-full space-y-8">
            {/* Tấm bìa chính mở rộng toàn màn hình */}
            <div className="w-full bg-paper-white p-8 border-2 border-paper-kraft shadow-paper-medium rounded-sm relative">
                <div className="staple top-3 left-6" />
                <div className="staple top-3 right-6" />

                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div>
                        <span className="font-mono text-xs font-bold text-accent-coral tracking-widest uppercase bg-paper-cream px-2 py-0.5 border border-paper-kraft">
                            NHẬT KÝ THEO DÕI NĂNG LỰC
                        </span>
                        <h1 className="font-display text-4xl lg:text-5xl font-bold text-ink-dark mt-2">
                            Bảng Tiến Trình Học Tập Thích Ứng
                        </h1>
                        <p className="font-body text-ink-medium text-sm mt-1">
                            Phân tích dữ liệu học tập cá nhân hóa dựa trên thuật toán chẩn đoán kỹ năng TOEIC.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/exam')}
                            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-body text-sm font-bold rounded shadow transition"
                        >
                            VÀO THI THỬ NGAY
                        </button>
                        <button
                            onClick={() => navigate('/flashcards')}
                            className="px-5 py-2.5 bg-paper-cream hover:bg-paper-kraft-light/50 border border-paper-kraft text-ink-dark font-body text-sm font-bold rounded transition"
                        >
                            ÔN TẬP TỪ VỰNG
                        </button>
                    </div>
                </div>

                {/* 4 Thẻ thống kê dạng phiếu kẹp hồ sơ trải rộng 4 cột */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mt-8">
                    <div className="bg-paper-cream p-5 border-2 border-paper-kraft rounded-sm shadow-paper-subtle relative">
                        <div className="tape tape-mint w-16 top-[-8px] left-4" />
                        <span className="font-mono text-xs text-ink-light tracking-wider uppercase block">TỪ VỰNG ĐÃ LƯU</span>
                        <p className="font-display text-5xl font-bold text-accent-navy mt-2">210</p>
                        <p className="font-body text-xs text-ink-pencil mt-1">Phân bổ trong 5 chủ đề</p>
                    </div>

                    <div className="bg-paper-cream p-5 border-2 border-paper-kraft rounded-sm shadow-paper-subtle relative">
                        <div className="tape tape-pink w-16 top-[-8px] left-4" />
                        <span className="font-mono text-xs text-ink-light tracking-wider uppercase block">BÀI LÝ THUYẾT</span>
                        <p className="font-display text-5xl font-bold text-accent-sage mt-2">7/7</p>
                        <p className="font-body text-xs text-ink-pencil mt-1">Bao quát đủ các Part</p>
                    </div>

                    <div className="bg-paper-cream p-5 border-2 border-paper-kraft rounded-sm shadow-paper-subtle relative">
                        <div className="tape w-16 top-[-8px] left-4" />
                        <span className="font-mono text-xs text-ink-light tracking-wider uppercase block">LƯỢT THI THỬ</span>
                        <p className="font-display text-5xl font-bold text-accent-coral mt-2">03</p>
                        <p className="font-body text-xs text-ink-pencil mt-1">Đã hoàn thành và chấm điểm</p>
                    </div>

                    <div className="bg-paper-cream p-5 border-2 border-paper-kraft rounded-sm shadow-paper-subtle relative">
                        <div className="tape tape-mint w-16 top-[-8px] left-4" />
                        <span className="font-mono text-xs text-ink-light tracking-wider uppercase block">ĐIỂM DỰ KIẾN</span>
                        <p className="font-display text-5xl font-bold text-ink-dark mt-2">685</p>
                        <p className="font-body text-xs text-ink-pencil mt-1">Ước tính theo thang điểm ETS</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
