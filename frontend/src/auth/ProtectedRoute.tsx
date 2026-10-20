import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';

export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, user, loading, error, retry, logout } = useAuth();
  const location = useLocation();
  if (loading) return <div className="p-8" role="status">Đang xác minh tài khoản…</div>;
  if (error) return <div className="p-8"><p role="alert">{error}</p><button onClick={retry}>Thử lại</button> <button onClick={logout}>Đăng xuất</button></div>;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ returnTo: location.pathname + location.search + location.hash }} />;
  }

  const adminPath = /^\/admin(?:\/|$)/.test(location.pathname);
  if (user?.role === 'ADMIN' && !adminPath) return <Navigate to="/admin" replace />;
  if (user?.role !== 'ADMIN' && adminPath) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
};
