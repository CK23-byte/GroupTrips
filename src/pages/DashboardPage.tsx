import { useState, useEffect, useRef } from 'react';
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

// Debug logging - always on for now to diagnose issues
function debugLog(context: string, message: string, data?: unknown) {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, 12);
  console.log(`[${timestamp}][${context}] ${message}`, data !== undefined ? data : '');
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<(Trip & { members: TripMember[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [paymentReturnDetected, setPaymentReturnDetected] = useState(false);
  const [paymentSessionId, setPaymentSessionId] = useState<string | null>(null);
  const hasCheckedPayment = useRef(false);

  // Check for payment return on mount - but only once
  useEffect(() => {
    if (hasCheckedPayment.current) return;
    hasCheckedPayment.current = true;

    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const sessionId = urlParams.get('session_id');
    // Use localStorage instead of sessionStorage (more persistent across redirects)
    const savedTripData = localStorage.getItem('pendingTripData');
    const pendingPayment = localStorage.getItem('pendingPayment');

    debugLog('Dashboard', 'Payment check on mount', {
      paymentStatus,
      sessionId: sessionId ? `${sessionId.slice(0, 20)}...` : null,
      hasSavedTripData: !!savedTripData,
      savedTripDataPreview: savedTripData?.slice(0, 100),
      pendingPayment,
      url: window.location.href,
    });

    // If returning from payment with session_id, we can retrieve trip data from Stripe
    if (paymentStatus === 'success' && sessionId) {
      debugLog('Dashboard', 'Payment return with session_id - will verify via API');
      setPaymentSessionId(sessionId);
      setPaymentReturnDetected(true);
      setShowCreateModal(true);
    }
    // Payment Link flow: no session_id but payment=success
    // Try to use localStorage trip data, or verify via userId fallback
    else if (paymentStatus === 'success' || pendingPayment === 'true') {
      debugLog('Dashboard', 'Payment return detected - opening modal for verification');
      setPaymentReturnDetected(true);
      setShowCreateModal(true);
      // Modal will handle verification using localStorage or userId fallback
    } else if (paymentStatus === 'cancelled') {
      debugLog('Dashboard', 'Payment cancelled');
      window.history.replaceState({}, '', window.location.pathname);
      localStorage.removeItem('pendingPayment');
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadTrips();
    }
  }, [user]);

  async function loadTrips() {
    if (!user) {
      debugLog('loadTrips', 'No user, skipping');
      setLoading(false);
      return;
    }

    debugLog('loadTrips', 'Loading trips for user', user.id);

    try {
      // Use AbortController-style timeout with flag
      let timedOut = false;
      const timeoutId = setTimeout(() => {
        timedOut = true;
        debugLog('loadTrips', 'Query timed out after 8s');
        setLoading(false);
      }, 8000);

      const { data: memberData, error: memberError } = await supabase
        .from('trip_members')
        .select('trip_id')
        .eq('user_id', user.id);

      if (timedOut) {
        debugLog('loadTrips', 'Query completed after timeout, ignoring');
        return;
      }
      clearTimeout(timeoutId);

      debugLog('loadTrips', 'Member data', { count: memberData?.length, error: memberError?.message });

      if (memberError) {
        console.error('[loadTrips] Error fetching memberships:', memberError);
        setLoading(false);
        return;
      }

      if (memberData && memberData.length > 0) {
        const tripIds = memberData.map((m: { trip_id: string }) => m.trip_id);
        debugLog('loadTrips', 'Fetching trips', tripIds);

        const { data: tripsData, error: tripsError } = await supabase
          .from('trips')
          .select('*, members:trip_members(*)')
          .in('id', tripIds)
          .order('departure_time', { ascending: true });

        debugLog('loadTrips', 'Trips result', { count: tripsData?.length, error: tripsError?.message });

        if (tripsError) {
          console.error('[loadTrips] Error fetching trips:', tripsError);
        } else if (tripsData) {
          setTrips(tripsData as (Trip & { members: TripMember[] })[]);
        }
      } else {
        debugLog('loadTrips', 'No memberships found');
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error('[loadTrips] Unexpected error:', errMsg);
      debugLog('loadTrips', 'Error (possibly timeout)', errMsg);
      // Don't show error to user for loadTrips - just fail silently and show empty state
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
          onClose={() => {
            setShowCreateModal(false);
            setPaymentReturnDetected(false);
            setPaymentSessionId(null);
          }}
          onCreated={() => {
            setShowCreateModal(false);
            setPaymentReturnDetected(false);
            setPaymentSessionId(null);
            loadTrips();
          }}
          isPaymentReturn={paymentReturnDetected}
          sessionId={paymentSessionId}
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
  isPaymentReturn,
  sessionId,
}: {
  onClose: () => void;
  onCreated: () => void;
  isPaymentReturn: boolean;
  sessionId: string | null;
}) {
  const { user } = useAuth();
  const [step, setStep] = useState<'details' | 'payment' | 'creating' | 'success'>('details');
  const [name, setName] = useState('');
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [returnTime, setReturnTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [createdTrip, setCreatedTrip] = useState<Trip | null>(null);
  const [copied, setCopied] = useState(false);
  const hasProcessedPayment = useRef(false);

  // Add debug info
  function addDebug(msg: string) {
    debugLog('CreateTripModal', msg);
    setDebugInfo(prev => [...prev, `${new Date().toISOString().split('T')[1].slice(0, 8)}: ${msg}`]);
  }

  // Check for payment success on mount
  useEffect(() => {
    addDebug(`Modal mounted. isPaymentReturn=${isPaymentReturn}, sessionId=${sessionId ? 'present' : 'null'}, user=${user?.id || 'null'}, hasProcessed=${hasProcessedPayment.current}`);

    // If not a payment return, don't do anything special
    if (!isPaymentReturn) {
      addDebug('Not a payment return, showing details form');
      return;
    }

    // Prevent double processing
    if (hasProcessedPayment.current) {
      addDebug('Already processed payment, skipping');
      return;
    }

    // Wait for user to be loaded
    if (!user) {
      addDebug('User not loaded yet, waiting...');
      return;
    }

    // Mark as processed
    hasProcessedPayment.current = true;

    // Clear URL params immediately
    window.history.replaceState({}, '', window.location.pathname);

    // If we have a session_id, verify payment via API and get trip data from Stripe metadata
    if (sessionId) {
      addDebug('Verifying payment via API with session_id...');
      setStep('creating');
      setLoading(true);

      fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
        .then(res => res.json())
        .then(data => {
          addDebug(`API response: ${JSON.stringify(data)}`);

          if (data.success && data.tripName) {
            // Got trip data from Stripe metadata
            const tripData = {
              name: data.tripName,
              groupName: data.groupName || '',
              description: data.description || '',
              departureTime: data.departureTime || '',
              returnTime: data.returnTime || '',
            };

            addDebug(`Trip data from Stripe: ${JSON.stringify(tripData)}`);

            // Populate form fields
            setName(tripData.name);
            setGroupName(tripData.groupName);
            setDescription(tripData.description);

            if (tripData.departureTime) {
              const [date, time] = tripData.departureTime.split('T');
              setDepartureDate(date || '');
              setDepartureTime(time?.slice(0, 5) || '');
            }
            if (tripData.returnTime) {
              const [date, time] = tripData.returnTime.split('T');
              setReturnDate(date || '');
              setReturnTime(time?.slice(0, 5) || '');
            }

            // Clear localStorage
            localStorage.removeItem('pendingTripData');
            localStorage.removeItem('pendingPayment');

            // Create the trip
            createTripAfterPayment(tripData);
          } else {
            // API verification failed, try localStorage as fallback
            addDebug('API verification failed, trying localStorage fallback');
            tryLocalStorageFallback();
          }
        })
        .catch(err => {
          addDebug(`API error: ${err}, trying localStorage fallback`);
          tryLocalStorageFallback();
        });

      return;
    }

    // No session_id (Payment Link flow) - verify payment via userId and use localStorage for trip data
    addDebug('No session_id - Payment Link flow, verifying via userId...');
    setStep('creating');
    setLoading(true);

    // First, verify payment was made for this user
    fetch('/api/verify-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id }),
    })
      .then(res => res.json())
      .then(data => {
        addDebug(`Payment verification response: ${JSON.stringify(data)}`);

        if (data.success) {
          addDebug('Payment verified for user, now checking localStorage for trip data');
          tryLocalStorageFallback();
        } else {
          addDebug('Payment verification failed');
          setError('Could not verify payment. If you paid, please contact support.');
          setStep('details');
          setLoading(false);
        }
      })
      .catch(err => {
        addDebug(`Payment verification error: ${err}`);
        // Still try localStorage as fallback
        tryLocalStorageFallback();
      });

    async function tryLocalStorageFallback() {
      // First try to fetch from Supabase pending_trips table
      if (user?.id) {
        addDebug(`Checking Supabase pending_trips for user ${user.id}`);
        const { data: pendingTrip, error: fetchError } = await supabase
          .from('pending_trips')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (!fetchError && pendingTrip) {
          addDebug(`Found pending trip in Supabase: ${JSON.stringify(pendingTrip)}`);

          // Delete the pending trip from Supabase
          await supabase.from('pending_trips').delete().eq('user_id', user.id);
          localStorage.removeItem('pendingTripData');
          localStorage.removeItem('pendingPayment');

          const tripData = {
            name: pendingTrip.name,
            groupName: pendingTrip.group_name || '',
            description: pendingTrip.description || '',
            departureTime: pendingTrip.departure_time,
            returnTime: pendingTrip.return_time,
          };

          // Populate form fields
          setName(tripData.name || '');
          setGroupName(tripData.groupName || '');
          setDescription(tripData.description || '');

          if (tripData.departureTime) {
            const dt = new Date(tripData.departureTime);
            setDepartureDate(dt.toISOString().split('T')[0]);
            setDepartureTime(dt.toTimeString().slice(0, 5));
          }
          if (tripData.returnTime) {
            const rt = new Date(tripData.returnTime);
            setReturnDate(rt.toISOString().split('T')[0]);
            setReturnTime(rt.toTimeString().slice(0, 5));
          }

          setStep('creating');
          addDebug('Starting trip creation from Supabase data...');
          createTripAfterPayment(tripData);
          return;
        } else {
          addDebug(`Supabase fetch failed or empty: ${fetchError?.message || 'no data'}`);
        }
      }

      // Fallback to localStorage
      const savedTripData = localStorage.getItem('pendingTripData');
      addDebug(`localStorage fallback: hasTripData=${!!savedTripData}`);

      if (!savedTripData) {
        addDebug('ERROR: No saved trip data found in localStorage or Supabase!');
        setError('Payment was successful but trip data was lost. This can happen if you used a different browser tab. Please create the trip again - you will NOT be charged twice.');
        setStep('details');
        setLoading(false);
        return;
      }

      try {
        const tripData = JSON.parse(savedTripData);
        addDebug(`Parsed trip data from localStorage: ${JSON.stringify(tripData)}`);

        // Clear localStorage to prevent re-triggering
        localStorage.removeItem('pendingTripData');
        localStorage.removeItem('pendingPayment');

        // Populate form fields
        setName(tripData.name || '');
        setGroupName(tripData.groupName || '');
        setDescription(tripData.description || '');

        if (tripData.departureTime) {
          const [date, time] = tripData.departureTime.split('T');
          setDepartureDate(date || '');
          setDepartureTime(time?.slice(0, 5) || '');
        }
        if (tripData.returnTime) {
          const [date, time] = tripData.returnTime.split('T');
          setReturnDate(date || '');
          setReturnTime(time?.slice(0, 5) || '');
        }

        // Set to creating state and create trip
        setStep('creating');
        addDebug('Starting trip creation from localStorage...');
        createTripAfterPayment(tripData);

      } catch (err) {
        addDebug(`ERROR parsing trip data: ${err}`);
        setError('Failed to parse trip data. Please try again.');
        setStep('details');
        setLoading(false);
      }
    }
  }, [isPaymentReturn, sessionId, user]);

  async function createTripAfterPayment(tripData: { name: string; groupName?: string; description: string; departureTime: string; returnTime?: string }) {
    addDebug('createTripAfterPayment called');

    if (!user) {
      addDebug('ERROR: No user available');
      setError('User not logged in. Please refresh and try again.');
      setStep('details');
      return;
    }

    setLoading(true);
    setError('');

    // Flag-based timeout to prevent indefinite hanging
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      if (!timedOut) {
        timedOut = true;
        addDebug('TIMEOUT: Trip creation timed out after 15s');
        setError('Database connection timed out. Please check your internet connection and try again. If the problem persists, there may be an issue with the database configuration.');
        setStep('details');
        setLoading(false);
      }
    }, 15000); // 15 second overall timeout

    try {
      addDebug(`Creating trip: ${tripData.name}`);

      const departureDateObj = new Date(tripData.departureTime);
      if (isNaN(departureDateObj.getTime())) {
        throw new Error(`Invalid departure date: ${tripData.departureTime}`);
      }
      addDebug(`Departure date parsed: ${departureDateObj.toISOString()}`);

      let returnDateObj: Date | null = null;
      if (tripData.returnTime) {
        returnDateObj = new Date(tripData.returnTime);
        if (isNaN(returnDateObj.getTime())) {
          addDebug(`Invalid return date, ignoring: ${tripData.returnTime}`);
          returnDateObj = null;
        }
      }

      const lobbyCode = generateLobbyCode();
      addDebug(`Generated lobby code: ${lobbyCode}`);

      const insertData = {
        name: tripData.name,
        group_name: tripData.groupName || null,
        description: tripData.description || null,
        lobby_code: lobbyCode,
        admin_id: user.id,
        departure_time: departureDateObj.toISOString(),
        return_time: returnDateObj?.toISOString() || null,
        status: 'planning' as const,
      };
      addDebug(`Insert data: ${JSON.stringify(insertData)}`);

      addDebug('Sending insert query...');
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .insert(insertData)
        .select()
        .single();

      // Check if we already timed out
      if (timedOut) {
        addDebug('Query completed after timeout, ignoring result');
        return;
      }

      if (tripError) {
        addDebug(`ERROR creating trip: ${tripError.message} (${tripError.code})`);
        console.error('[createTripAfterPayment] Trip error:', tripError);
        setError(`Failed to create trip: ${tripError.message}`);
        setStep('details');
        setLoading(false);
        clearTimeout(timeoutId);
        return;
      }

      addDebug(`Trip created successfully: ${trip.id}`);

      // Add creator as admin member
      addDebug('Adding member...');
      const { error: memberError } = await supabase.from('trip_members').insert({
        trip_id: trip.id,
        user_id: user.id,
        role: 'admin',
      });

      // Check if we timed out during member insert
      if (timedOut) {
        addDebug('Member insert completed after timeout');
        return;
      }

      if (memberError) {
        addDebug(`WARNING: Failed to add member: ${memberError.message}`);
        console.error('[createTripAfterPayment] Member error:', memberError);
        // Don't fail - trip was created
      } else {
        addDebug('Member added successfully');
      }

      clearTimeout(timeoutId);
      setCreatedTrip(trip as Trip);
      setStep('success');
      addDebug('Trip creation complete!');

    } catch (err) {
      clearTimeout(timeoutId);
      if (timedOut) return;

      const errMsg = err instanceof Error ? err.message : String(err);
      addDebug(`EXCEPTION: ${errMsg}`);
      console.error('[createTripAfterPayment] Unexpected error:', err);
      setError(`Unexpected error: ${errMsg}`);
      setStep('details');
    } finally {
      if (!timedOut) {
        setLoading(false);
      }
    }
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

    // Save trip data for after payment
    const tripData = {
      name: name.trim(),
      groupName: groupName.trim(),
      description: description.trim(),
      departureTime: departureDateTimeStr,
      returnTime: returnDateTimeStr
    };

    // Save to Supabase pending_trips table (survives cross-domain redirects)
    if (user?.id) {
      addDebug(`Saving trip data to Supabase pending_trips for user ${user.id}`);
      const { error: upsertError } = await supabase
        .from('pending_trips')
        .upsert({
          user_id: user.id,
          name: tripData.name,
          group_name: tripData.groupName,
          description: tripData.description,
          departure_time: tripData.departureTime,
          return_time: tripData.returnTime,
        }, { onConflict: 'user_id' });

      if (upsertError) {
        addDebug(`Failed to save to Supabase: ${upsertError.message}, falling back to localStorage`);
      } else {
        addDebug('Trip data saved to Supabase successfully');
      }
    }

    // Also save to localStorage as backup
    addDebug(`Saving trip data to localStorage: ${JSON.stringify(tripData)}`);
    localStorage.setItem('pendingTripData', JSON.stringify(tripData));
    setStep('payment');
  }

  async function handlePayment() {
    addDebug('handlePayment called');
    setLoading(true);

    // Use Payment Link first if configured (supports coupon codes)
    const paymentLink = import.meta.env.VITE_STRIPE_PAYMENT_LINK;
    if (paymentLink) {
      addDebug('Using Payment Link (supports coupon codes)');
      const url = new URL(paymentLink);
      if (user?.id) {
        url.searchParams.set('client_reference_id', user.id);
      }
      if (user?.email) {
        url.searchParams.set('prefilled_email', user.email);
      }

      localStorage.setItem('pendingPayment', 'true');
      addDebug(`Redirecting to Stripe Payment Link: ${url.toString()}`);
      window.location.href = url.toString();
      return;
    }

    // Fallback to API if no Payment Link configured
    addDebug('No Payment Link configured, using API');
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
      addDebug(`API response: ${JSON.stringify(data)}`);

      if (data.url) {
        localStorage.setItem('pendingPayment', 'true');
        window.location.href = data.url;
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

  // Creating state (after payment)
  if (step === 'creating') {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="card p-8 max-w-md w-full text-center">
          {loading ? (
            <>
              <div className="animate-spin w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Creating your trip...</h2>
              <p className="text-white/60">
                Payment successful! Setting up your trip now.
              </p>
            </>
          ) : error ? (
            <>
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">❌</span>
              </div>
              <h2 className="text-xl font-bold mb-2">Error Creating Trip</h2>
              <p className="text-red-400 mb-4">{error}</p>
              <button onClick={() => setStep('details')} className="btn-primary">
                Try Again
              </button>
            </>
          ) : null}

          {/* Debug info - always show for troubleshooting */}
          {debugInfo.length > 0 && (
            <div className="mt-4 p-3 bg-black/30 rounded-lg text-left text-xs font-mono max-h-40 overflow-y-auto">
              <p className="text-white/50 mb-1">Debug Log:</p>
              {debugInfo.map((info, i) => (
                <p key={i} className="text-white/70">{info}</p>
              ))}
            </div>
          )}
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

        {/* Debug info for troubleshooting */}
        {debugInfo.length > 0 && (
          <div className="mt-4 p-3 bg-black/30 rounded-lg text-left text-xs font-mono max-h-32 overflow-y-auto">
            <p className="text-white/50 mb-1">Debug:</p>
            {debugInfo.slice(-5).map((info, i) => (
              <p key={i} className="text-white/70">{info}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
