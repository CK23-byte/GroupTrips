import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Plane,
  Users,
  User,
  Calendar,
  ChevronRight,
  LogOut,
  Copy,
  Check,
  CreditCard,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, generateLobbyCode } from '../lib/supabase';
import type { Trip, TripMember } from '../types';

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<(Trip & { members: TripMember[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (user) {
      loadTrips();
    }
  }, [user]);

  async function loadTrips() {
    if (!user) {
      console.log('[loadTrips] No user, skipping');
      setLoading(false);
      return;
    }

    console.log('[loadTrips] Loading trips for user:', user.id);

    try {
      const { data: memberData, error: memberError } = await supabase
        .from('trip_members')
        .select('trip_id')
        .eq('user_id', user.id);

      console.log('[loadTrips] Member data:', memberData, 'Error:', memberError);

      if (memberError) {
        console.error('[loadTrips] Error fetching memberships:', memberError);
        setLoading(false);
        return;
      }

      if (memberData && memberData.length > 0) {
        const tripIds = memberData.map((m) => m.trip_id);
        console.log('[loadTrips] Trip IDs:', tripIds);

        const { data: tripsData, error: tripsError } = await supabase
          .from('trips')
          .select('*, members:trip_members(*)')
          .in('id', tripIds)
          .order('departure_time', { ascending: true });

        console.log('[loadTrips] Trips data:', tripsData, 'Error:', tripsError);

        if (tripsError) {
          console.error('[loadTrips] Error fetching trips:', tripsError);
        } else if (tripsData) {
          setTrips(tripsData as (Trip & { members: TripMember[] })[]);
        }
      } else {
        console.log('[loadTrips] No memberships found');
      }
    } catch (err) {
      console.error('[loadTrips] Unexpected error:', err);
    }

    setLoading(false);
  }

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  function getTripStatus(trip: Trip) {
    const now = new Date();
    const departure = new Date(trip.departure_time);
    const hoursUntil = (departure.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (trip.status === 'completed') {
      return { label: 'Completed', color: 'bg-gray-500' };
    }
    if (hoursUntil < 0) {
      return { label: 'In Progress', color: 'bg-green-500' };
    }
    if (hoursUntil <= 24) {
      return { label: 'Soon', color: 'bg-yellow-500' };
    }
    return { label: 'Planned', color: 'bg-blue-500' };
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Plane className="w-8 h-8 text-blue-400" />
            <span className="text-xl font-bold">GroupTrips</span>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              to="/profile"
              className="flex items-center gap-2 px-3 py-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <span className="text-white/70">{user?.name?.split(' ')[0]}</span>
              <User className="w-5 h-5 text-white/50" />
            </Link>
            <button
              onClick={handleSignOut}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Welcome back, {user?.name?.split(' ')[0]}!
            </h1>
            <p className="text-white/60">Manage your trips and view upcoming travels</p>
          </div>

          <div className="flex gap-3">
            <Link to="/join" className="btn-secondary flex items-center gap-2">
              <Users className="w-5 h-5" />
              Join Trip
            </Link>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              New Trip
            </button>
          </div>
        </div>

        {/* Trips Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-white/50">Loading trips...</p>
          </div>
        ) : trips.length === 0 ? (
          <div className="card p-12 text-center">
            <Plane className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No trips yet</h2>
            <p className="text-white/50 mb-6">
              Create your first trip or join an existing one with a lobby code
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary"
              >
                Create Trip
              </button>
              <Link to="/join" className="btn-secondary">
                Join with Code
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => (
              <TripCard key={trip.id} trip={trip} status={getTripStatus(trip)} />
            ))}
          </div>
        )}
      </main>

      {/* Create Trip Modal */}
      {showCreateModal && (
        <CreateTripModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            loadTrips();
          }}
        />
      )}
    </div>
  );
}

function TripCard({
  trip,
  status,
}: {
  trip: Trip & { members: TripMember[] };
  status: { label: string; color: string };
}) {
  const departure = new Date(trip.departure_time);

  return (
    <Link to={`/trip/${trip.id}`} className="card card-hover p-6 block">
      <div className="flex items-start justify-between mb-4">
        <div>
          <span
            className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${status.color}`}
          >
            {status.label}
          </span>
        </div>
        <ChevronRight className="w-5 h-5 text-white/30" />
      </div>

      <h3 className="text-xl font-semibold mb-2">{trip.name}</h3>

      {trip.description && (
        <p className="text-white/50 text-sm mb-4 line-clamp-2">
          {trip.description}
        </p>
      )}

      <div className="flex items-center gap-4 text-sm text-white/60">
        <div className="flex items-center gap-1">
          <Calendar className="w-4 h-4" />
          <span>
            {departure.toLocaleDateString('en-US', {
              day: 'numeric',
              month: 'short',
            })}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Users className="w-4 h-4" />
          <span>{trip.members?.length || 0} members</span>
        </div>
      </div>
    </Link>
  );
}

function CreateTripModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const { user } = useAuth();
  const [step, setStep] = useState<'details' | 'payment' | 'creating' | 'success'>('details');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdTrip, setCreatedTrip] = useState<Trip | null>(null);
  const [copied, setCopied] = useState(false);
  const [_pendingTripData, setPendingTripData] = useState<{
    name: string;
    description: string;
    departureTime: string;
  } | null>(null);

  // Check for payment success on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const savedTripData = sessionStorage.getItem('pendingTripData');

    if (paymentStatus === 'success' && savedTripData) {
      const tripData = JSON.parse(savedTripData);
      setPendingTripData(tripData);
      setName(tripData.name);
      setDescription(tripData.description);
      setDepartureTime(tripData.departureTime);
      setStep('creating');
      sessionStorage.removeItem('pendingTripData');
      // Remove query params
      window.history.replaceState({}, '', window.location.pathname);
      // Auto-create trip after payment
      createTripAfterPayment(tripData);
    }
  }, []);

  async function createTripAfterPayment(tripData: { name: string; description: string; departureTime: string }) {
    if (!user) return;

    setLoading(true);
    const departureDate = new Date(tripData.departureTime);
    const lobbyCode = generateLobbyCode();

    try {
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .insert({
          name: tripData.name,
          description: tripData.description || null,
          lobby_code: lobbyCode,
          admin_id: user.id,
          departure_time: departureDate.toISOString(),
          status: 'planning',
        })
        .select()
        .single();

      if (tripError) {
        setError(tripError.message);
        setStep('details');
        setLoading(false);
        return;
      }

      await supabase.from('trip_members').insert({
        trip_id: trip.id,
        user_id: user.id,
        role: 'admin',
      });

      setCreatedTrip(trip as Trip);
      setStep('success');
    } catch (err) {
      setError('Unexpected error: ' + String(err));
      setStep('details');
    }
    setLoading(false);
  }

  function handleProceedToPayment(e: React.FormEvent) {
    e.preventDefault();

    if (!departureTime) {
      setError('Please select a departure date and time');
      return;
    }

    const departureDate = new Date(departureTime);
    if (isNaN(departureDate.getTime())) {
      setError('Invalid date');
      return;
    }

    setError('');
    // Save trip data for after payment
    const tripData = { name, description, departureTime };
    sessionStorage.setItem('pendingTripData', JSON.stringify(tripData));
    setStep('payment');
  }

  async function handlePayment() {
    setLoading(true);
    try {
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripName: name,
          userId: user?.id,
          email: user?.email,
          successUrl: `${window.location.origin}/dashboard?payment=success`,
          cancelUrl: `${window.location.origin}/dashboard?payment=cancelled`,
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        // Fallback to payment link if API fails
        const paymentLink = import.meta.env.VITE_STRIPE_PAYMENT_LINK;
        if (paymentLink) {
          window.location.href = paymentLink;
        } else {
          setError('Payment system unavailable. Please try again later.');
          setLoading(false);
        }
      }
    } catch (err) {
      // Fallback to direct payment link
      const paymentLink = import.meta.env.VITE_STRIPE_PAYMENT_LINK;
      if (paymentLink) {
        window.location.href = paymentLink;
      } else {
        setError('Payment failed. Please try again.');
        setLoading(false);
      }
    }
  }

  async function copyCode() {
    if (createdTrip) {
      await navigator.clipboard.writeText(createdTrip.lobby_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  // Success state
  if (step === 'success' && createdTrip) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="card p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Trip Created!</h2>
          <p className="text-white/60 mb-6">
            Share the lobby code with your group to invite them
          </p>

          <div className="bg-white/5 rounded-xl p-4 mb-6">
            <p className="text-sm text-white/50 mb-2">Lobby Code</p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-3xl font-mono font-bold tracking-wider">
                {createdTrip.lobby_code}
              </span>
              <button
                onClick={copyCode}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-green-400" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">
              Close
            </button>
            <Link
              to={`/trip/${createdTrip.id}`}
              className="btn-primary flex-1 text-center"
              onClick={onCreated}
            >
              Go to Trip
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Creating state (after payment)
  if (step === 'creating') {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="card p-8 max-w-md w-full text-center">
          <div className="animate-spin w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Creating your trip...</h2>
          <p className="text-white/60">
            Payment successful! Setting up your trip now.
          </p>
        </div>
      </div>
    );
  }

  // Payment step
  if (step === 'payment') {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="card p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold mb-2">Complete Payment</h2>
          <p className="text-white/60 mb-6">
            One-time payment to create your trip
          </p>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6 text-red-200 text-sm">
              {error}
            </div>
          )}

          <div className="bg-white/5 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-white/70">Trip: {name}</span>
              <span className="text-2xl font-bold">€24.99</span>
            </div>
            <ul className="space-y-2 text-sm text-white/60">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" />
                Unlimited group members
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" />
                AI-powered ticket scanning
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" />
                Automatic aftermovie generation
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" />
                Live location sharing
              </li>
            </ul>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('details')}
              className="btn-secondary flex-1"
            >
              Back
            </button>
            <button
              onClick={handlePayment}
              disabled={loading}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              <CreditCard className="w-5 h-5" />
              {loading ? 'Processing...' : 'Pay €24.99'}
            </button>
          </div>

          <p className="text-xs text-white/40 text-center mt-4">
            Secure payment powered by Stripe
          </p>
        </div>
      </div>
    );
  }

  // Details step (default)
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-6">Create New Trip</h2>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6 text-red-200 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleProceedToPayment} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Trip Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder="Weekend in Barcelona"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field resize-none"
              rows={3}
              placeholder="A short description of the trip..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Departure Date & Time
            </label>
            <input
              type="datetime-local"
              value={departureTime}
              onChange={(e) => setDepartureTime(e.target.value)}
              className="input-field"
              required
            />
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/70">Trip creation fee</span>
              <span className="font-bold">€24.99</span>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              Continue to Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
