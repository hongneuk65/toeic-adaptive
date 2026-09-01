import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 1. Kiểm tra mật khẩu khớp nhau ở client
    if (password !== confirmPassword) {
      setError('Mật khẩu nhập lại không khớp!');
      return;
    }

    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    setLoading(true);

    try {
      // 2. Gọi đúng API POST /auth/register với Axios instance dùng chung
      await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      // Đăng ký thành công -> Chuyển về trang đăng nhập kèm thông báo
      alert('Đăng ký tài khoản thành công! Hãy đăng nhập để bắt đầu học.');
      navigate('/login');
    } catch (err: any) {
      console.error('Lỗi đăng ký:', err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Đăng ký thất bại. Email có thể đã được sử dụng.';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Khối Paper Card dạng tờ giấy kẹp sổ */}
      <div className="max-w-md w-full bg-paper-white shadow-paper-heavy p-8 relative rounded-sm rotate-[0.5deg] border border-paper-kraft-light/40">
        {/* Miếng băng dính dán đỉnh sổ */}
        <div className="tape tape-mint w-28 top-[-10px] left-1/2 -translate-x-1/2 rotate-[-1deg]" />

        <div className="text-center mb-6 pt-2">
          <span className="font-hand text-accent-coral text-base tracking-wider uppercase font-semibold">
            GIA NHẬP HỆ THỐNG TOEIC
          </span>
          <h1 className="font-display text-5xl font-bold text-ink-dark mt-1">
            Tạo Tài Khoản
          </h1>
          <p className="font-hand text-lg text-ink-medium mt-1 rotate-[-1deg]">
            Mở cuốn sổ tay luyện thi của riêng bạn
          </p>
        </div>

        {/* Nét gạch chì ngăn cách */}
        <div className="pencil-line mb-6" />

        {/* Thông báo lỗi nếu có */}
        {error && (
          <div className="mb-5 p-3 bg-paper-rose border border-accent-coral/30 text-accent-coral text-sm font-hand text-base rounded rotate-[0.5deg] shadow-paper-subtle">
            ⚠ {error}
          </div>
        )}

        {/* Form đăng ký */}
        <form onSubmit={handleRegister} className="space-y-5">
          <div className="relative">
            <label className="block font-hand text-lg text-ink-dark mb-1">
              Địa chỉ Email *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tenban@gmail.com"
              className="w-full px-3 py-2 bg-paper-cream/60 border-b-2 border-ink-pencil text-ink-dark font-body focus:outline-none focus:border-accent-coral transition rounded-t-sm"
            />
          </div>

          <div className="relative">
            <label className="block font-hand text-lg text-ink-dark mb-1">
              Mật khẩu *
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tối thiểu 6 ký tự"
              className="w-full px-3 py-2 bg-paper-cream/60 border-b-2 border-ink-pencil text-ink-dark font-body focus:outline-none focus:border-accent-coral transition rounded-t-sm"
            />
          </div>

          <div className="relative">
            <label className="block font-hand text-lg text-ink-dark mb-1">
              Nhập lại mật khẩu *
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu ở trên"
              className="w-full px-3 py-2 bg-paper-cream/60 border-b-2 border-ink-pencil text-ink-dark font-body focus:outline-none focus:border-accent-coral transition rounded-t-sm"
            />
          </div>

          <div className="pt-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-6 bg-accent-coral hover:bg-[#c9664c] text-white font-hand text-2xl font-bold shadow-paper-medium hover:shadow-paper-lifted transition-all duration-200 transform hover:-translate-y-1 hover:-rotate-1 active:translate-y-0 active:rotate-0 rounded-sm disabled:opacity-50"
            >
              {loading ? 'Đang tạo sổ tay...' : 'Đăng ký học ngay →'}
            </button>
          </div>
        </form>

        {/* Chuyển hướng sang Đăng nhập */}
        <div className="mt-8 pt-4 border-t border-dashed border-ink-pencil/50 text-center">
          <p className="font-hand text-base text-ink-light">
            Đã có tài khoản sổ tay?{' '}
            <Link
              to="/login"
              className="font-bold text-accent-coral hover:underline ml-1"
            >
              Đăng nhập tại đây
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};