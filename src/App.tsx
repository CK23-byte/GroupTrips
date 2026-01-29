import React, { Suspense, lazy, useState, useEffect, Component, type ErrorInfo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TripProvider } from './contexts/TripContext';

// Error Boundary to catch React errors and prevent blank screens
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="text-6xl">😵</div>
          <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
          <p className="text-white/60 max-w-md">
            An unexpected error occurred. This has been logged automatically.
          </p>
          <div className="flex gap-4 mt-4">
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Reload Page
            </button>
            <Link to="/" onClick={() => this.setState({ hasError: false, error: null })} className="btn-secondary">
              Go Home
            </Link>
          </div>
          {this.state.error && (
            <details className="mt-6 text-left max-w-lg">
              <summary className="cursor-pointer text-white/40 text-sm">Error details</summary>
              <pre className="mt-2 p-4 bg-red-900/20 rounded-lg text-xs text-red-300 overflow-auto">
                {this.state.error.toString()}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

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
  const [waitingForAuth, setWaitingForAuth] = useState(true);

  // Check if returning from payment
  const urlParams = new URLSearchParams(window.location.search);
  const paymentStatus = urlParams.get('payment');
  const sessionId = urlParams.get('session_id');
  const hasPendingPayment = localStorage.getItem('pendingPayment') === 'true';
  const hasPendingTripData = localStorage.getItem('pendingTripData');
  const isPaymentReturn = paymentStatus === 'success' && (sessionId || hasPendingTripData || hasPendingPayment);

  // Give auth extra time to load if returning from payment
  // This handles cases where session recovery takes longer after cross-domain redirect
  useEffect(() => {
    if (loading) {
      setWaitingForAuth(true);
      return;
    }

    // If auth finished loading and we have a user, we're done waiting
    if (user) {
      setWaitingForAuth(false);
      return;
    }

    // If no user and this is a payment return, wait a bit longer
    // The auth might still be initializing from the session
    if (isPaymentReturn) {
      const timer = setTimeout(() => {
        console.log('[ProtectedRoute] Extended wait timeout, proceeding with redirect');
        setWaitingForAuth(false);
      }, 2000); // Wait up to 2 more seconds for payment returns

      return () => clearTimeout(timer);
    }

    // Not a payment return, proceed immediately
    setWaitingForAuth(false);
  }, [loading, user, isPaymentReturn]);

  // Log auth state for debugging
  console.log(`[ProtectedRoute] loading=${loading}, user=${user?.id || 'null'}, waitingForAuth=${waitingForAuth}, isPaymentReturn=${isPaymentReturn}`);

  if (loading || (waitingForAuth && isPaymentReturn && !user)) {
    return <PageLoader reason="authentication" />;
  }

  if (!user) {
    // Log diagnostic info when not authenticated
    console.log('[ProtectedRoute] User not authenticated, checking payment return...', {
      paymentStatus,
      sessionId: sessionId ? 'present' : 'null',
      hasPendingTripData: !!hasPendingTripData,
      hasPendingPayment,
      url: window.location.href,
    });

    // Save URL for after login if:
    // 1. Has session_id (can retrieve trip data from Stripe)
    // 2. OR has pendingTripData in localStorage (persistent storage)
    // 3. OR has pendingPayment flag (Payment Link flow)
    if (isPaymentReturn) {
      console.log('[ProtectedRoute] Saving payment return URL for after login');
      localStorage.setItem('returnAfterLogin', window.location.href);
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
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <TripProvider>
            <AppRoutes />
          </TripProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}
