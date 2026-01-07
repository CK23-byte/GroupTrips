import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TripProvider } from './contexts/TripContext';

// Lazy load all page components for code splitting
const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const JoinPage = lazy(() => import('./pages/JoinPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const TripLobbyPage = lazy(() => import('./pages/TripLobbyPage'));
const TripAdminPage = lazy(() => import('./pages/TripAdminPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));

// Loading spinner for suspense fallback
function PageLoader({ reason = 'page' }: { reason?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      <p className="text-white/50 text-sm">Loading {reason}...</p>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  // Log auth state for debugging
  console.log(`[ProtectedRoute] loading=${loading}, user=${user?.id || 'null'}`);

  if (loading) {
    return <PageLoader reason="authentication" />;
  }

  if (!user) {
    // Check if returning from payment - store URL for after login
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const hasPendingPayment = sessionStorage.getItem('pendingPayment') === 'true';
    const hasPendingTripData = sessionStorage.getItem('pendingTripData');

    // Log diagnostic info when not authenticated
    console.log('[ProtectedRoute] User not authenticated, checking payment return...', {
      paymentStatus,
      hasPendingTripData: !!hasPendingTripData,
      hasPendingPayment,
      url: window.location.href,
    });

    if ((paymentStatus === 'success' || hasPendingPayment) && hasPendingTripData) {
      sessionStorage.setItem('returnAfterLogin', window.location.href);
    }

    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          }
        />
        <Route path="/join" element={<JoinPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trip/:tripId"
          element={
            <ProtectedRoute>
              <TripLobbyPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trip/:tripId/admin"
          element={
            <ProtectedRoute>
              <TripAdminPage />
            </ProtectedRoute>
          }
        />

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <TripProvider>
          <AppRoutes />
        </TripProvider>
      </AuthProvider>
    </Router>
  );
}
