import { Navigate, Outlet, useLocation } from 'react-router';
import { PageLoader } from '../../shared/ui';
import { useSessionStore, type RoleCode } from '../auth';
import { ForbiddenPage } from '../layout';

export const LOGIN_PATH = '/login';

interface ProtectedRouteProps {
  roles?: readonly RoleCode[];
}

export function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const status = useSessionStore((state) => state.status);
  const role = useSessionStore((state) => state.user?.role);
  const location = useLocation();

  if (status === 'loading') return <PageLoader />;
  if (status === 'anonymous') {
    return <Navigate to={LOGIN_PATH} replace state={{ from: location }} />;
  }
  if (roles && (role === undefined || !roles.includes(role))) return <ForbiddenPage />;
  return <Outlet />;
}
