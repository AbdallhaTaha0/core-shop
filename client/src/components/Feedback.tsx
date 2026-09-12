import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useShop } from '../app/shop-context';

export function RequireUser({ children }: { children: ReactNode }) {
  const { user, ready } = useShop();
  if (!ready) return <Loading />;
  return user ? children : <Navigate to="/auth" replace />;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, ready } = useShop();
  if (!ready) return <Loading />;
  return user?.role === 'admin' ? children : <Navigate to="/account" replace />;
}

export function Loading() {
  return (
    <div className="loading container" role="status">
      Loading the workbench…
    </div>
  );
}

export function RequestState({
  error,
  loading,
  retry,
}: {
  error: string;
  loading: boolean;
  retry?: () => void;
}) {
  return loading ? (
    <Loading />
  ) : error ? (
    <div className="request-error" role="alert">
      <strong>Could not load this section.</strong>
      <p>{error}</p>
      <button className="button outline" onClick={retry ?? (() => window.location.reload())}>
        Try again
      </button>
    </div>
  ) : null;
}
