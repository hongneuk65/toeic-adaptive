import { AuthShell } from '../components/ui/AuthShell';
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, getErrorMessage } from '../lib/api';

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
      navigate('/login', { state: { registered: true } });
    } catch (err) {
      setError(getErrorMessage(err, 'Đăng ký thất bại. Email có thể đã được sử dụng.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Tạo tài khoản" description="Bắt đầu luyện tập và khám phá lộ trình phù hợp với bạn." footer={<>Đã có tài khoản? <Link className="font-semibold text-accent-coral hover:underline" to="/login">Đăng nhập</Link></>}>
      {error && <p role="alert" className="mb-5 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      <form onSubmit={handleRegister} className="space-y-5">
        <div>
          <label htmlFor="register-email" className="form-label">Email</label>
          <input id="register-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="form-input" placeholder="ban@example.com" />
        </div>
        <div>
          <label htmlFor="register-password" className="form-label">Mật khẩu</label>
          <input id="register-password" type="password" autoComplete="new-password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} className="form-input" placeholder="Tối thiểu 6 ký tự" />
        </div>
        <div>
          <label htmlFor="register-confirm" className="form-label">Xác nhận mật khẩu</label>
          <input id="register-confirm" type="password" autoComplete="new-password" minLength={6} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="form-input" placeholder="Nhập lại mật khẩu" />
        </div>
        <button type="submit" disabled={loading} className="primary-button w-full">{loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}</button>
      </form>
    </AuthShell>
  );
};
