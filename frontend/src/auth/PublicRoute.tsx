import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';
import { learningReturnTo } from './return-to';

export function PublicRoute() {
  const location = useLocation();
  const { user, token, loading, error, retry, logout } = useAuth();
  if (loading) return <div className="p-8" role="status">Đang xác minh tài khoản…</div>;
  if (token && error) return <div className="p-8"><p role="alert">{error}</p><button onClick={retry}>Thử lại</button> <button onClick={logout}>Đăng nhập lại</button></div>;
  if (user) return <Navigate to={user.role === 'ADMIN' ? '/admin' : learningReturnTo(location.state?.returnTo)} replace />;
  return <Outlet />;
}
