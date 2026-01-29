import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plane, Hash } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTrip } from '../contexts/TripContext';

export default function JoinPage() {
  const [searchParams] = useSearchParams();
  const [lobbyCode, setLobbyCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { joinTrip } = useTrip();
  const navigate = useNavigate();

  // Check for code in URL query params (from redirect after login)
  useEffect(() => {
    const codeFromUrl = searchParams.get('code');
    if (codeFromUrl) {
      console.log('[JoinPage] Found code in URL:', codeFromUrl);
      const cleaned = codeFromUrl.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
      setLobbyCode(cleaned);
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (lobbyCode.length !== 6) {
      setError('Lobby code must be 6 characters');
      return;
    }

    if (!user) {
      // Store lobby code and redirect to login
      sessionStorage.setItem('pendingLobbyCode', lobbyCode.toUpperCase());
      navigate('/login');
      return;
    }

    console.log('[JoinPage] Attempting to join trip with code:', lobbyCode);
    setLoading(true);

    try {
      const result = await joinTrip(lobbyCode);
      console.log('[JoinPage] Join result:', result);

      if (result.error) {
        setError(result.error);
        setLoading(false);
      } else if (result.tripId) {
        console.log('[JoinPage] Success! Navigating to trip:', result.tripId);
        navigate(`/trip/${result.tripId}`);
      } else {
        // Fallback: try to get trip ID from context
        console.error('[JoinPage] No tripId returned, checking TripContext');
        setError('Failed to join trip. Please try again.');
        setLoading(false);
      }
    } catch (err) {
      console.error('[JoinPage] Unexpected error:', err);
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  }

  function handleCodeChange(value: string) {
    // Only allow alphanumeric, uppercase
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setLobbyCode(cleaned);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <Plane className="w-10 h-10 text-blue-400" />
          <span className="text-3xl font-bold">GroupTrips</span>
        </Link>

        <div className="card p-8">
          <h1 className="text-2xl font-bold text-center mb-2">Join a Trip</h1>
          <p className="text-white/50 text-center mb-6">
            Enter the 6-character lobby code you received from the admin
          </p>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6 text-red-200 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="join-lobby-code" className="block text-sm font-medium text-white/70 mb-2">
                Lobby Code
              </label>
              <div className="relative">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" aria-hidden="true" />
                <input
                  id="join-lobby-code"
                  name="lobbyCode"
                  type="text"
                  value={lobbyCode}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  className="input-field pl-12 text-center text-2xl tracking-[0.5em] font-mono uppercase"
                  placeholder="ABC123"
                  maxLength={6}
                  required
                  aria-describedby="lobby-code-hint"
                />
              </div>
              <p id="lobby-code-hint" className="sr-only">Enter the 6-character lobby code shared by the trip admin</p>
            </div>

            <button
              type="submit"
              disabled={loading || lobbyCode.length !== 6}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Joining...' : 'Join Trip'}
            </button>
          </form>

          {!user && (
            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
              <p className="text-sm text-blue-200">
                You need to be logged in to join a trip. You will be redirected
                to the login page.
              </p>
            </div>
          )}

          <div className="mt-6 text-center text-sm text-white/50">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-400 hover:text-blue-300">
              Sign up here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
