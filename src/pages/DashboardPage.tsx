import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
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
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, generateLobbyCode } from '../lib/supabase';
import type { Trip, TripMember } from '../types';

// Debug logging - always on for now to diagnose issues
function debugLog(context: string, message: string, data?: unknown) {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, 12);
  console.log(`[${timestamp}][${context}] ${message}`, data !== undefined ? data : '');
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [trips, setTrips] = useState<(Trip & { members: TripMember[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Payment verification state (separate from create modal)
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const hasProcessedPayment = useRef(false);

  // Check for payment return on mount
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const paymentSuccess = params.get('payment') === 'success';
    const sessionId = params.get('session_id');
    const paymentCancelled = params.get('payment') === 'cancelled';

    debugLog('Dashboard', 'Component mounted', {
      user: user?.id,
      hasPaymentParam: paymentSuccess,
      hasSessionId: !!sessionId,
      paymentCancelled,
    });

    // Handle cancelled payment
    if (paymentCancelled) {
      debugLog('Dashboard', 'Payment cancelled');
      window.history.replaceState({}, '', '/dashboard');
      localStorage.removeItem('pendingPayment');
      localStorage.removeItem('pendingTripData');
      return;
    }

    // Handle successful payment
    if (paymentSuccess && user?.id && !hasProcessedPayment.current) {
      hasProcessedPayment.current = true;
      handlePaymentVerification(sessionId);
    }
  }, [user, location.search]);

  // Load trips when user is available
  useEffect(() => {
    if (user && !isVerifyingPayment) {
      loadTripsWithRetry();
    }
  }, [user, isVerifyingPayment]);

  async function handlePaymentVerification(sessionId: string | null) {
    debugLog('Dashboard', 'Starting payment verification', { sessionId: sessionId ? 'present' : 'null' });

    // Clean URL immediately
    window.history.replaceState({}, '', '/dashboard');

    // Show loading overlay
    setIsVerifyingPayment(true);
    setPaymentError(null);

    try {
      const requestBody = sessionId
        ? { sessionId }
        : { userId: user?.id };

      debugLog('Dashboard', 'Calling verify-payment API', requestBody);

      const response = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      debugLog('Dashboard', 'Payment verification response', data);

      // Clear localStorage
      localStorage.removeItem('pendingTripData');
      localStorage.removeItem('pendingPayment');

      if (data.success && data.tripCreated && data.tripId) {
        debugLog('Dashboard', 'Trip created successfully, navigating to trip', data.tripId);
        navigate(`/trip/${data.tripId}`);
        return;
      }

      if (data.paymentVerified && !data.tripCreated) {
        // Payment verified but trip creation failed - try client-side fallback
        debugLog('Dashboard', 'Payment verified but trip not created, trying fallback');
        await tryClientSideTripCreation();
        return;
      }

      // Payment verification failed
      throw new Error(data.error || 'Payment verification failed');

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Payment verification failed';
      debugLog('Dashboard', 'Payment verification error', errorMsg);
      setPaymentError(errorMsg);
      setIsVerifyingPayment(false);
    }
  }

  async function tryClientSideTripCreation() {
    debugLog('Dashboard', 'Attempting client-side trip creation');

    const savedTripData = localStorage.getItem('pendingTripData');

    if (!savedTripData) {
      // Check Supabase pending_trips
      if (user?.id) {
        const { data: pendingTrip } = await supabase
          .from('pending_trips')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (pendingTrip) {
          await createTrip({
            name: pendingTrip.name,
            groupName: pendingTrip.group_name || '',
            description: pendingTrip.description || '',
            departureTime: pendingTrip.departure_time,
            returnTime: pendingTrip.return_time,
          });
          return;
        }
      }

      setPaymentError('Payment was successful but trip data was lost. Please contact support with your payment confirmation.');
      setIsVerifyingPayment(false);
      return;
    }

    try {
      const tripData = JSON.parse(savedTripData);
      localStorage.removeItem('pendingTripData');
      await createTrip(tripData);
    } catch (err) {
      debugLog('Dashboard', 'Failed to parse trip data', err);
      setPaymentError('Failed to create trip. Please contact support.');
      setIsVerifyingPayment(false);
    }
  }

  async function createTrip(tripData: { name: string; groupName?: string; description: string; departureTime: string; returnTime?: string }) {
    if (!user) {
      setPaymentError('User not logged in. Please refresh and try again.');
      setIsVerifyingPayment(false);
      return;
    }

    try {
      const departureDateObj = new Date(tripData.departureTime);
      if (isNaN(departureDateObj.getTime())) {
        throw new Error('Invalid departure date');
      }

      let returnDateObj: Date | null = null;
      if (tripData.returnTime) {
        returnDateObj = new Date(tripData.returnTime);
        if (isNaN(returnDateObj.getTime())) {
          returnDateObj = null;
        }
      }

      const lobbyCode = generateLobbyCode();

      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .insert({
          name: tripData.name,
          group_name: tripData.groupName || null,
          description: tripData.description || null,
          lobby_code: lobbyCode,
          admin_id: user.id,
          departure_time: departureDateObj.toISOString(),
          return_time: returnDateObj?.toISOString() || null,
          status: 'planning',
        })
        .select()
        .single();

      if (tripError) throw tripError;

      // Add creator as admin member
      await supabase.from('trip_members').insert({
        trip_id: trip.id,
        user_id: user.id,
        role: 'admin',
      });

      debugLog('Dashboard', 'Trip created successfully', trip.id);
      navigate(`/trip/${trip.id}`);

    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      debugLog('Dashboard', 'Trip creation error', errMsg);
      setPaymentError(`Failed to create trip: ${errMsg}`);
      setIsVerifyingPayment(false);
    }
  }

  async function loadTripsWithRetry(retries = 2) {
    for (let i = 0; i <= retries; i++) {
      try {
        await loadTrips();
        return; // Success
      } catch (error) {
        debugLog('loadTrips', `Attempt ${i + 1} failed`, error);
        if (i === retries) {
          setLoadError('Unable to load trips. Please check your connection and try again.');
        } else {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
  }

  async function loadTrips() {
    if (!user?.id) {
      debugLog('loadTrips', 'No user ID, skipping');
      setLoading(false);
      return;
    }

    debugLog('loadTrips', 'Starting query', { userId: user.id, timestamp: new Date().toISOString() });
    setLoading(true);
    setLoadError(null);

    // Shorter timeout - fail fast
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s max

    try {
      // Optimized single query using trip_members join
      const { data: memberData, error: memberError } = await supabase
        .from('trip_members')
        .select(`
          trip_id,
          role,
          trips!inner (
            id,
            name,
            destination,
            departure_time,
            return_time,
            lobby_code,
            status,
            cover_image_url,
            group_name,
            created_at
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { referencedTable: 'trips', ascending: false });

      clearTimeout(timeoutId);

      if (memberError) {
        console.error('[loadTrips] Query error:', memberError);
        throw memberError;
      }

      if (!memberData || memberData.length === 0) {
        debugLog('loadTrips', 'No trips found');
        setTrips([]);
        setLoading(false);
        return;
      }

      // Extract trips and add member count
      const tripsWithMembers = memberData.map(m => {
        const trip = m.trips as unknown as Trip;
        return {
          ...trip,
          members: [] as TripMember[], // Will fetch member counts separately if needed
        };
      });

      // Deduplicate by trip ID (in case of multiple memberships)
      const uniqueTrips = tripsWithMembers.filter((trip, index, self) =>
        index === self.findIndex(t => t.id === trip.id)
      );

      // Fetch member counts for all trips in parallel
      const tripIds = uniqueTrips.map(t => t.id);
      const { data: allMembers } = await supabase
        .from('trip_members')
        .select('trip_id')
        .in('trip_id', tripIds);

      // Count members per trip
      const memberCounts: Record<string, number> = {};
      allMembers?.forEach(m => {
        memberCounts[m.trip_id] = (memberCounts[m.trip_id] || 0) + 1;
      });

      // Add member counts to trips
      const tripsWithCounts = uniqueTrips.map(trip => ({
        ...trip,
        members: Array(memberCounts[trip.id] || 1).fill({}) as TripMember[],
      }));

      debugLog('loadTrips', 'Success', { count: tripsWithCounts.length });
      setTrips(tripsWithCounts);

    } catch (err) {
      clearTimeout(timeoutId);
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error('[loadTrips] Error:', errMsg);
      throw err;
    } finally {
      setLoading(false);
    }
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
      {/* Payment Verification Overlay - NOT a modal, full screen overlay */}
      {isVerifyingPayment && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-slate-800 border border-white/10 p-8 rounded-2xl text-center max-w-md mx-4">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-500" />
            <h3 className="text-xl font-bold text-white mb-2">Creating Your Trip...</h3>
            <p className="text-white/70">Please wait while we set everything up</p>
          </div>
        </div>
      )}

      {/* Payment Error Overlay */}
      {paymentError && !isVerifyingPayment && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-slate-800 border border-red-500/30 p-8 rounded-2xl text-center max-w-md mx-4">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Payment Issue</h3>
            <p className="text-red-400 mb-6">{paymentError}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setPaymentError(null)}
                className="btn-secondary"
              >
                Close
              </button>
              <a
                href="mailto:support@grouptrips.io"
                className="btn-primary"
              >
                Contact Support
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-lg sticky top-0 z-40">
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

        {/* Load Error */}
        {loadError && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <span className="text-red-200">{loadError}</span>
            </div>
            <button
              onClick={() => loadTripsWithRetry()}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-500/30 hover:bg-red-500/40 text-red-200 rounded-lg text-sm transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        )}

        {/* Trips Grid */}
        {loading || authLoading ? (
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
            loadTripsWithRetry();
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
  return (
    <Link
      to={`/trip/${trip.id}`}
      className="card card-hover p-6 group"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg group-hover:text-blue-400 transition-colors">
            {trip.name}
          </h3>
          {trip.group_name && (
            <p className="text-sm text-white/50">{trip.group_name}</p>
          )}
        </div>
        <span className={`px-2 py-1 rounded-full text-xs ${status.color}`}>
          {status.label}
        </span>
      </div>

      <div className="space-y-2 text-sm text-white/60">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          {new Date(trip.departure_time).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </div>
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          {trip.members?.length || 0} members
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
        <span className="text-xs text-white/40">Code: {trip.lobby_code}</span>
        <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white/60 transition-colors" />
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
  const [step, setStep] = useState<'details' | 'payment' | 'success'>('details');
  const [name, setName] = useState('');
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [returnTime, setReturnTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdTrip, setCreatedTrip] = useState<Trip | null>(null);
  const [copied, setCopied] = useState(false);

  // Suppress unused variable warnings - these are used in success state
  void onCreated;
  void createdTrip;
  void setCreatedTrip;
  void copied;
  void setCopied;

  function addDebug(msg: string) {
    debugLog('CreateTripModal', msg);
  }

  async function handleProceedToPayment(e: React.FormEvent) {
    e.preventDefault();
    addDebug('handleProceedToPayment called');

    if (!name.trim()) {
      setError('Please enter a trip name');
      return;
    }

    if (!departureDate) {
      setError('Please select a departure date');
      return;
    }

    // Combine date and time fields
    const departureDateTimeStr = `${departureDate}T${departureTime || '12:00'}`;
    const departureDateObj = new Date(departureDateTimeStr);
    if (isNaN(departureDateObj.getTime())) {
      setError('Invalid departure date');
      return;
    }

    // Validate return date if provided
    let returnDateTimeStr: string | undefined;
    if (returnDate) {
      returnDateTimeStr = `${returnDate}T${returnTime || '12:00'}`;
      const returnDateObj = new Date(returnDateTimeStr);
      if (isNaN(returnDateObj.getTime())) {
        setError('Invalid return date');
        return;
      }
      if (returnDateObj < departureDateObj) {
        setError('Return date must be after departure date');
        return;
      }
    }

    setError('');
    setLoading(true);

    // Save trip data for after payment
    const tripData = {
      name: name.trim(),
      groupName: groupName.trim(),
      description: description.trim(),
      departureTime: departureDateTimeStr,
      returnTime: returnDateTimeStr
    };

    // Save to localStorage FIRST (guaranteed to work, fast)
    addDebug(`Saving trip data to localStorage`);
    localStorage.setItem('pendingTripData', JSON.stringify(tripData));

    // Save to Supabase pending_trips table (fire and forget)
    if (user?.id) {
      supabase
        .from('pending_trips')
        .upsert({
          user_id: user.id,
          name: tripData.name,
          group_name: tripData.groupName,
          description: tripData.description,
          departure_time: tripData.departureTime,
          return_time: tripData.returnTime,
        }, { onConflict: 'user_id' })
        .then(({ error: upsertError }) => {
          if (upsertError) {
            addDebug(`Failed to save to Supabase: ${upsertError.message}`);
          }
        });
    }

    setLoading(false);
    setStep('payment');
  }

  async function handlePayment() {
    addDebug('handlePayment called');
    setLoading(true);
    setError('');

    const paymentLink = import.meta.env.VITE_STRIPE_PAYMENT_LINK;
    if (paymentLink) {
      try {
        const url = new URL(paymentLink);
        if (user?.id) {
          url.searchParams.set('client_reference_id', user.id);
        }
        if (user?.email) {
          url.searchParams.set('prefilled_email', user.email);
        }

        localStorage.setItem('pendingPayment', 'true');
        addDebug(`Redirecting to Stripe Payment Link`);
        window.location.href = url.toString();
        return;
      } catch (urlError) {
        addDebug(`Invalid payment link URL: ${urlError}`);
      }
    }

    // Fallback to API
    const savedTripData = localStorage.getItem('pendingTripData');
    let tripData: { name: string; groupName: string; description: string; departureTime: string; returnTime?: string } | null = null;

    if (savedTripData) {
      try {
        tripData = JSON.parse(savedTripData);
      } catch {
        addDebug('Failed to parse saved trip data');
      }
    }

    try {
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripName: tripData?.name || name,
          userId: user?.id,
          email: user?.email,
          groupName: tripData?.groupName || groupName,
          description: tripData?.description || description,
          departureTime: tripData?.departureTime || `${departureDate}T${departureTime || '12:00'}`,
          returnTime: tripData?.returnTime || (returnDate ? `${returnDate}T${returnTime || '12:00'}` : ''),
          successUrl: `${window.location.origin}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/dashboard?payment=cancelled`,
        }),
      });

      const data = await response.json();

      if (data.url) {
        localStorage.setItem('pendingPayment', 'true');
        window.location.href = data.url;
        return;
      } else if (data.error) {
        setError(`Payment error: ${data.error}`);
        setLoading(false);
        return;
      }
    } catch (err) {
      addDebug(`API error: ${err}`);
    }

    setError('Payment system unavailable. Please try again later.');
    setLoading(false);
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
            Share the lobby code with your group
          </p>

          <div className="bg-white/5 rounded-xl p-4 mb-6">
            <p className="text-sm text-white/50 mb-2">Lobby Code</p>
            <div className="flex items-center justify-center gap-3">
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
              <div className="text-left">
                <span className="text-white/70">Trip: {name}</span>
                {groupName && <p className="text-sm text-white/50">Group: {groupName}</p>}
              </div>
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
                Aftermovie generation
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" />
                Real-time location sharing
              </li>
            </ul>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('details')}
              className="btn-secondary flex-1"
              disabled={loading}
            >
              Back
            </button>
            <button
              onClick={handlePayment}
              disabled={loading}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  Pay €24.99
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Details form (default step)
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-2">Create New Trip</h2>
        <p className="text-white/60 mb-6">
          Plan your group adventure
        </p>

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
              Group Name (optional)
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="input-field"
              placeholder="The Boys, Family Trip, etc."
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
              rows={2}
              placeholder="A short description of the trip..."
            />
          </div>

          {/* Date Range Picker */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <label className="block text-sm font-medium text-white/70 mb-3">
              Trip Dates
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Departure */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-white/50">
                  <Plane className="w-3 h-3" />
                  <span>Departure</span>
                </div>
                <input
                  type="date"
                  value={departureDate}
                  onChange={(e) => {
                    setDepartureDate(e.target.value);
                    if (!returnDate && e.target.value) {
                      const nextDay = new Date(e.target.value);
                      nextDay.setDate(nextDay.getDate() + 1);
                      setReturnDate(nextDay.toISOString().split('T')[0]);
                    }
                  }}
                  min={new Date().toISOString().split('T')[0]}
                  className="input-field text-center"
                  required
                />
                <input
                  type="time"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  className="input-field text-center text-sm"
                  placeholder="Time (optional)"
                />
              </div>

              {/* Return */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-white/50">
                  <Plane className="w-3 h-3 rotate-180" />
                  <span>Return</span>
                </div>
                <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  min={departureDate || new Date().toISOString().split('T')[0]}
                  className="input-field text-center"
                />
                <input
                  type="time"
                  value={returnTime}
                  onChange={(e) => setReturnTime(e.target.value)}
                  className="input-field text-center text-sm"
                  placeholder="Time (optional)"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1">
              Continue to Payment
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
