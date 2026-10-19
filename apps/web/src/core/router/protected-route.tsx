import { Navigate, Outlet, useLocation } from 'react-router';
import { PageLoader } from '../../shared/ui';
import { CHANGE_PASSWORD_PATH, LOGIN_PATH, useSessionStore, type RoleCode } from '../auth';
import { ForbiddenPage } from '../layout';

interface ProtectedRouteProps {
  roles?: readonly RoleCode[];
}

export function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const status = useSessionStore((state) => state.status);
  const user = useSessionStore((state) => state.user);
  const location = useLocation();

  if (status === 'loading') return <PageLoader />;
  if (status === 'anonymous' || !user) {
    return <Navigate to={LOGIN_PATH} replace state={{ from: location }} />;
  }
  if (user.mustChangePassword && location.pathname !== CHANGE_PASSWORD_PATH) {
    return <Navigate to={CHANGE_PASSWORD_PATH} replace />;
  }
  if (roles && !roles.includes(user.role)) return <ForbiddenPage />;
  return <Outlet />;
}
