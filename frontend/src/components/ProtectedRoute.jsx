import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { session, profile, mfaStatus, loading } = useAuth();

  if (loading) return <div className="flex h-screen items-center justify-center text-slate-500">Chargement…</div>;
  if (!session) return <Navigate to="/connexion" replace />;
  if (mfaStatus === 'needs_enroll') return <Navigate to="/mfa/configuration" replace />;
  if (mfaStatus === 'needs_challenge') return <Navigate to="/mfa/verification" replace />;
  if (mfaStatus !== 'verified') return <Navigate to="/connexion" replace />;
  if (adminOnly && profile?.role !== 'admin') return <Navigate to="/tableau-de-bord" replace />;

  return children;
}
