import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../../features/auth/context/auth-context';

export const LoggedManagerRoute: React.FC = () => {
  const { gerente, carregando } = useAuth();
  const { pathname } = useLocation();

  if (carregando) {
    return <p style={{ padding: '3rem', opacity: 0.6 }}>Conferindo sessão…</p>;
  }

  if (!gerente) {
    return <Navigate to="/painel/entrar" state={{ de: pathname }} replace />;
  }

  return <Outlet />;
};
