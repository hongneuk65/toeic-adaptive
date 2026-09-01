import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api } from '../lib/api';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await api<{ accessToken: string }>('/auth/login', {
        method: 'POST',
        data: { email, password },
      });

      login(res.accessToken);
      navigate('/dashboard');
    } catch (err: any) {
      setErrorMessage(err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Khối Paper Card dạng tờ giấy kẹp sổ */}
      <div className="max-w-md w-full bg-paper-white shadow-paper-heavy p-8 relative rounded-sm rotate-[-0.5deg] border border-paper-kraft-light/40">
        {/* Miếng băng dính dán đỉnh sổ */}
        <div className="tape tape-mint w-28 top-[-10px] left-1/2 -translate-x-1/2 rotate-[1deg]" />

        {/* Tiêu đề phong cách chữ viết tay nghệ thuật */}
        <div className="text-center mb-6 pt-2">
          <span className="font-hand text-accent-coral text-base tracking-wider uppercase font-semibold">
            Study Diary • Sổ tay luyện thi
          </span>
          <h1 className="font-display text-5xl font-bold text-ink-dark mt-1">
            TOEIC Adaptive
          </h1>
          <p className="font-hand text-lg text-ink-medium mt-1 rotate-[-1deg]">
            Hệ thống học thích ứng cá nhân hóa
          </p>
        </div>

        {/* Nét gạch chì ngăn cách */}
        <div className="pencil-line mb-6" />

        {errorMessage && (
          <div className="mb-5 p-3 bg-paper-rose border border-accent-coral/30 text-accent-coral text-sm font-hand text-base rounded rotate-[0.5deg] shadow-paper-subtle">
            ⚠ {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Ô nhập Email kẻ dòng chì */}
          <div className="relative">
            <label className="block font-hand text-lg text-ink-dark mb-1">
              Địa chỉ Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-paper-cream/60 border-b-2 border-ink-pencil text-ink-dark font-body focus:outline-none focus:border-accent-coral transition rounded-t-sm"
              placeholder="hocvien@example.com"
            />
          </div>

          {/* Ô nhập Mật khẩu */}
          <div className="relative">
            <label className="block font-hand text-lg text-ink-dark mb-1">
              Mật khẩu bí mật
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-paper-cream/60 border-b-2 border-ink-pencil text-ink-dark font-body focus:outline-none focus:border-accent-coral transition rounded-t-sm"
              placeholder="••••••••"
            />
          </div>

          {/* Nút bấm Paper Kraft Button với hiệu ứng nảy nhẹ khi hover */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-6 bg-accent-coral hover:bg-[#c9664c] text-white font-hand text-2xl font-bold shadow-paper-medium hover:shadow-paper-lifted transition-all duration-200 transform hover:-translate-y-1 hover:-rotate-1 active:translate-y-0 active:rotate-0 rounded-sm disabled:opacity-50"
            >
              {loading ? 'Đang mở sổ tay...' : 'Lật mở trang học →'}
            </button>
          </div>
        </form>

        {/* Chân trang phong cách ghi chú nháp có chứa link đăng ký */}
        <div className="mt-8 pt-4 border-t border-dashed border-ink-pencil/50 text-center">
          <p className="font-hand text-base text-ink-light">
            Chưa có tài khoản?{' '}
            <Link
              to="/register"
              className="font-bold text-accent-coral hover:underline ml-1"
            >
              Đăng ký tại đây
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};