import { AuthShell } from '../components/ui/AuthShell';
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { api, getErrorMessage } from '../lib/api';

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
    } catch (err) {
      setErrorMessage(getErrorMessage(err, 'Đăng nhập thất bại. Vui lòng kiểm tra lại!'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Chào mừng trở lại" description="Đăng nhập để tiếp tục lộ trình luyện TOEIC của bạn." footer={<>Chưa có tài khoản? <Link className="font-semibold text-accent-coral hover:underline" to="/register">Đăng ký</Link></>}>
      {errorMessage && <p role="alert" className="mb-5 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{errorMessage}</p>}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="login-email" className="form-label">Email</label>
          <input id="login-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="form-input" placeholder="ban@example.com" />
        </div>
        <div>
          <label htmlFor="login-password" className="form-label">Mật khẩu</label>
          <input id="login-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="form-input" placeholder="Nhập mật khẩu" />
        </div>
        <button type="submit" disabled={loading} className="primary-button w-full">{loading ? 'Đang đăng nhập...' : 'Đăng nhập'}</button>
      </form>
    </AuthShell>
  );
};
