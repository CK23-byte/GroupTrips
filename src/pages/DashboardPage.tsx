import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Plane,
  Users,
  Calendar,
  ChevronRight,
  LogOut,
  Copy,
  Check,
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
    if (!user) return;

    const { data: memberData } = await supabase
      .from('trip_members')
      .select('trip_id')
      .eq('user_id', user.id);

    if (memberData && memberData.length > 0) {
      const tripIds = memberData.map((m) => m.trip_id);

      const { data: tripsData } = await supabase
        .from('trips')
        .select('*, members:trip_members(*)')
        .in('id', tripIds)
        .order('departure_time', { ascending: true });

      if (tripsData) {
        setTrips(tripsData as (Trip & { members: TripMember[] })[]);
      }
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
      return { label: 'Voltooid', color: 'bg-gray-500' };
    }
    if (hoursUntil < 0) {
      return { label: 'Onderweg', color: 'bg-green-500' };
    }
    if (hoursUntil <= 24) {
      return { label: 'Binnenkort', color: 'bg-yellow-500' };
    }
    return { label: 'Gepland', color: 'bg-blue-500' };
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
            <span className="text-white/70">{user?.name}</span>
            <button
              onClick={handleSignOut}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
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
              Welkom terug, {user?.name?.split(' ')[0]}!
            </h1>
            <p className="text-white/60">Beheer je trips en bekijk aankomende reizen</p>
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
              Nieuwe Trip
            </button>
          </div>
        </div>

        {/* Trips Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-white/50">Trips laden...</p>
          </div>
        ) : trips.length === 0 ? (
          <div className="card p-12 text-center">
            <Plane className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Nog geen trips</h2>
            <p className="text-white/50 mb-6">
              Maak je eerste trip aan of join een bestaande trip met een lobby code
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary"
              >
                Maak Trip
              </button>
              <Link to="/join" className="btn-secondary">
                Join met Code
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
            {departure.toLocaleDateString('nl-NL', {
              day: 'numeric',
              month: 'short',
            })}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Users className="w-4 h-4" />
          <span>{trip.members?.length || 0} leden</span>
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
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdTrip, setCreatedTrip] = useState<Trip | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setError('');
    setLoading(true);

    const lobbyCode = generateLobbyCode();

    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .insert({
        name,
        description: description || null,
        lobby_code: lobbyCode,
        admin_id: user.id,
        departure_time: new Date(departureTime).toISOString(),
        status: 'planning',
      })
      .select()
      .single();

    if (tripError) {
      setError(tripError.message);
      setLoading(false);
      return;
    }

    // Add creator as admin member
    await supabase.from('trip_members').insert({
      trip_id: trip.id,
      user_id: user.id,
      role: 'admin',
    });

    setCreatedTrip(trip as Trip);
    setLoading(false);
  }

  async function copyCode() {
    if (createdTrip) {
      await navigator.clipboard.writeText(createdTrip.lobby_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (createdTrip) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="card p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Trip aangemaakt!</h2>
          <p className="text-white/60 mb-6">
            Deel de lobby code met je groep om ze uit te nodigen
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
              Sluiten
            </button>
            <Link
              to={`/trip/${createdTrip.id}`}
              className="btn-primary flex-1 text-center"
              onClick={onCreated}
            >
              Naar Trip
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-6">Nieuwe Trip Aanmaken</h2>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6 text-red-200 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Trip Naam
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder="Weekend Barcelona"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Beschrijving (optioneel)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field resize-none"
              rows={3}
              placeholder="Een korte beschrijving van de trip..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Vertrekdatum & tijd
            </label>
            <input
              type="datetime-local"
              value={departureTime}
              onChange={(e) => setDepartureTime(e.target.value)}
              className="input-field"
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              {loading ? 'Aanmaken...' : 'Aanmaken'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
