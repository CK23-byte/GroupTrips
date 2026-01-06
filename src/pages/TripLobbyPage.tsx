import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Plane,
  Users,
  Calendar,
  Clock,
  MapPin,
  MessageSquare,
  Camera,
  FileText,
  Settings,
  Share2,
  Check,
  ChevronLeft,
  Bell,
  Navigation,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type {
  Trip,
  TripMember,
  TripMessage,
  ScheduleItem,
  Ticket,
} from '../types';
import { getTicketRevealStatus } from '../types';
import TicketReveal from '../components/TicketReveal';
import Timeline from '../components/Timeline';
import MembersList from '../components/MembersList';
import MessagesPanel from '../components/MessagesPanel';

type Tab = 'overview' | 'tickets' | 'schedule' | 'members' | 'location' | 'media' | 'messages';

export default function TripLobbyPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const { user } = useAuth();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [messages, setMessages] = useState<TripMessage[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (tripId && user) {
      loadTripData();
    }
  }, [tripId, user]);

  async function loadTripData() {
    if (!tripId || !user) return;

    console.log('[TripLobby] Loading data for trip:', tripId);

    try {
      // Load trip
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single();

      console.log('[TripLobby] Trip:', tripData, 'Error:', tripError);

      if (tripData) {
        setTrip(tripData as Trip);
      }

      // Load members
      const { data: membersData, error: membersError } = await supabase
        .from('trip_members')
        .select('*, user:users(*)')
        .eq('trip_id', tripId);

      console.log('[TripLobby] Members:', membersData, 'Error:', membersError);

      if (membersData) {
        setMembers(membersData as TripMember[]);
        const userMember = membersData.find((m) => m.user_id === user.id);
        setIsAdmin(userMember?.role === 'admin');
      }

      // Load messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('trip_messages')
        .select('*, sender:users(*)')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false })
        .limit(50);

      console.log('[TripLobby] Messages:', messagesData?.length, 'Error:', messagesError);

      if (messagesData) {
        setMessages(messagesData as TripMessage[]);
      }

      // Load schedule
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('schedule_items')
        .select('*')
        .eq('trip_id', tripId)
        .order('start_time', { ascending: true });

      console.log('[TripLobby] Schedule:', scheduleData?.length, 'Error:', scheduleError);

      if (scheduleData) {
        setSchedule(scheduleData as ScheduleItem[]);
      }

      // Load user's ticket - use maybeSingle to avoid 406 error when no ticket exists
      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .select('*')
        .eq('trip_id', tripId)
        .eq('member_id', user.id)
        .maybeSingle();

      console.log('[TripLobby] Ticket:', ticketData, 'Error:', ticketError);

      if (ticketData) {
        setTicket(ticketData as Ticket);
      }
    } catch (err) {
      console.error('[TripLobby] Unexpected error:', err);
    }

    setLoading(false);
  }

  async function copyLobbyCode() {
    if (trip) {
      await navigator.clipboard.writeText(trip.lobby_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-white/50">Loading trip...</p>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/50 mb-4">Trip not found</p>
          <Link to="/dashboard" className="btn-primary">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const departure = new Date(trip.departure_time);
  const revealStatus = ticket ? getTicketRevealStatus(trip.departure_time) : 'hidden';

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/dashboard"
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold">{trip.name}</h1>
                <div className="flex items-center gap-2 text-sm text-white/50">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {departure.toLocaleDateString('en-US', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isAdmin && (
                <button
                  onClick={copyLobbyCode}
                  className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-sm"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Share2 className="w-4 h-4" />
                  )}
                  <span className="font-mono">{trip.lobby_code}</span>
                </button>
              )}
              {isAdmin && (
                <Link
                  to={`/trip/${tripId}/admin`}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Settings className="w-5 h-5" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Countdown Banner */}
      <CountdownBanner departureTime={trip.departure_time} />

      {/* Navigation Tabs */}
      <div className="border-b border-white/10 bg-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex gap-1 overflow-x-auto">
            <TabButton
              active={activeTab === 'overview'}
              onClick={() => setActiveTab('overview')}
              icon={<Plane className="w-4 h-4" />}
              label="Overview"
            />
            <TabButton
              active={activeTab === 'tickets'}
              onClick={() => setActiveTab('tickets')}
              icon={<FileText className="w-4 h-4" />}
              label="Ticket"
            />
            <TabButton
              active={activeTab === 'schedule'}
              onClick={() => setActiveTab('schedule')}
              icon={<Clock className="w-4 h-4" />}
              label="Schedule"
            />
            <TabButton
              active={activeTab === 'members'}
              onClick={() => setActiveTab('members')}
              icon={<Users className="w-4 h-4" />}
              label={`Members (${members.length})`}
            />
            <TabButton
              active={activeTab === 'location'}
              onClick={() => setActiveTab('location')}
              icon={<Navigation className="w-4 h-4" />}
              label="Live Location"
            />
            <TabButton
              active={activeTab === 'messages'}
              onClick={() => setActiveTab('messages')}
              icon={<MessageSquare className="w-4 h-4" />}
              label="Messages"
            />
            <TabButton
              active={activeTab === 'media'}
              onClick={() => setActiveTab('media')}
              icon={<Camera className="w-4 h-4" />}
              label="Media"
            />
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'overview' && (
          <OverviewTab
            trip={trip}
            ticket={ticket}
            members={members}
            messages={messages}
            schedule={schedule}
            revealStatus={revealStatus}
          />
        )}
        {activeTab === 'tickets' && (
          <TicketReveal
            ticket={ticket}
            revealStatus={revealStatus}
            departureTime={trip.departure_time}
          />
        )}
        {activeTab === 'schedule' && (
          <Timeline schedule={schedule} isAdmin={isAdmin} tripId={tripId!} />
        )}
        {activeTab === 'members' && (
          <MembersList members={members} isAdmin={isAdmin} tripId={tripId!} lobbyCode={trip?.lobby_code} />
        )}
        {activeTab === 'location' && (
          <LocationTab tripId={tripId!} members={members} />
        )}
        {activeTab === 'messages' && (
          <MessagesPanel
            messages={messages}
            tripId={tripId!}
            isAdmin={isAdmin}
            onRefresh={loadTripData}
          />
        )}
        {activeTab === 'media' && (
          <MediaTab tripId={tripId!} />
        )}
      </main>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
        active
          ? 'text-blue-400 border-b-2 border-blue-400'
          : 'text-white/50 hover:text-white/80'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function CountdownBanner({ departureTime }: { departureTime: string }) {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(departureTime));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(departureTime));
    }, 1000);

    return () => clearInterval(timer);
  }, [departureTime]);

  function calculateTimeLeft(time: string) {
    const diff = new Date(time).getTime() - Date.now();
    if (diff <= 0) return null;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds };
  }

  if (!timeLeft) {
    return (
      <div className="bg-green-500/20 border-b border-green-500/30">
        <div className="max-w-7xl mx-auto px-6 py-3 text-center">
          <p className="text-green-400 font-medium">
            The trip has started! Have fun!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-500/20 to-fuchsia-500/20 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-center gap-6">
          <span className="text-white/60 text-sm">Departure in:</span>
          <div className="flex gap-3">
            <TimeUnit value={timeLeft.days} label="days" />
            <TimeUnit value={timeLeft.hours} label="hrs" />
            <TimeUnit value={timeLeft.minutes} label="min" />
            <TimeUnit value={timeLeft.seconds} label="sec" />
          </div>
        </div>
      </div>
    </div>
  );
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="countdown-digit">
      <div className="text-2xl font-bold">{String(value).padStart(2, '0')}</div>
      <div className="text-xs text-white/50">{label}</div>
    </div>
  );
}

function OverviewTab({
  trip,
  ticket,
  members,
  messages,
  schedule,
  revealStatus,
}: {
  trip: Trip;
  ticket: Ticket | null;
  members: TripMember[];
  messages: TripMessage[];
  schedule: ScheduleItem[];
  revealStatus: string;
}) {
  const pinnedMessages = messages.filter((m) => m.is_pinned);
  const upcomingSchedule = schedule.slice(0, 3);

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Main Info */}
      <div className="lg:col-span-2 space-y-6">
        {/* Ticket Status Card */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            Your Ticket
          </h2>
          {ticket ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm mb-1">Status</p>
                <p className="font-medium">
                  {revealStatus === 'full'
                    ? 'Fully visible'
                    : revealStatus === 'qr_only'
                    ? 'QR code available'
                    : 'Still hidden'}
                </p>
              </div>
              <Link to="?tab=tickets" className="btn-primary text-sm">
                View Ticket
              </Link>
            </div>
          ) : (
            <p className="text-white/50">
              The admin hasn't uploaded your ticket yet.
            </p>
          )}
        </div>

        {/* Announcements */}
        {pinnedMessages.length > 0 && (
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-yellow-400" />
              Important Messages
            </h2>
            <div className="space-y-3">
              {pinnedMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl"
                >
                  <p className="text-sm">{msg.content}</p>
                  <p className="text-xs text-white/40 mt-2">
                    {new Date(msg.created_at).toLocaleString('en-US')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Schedule Preview */}
        {upcomingSchedule.length > 0 && (
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-fuchsia-400" />
              Upcoming Activities
            </h2>
            <div className="space-y-3">
              {upcomingSchedule.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 p-3 bg-white/5 rounded-xl"
                >
                  <div className="w-12 text-center">
                    <p className="text-xs text-white/40">
                      {new Date(item.start_time).toLocaleDateString('en-US', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </p>
                    <p className="font-semibold">
                      {new Date(item.start_time).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">{item.title}</p>
                    {item.location && (
                      <p className="text-sm text-white/50 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {item.location}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Trip Info */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Trip Info</h2>
          {trip.description && (
            <p className="text-white/60 text-sm mb-4">{trip.description}</p>
          )}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-white/40" />
              <span className="text-sm">
                {new Date(trip.departure_time).toLocaleDateString('en-US', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-white/40" />
              <span className="text-sm">
                Departure:{' '}
                {new Date(trip.departure_time).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-white/40" />
              <span className="text-sm">{members.length} participants</span>
            </div>
          </div>
        </div>

        {/* Quick Members List */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Participants</h2>
          <div className="space-y-2">
            {members.slice(0, 5).map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 p-2 rounded-lg"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-fuchsia-500 flex items-center justify-center text-sm font-medium">
                  {member.user?.name?.charAt(0) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {member.user?.name}
                  </p>
                  {member.role === 'admin' && (
                    <span className="text-xs text-blue-400">Admin</span>
                  )}
                </div>
              </div>
            ))}
            {members.length > 5 && (
              <p className="text-sm text-white/50 text-center pt-2">
                +{members.length - 5} more
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface MemberLocation {
  user_id: string;
  latitude: number;
  longitude: number;
  updated_at: string;
  user?: { name: string };
}

function LocationTab({ tripId, members }: { tripId: string; members: TripMember[] }) {
  const { user } = useAuth();
  const [sharing, setSharing] = useState(false);
  const [locations, setLocations] = useState<MemberLocation[]>([]);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    loadLocations();

    // Set up realtime subscription
    const channel = supabase
      .channel(`trip-locations-${tripId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'member_locations',
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          loadLocations();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [tripId]);

  async function loadLocations() {
    const { data } = await supabase
      .from('member_locations')
      .select('*, user:users(name)')
      .eq('trip_id', tripId);

    if (data) {
      setLocations(data);
      setLastUpdate(new Date());
    }
  }

  async function startSharing() {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setSharing(true);
    setError('');

    navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setMyLocation({ lat: latitude, lng: longitude });

        // Update location in database
        await supabase.from('member_locations').upsert({
          trip_id: tripId,
          user_id: user?.id,
          latitude,
          longitude,
          updated_at: new Date().toISOString(),
        });
      },
      (err) => {
        setError(`Error getting location: ${err.message}`);
        setSharing(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 30000,
        timeout: 10000,
      }
    );
  }

  async function stopSharing() {
    setSharing(false);
    setMyLocation(null);

    // Remove location from database
    await supabase
      .from('member_locations')
      .delete()
      .eq('trip_id', tripId)
      .eq('user_id', user?.id);
  }

  function getTimeSince(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    return `${Math.floor(diff / 3600)} hours ago`;
  }

  const sharingMembers = locations.length;
  const totalMembers = members.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Navigation className="w-5 h-5 text-blue-400" />
              Live Location
            </h2>
            <p className="text-sm text-white/50">
              {sharingMembers} of {totalMembers} members sharing location
            </p>
          </div>
          <button
            onClick={sharing ? stopSharing : startSharing}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${
              sharing
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
            }`}
          >
            {sharing ? (
              <>
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Stop Sharing
              </>
            ) : (
              <>
                <Navigation className="w-4 h-4" />
                Share My Location
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm mb-4">
            {error}
          </div>
        )}

        {myLocation && (
          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm">
            <p className="text-blue-200">
              Your location: {myLocation.lat.toFixed(4)}, {myLocation.lng.toFixed(4)}
            </p>
          </div>
        )}
      </div>

      {/* Map placeholder */}
      <div className="card p-6">
        <div className="aspect-video bg-slate-800 rounded-xl overflow-hidden relative">
          {/* Map would be rendered here with a library like Mapbox or Google Maps */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
            <MapPin className="w-16 h-16 text-white/20 mb-4" />
            <p className="text-white/60 mb-2">Interactive Map</p>
            <p className="text-sm text-white/40">
              Connect your Mapbox or Google Maps API key to see live member locations on an interactive map
            </p>
          </div>

          {/* Member markers (simulated) */}
          {locations.length > 0 && (
            <div className="absolute inset-0 pointer-events-none">
              {locations.map((loc, index) => (
                <div
                  key={loc.user_id}
                  className="absolute"
                  style={{
                    left: `${20 + (index * 15)}%`,
                    top: `${30 + (index * 10)}%`,
                  }}
                >
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-fuchsia-500 flex items-center justify-center text-xs font-bold border-2 border-white shadow-lg">
                      {loc.user?.name?.charAt(0) || '?'}
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-green-400 border-2 border-white" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {lastUpdate && (
          <div className="flex items-center justify-between mt-4 text-sm text-white/40">
            <span>Last updated: {lastUpdate.toLocaleTimeString('en-US')}</span>
            <button
              onClick={loadLocations}
              className="flex items-center gap-1 hover:text-white/60 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        )}
      </div>

      {/* Member locations list */}
      <div className="card p-6">
        <h3 className="font-semibold mb-4">Active Members</h3>
        {locations.length === 0 ? (
          <p className="text-white/50 text-sm">
            No members are currently sharing their location.
            Be the first to share!
          </p>
        ) : (
          <div className="space-y-3">
            {locations.map((loc) => (
              <div
                key={loc.user_id}
                className="flex items-center gap-3 p-3 bg-white/5 rounded-xl"
              >
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-fuchsia-500 flex items-center justify-center font-medium">
                    {loc.user?.name?.charAt(0) || '?'}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-slate-800" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{loc.user?.name || 'Unknown'}</p>
                  <p className="text-xs text-white/40">
                    Updated {getTimeSince(loc.updated_at)}
                  </p>
                </div>
                <div className="text-right text-xs text-white/40">
                  <p>{loc.latitude.toFixed(4)}</p>
                  <p>{loc.longitude.toFixed(4)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MediaTab({ tripId }: { tripId: string }) {
  const [media, setMedia] = useState<Array<{ id: string; url: string; type: string; created_at: string }>>([]);
  const [uploading, setUploading] = useState(false);
  const [showAftermovie, setShowAftermovie] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMedia();
  }, [tripId]);

  async function loadMedia() {
    const { data } = await supabase
      .from('trip_media')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false });

    if (data) {
      setMedia(data);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;

    setUploading(true);

    for (const file of Array.from(files)) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${tripId}/${Date.now()}.${fileExt}`;
      const isVideo = file.type.startsWith('video/');

      const { error: uploadError } = await supabase.storage
        .from('trip-media')
        .upload(fileName, file);

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('trip-media')
          .getPublicUrl(fileName);

        await supabase.from('trip_media').insert({
          trip_id: tripId,
          url: publicUrl,
          type: isVideo ? 'video' : 'photo',
        });
      }
    }

    await loadMedia();
    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function generateAftermovie() {
    setGenerating(true);
    setShowAftermovie(true);

    // Simulate aftermovie generation steps
    const steps = [
      'Collecting media files...',
      'Analyzing photo compositions...',
      'Selecting best moments...',
      'Syncing with music...',
      'Adding transitions...',
      'Rendering video...',
      'Finalizing...',
    ];

    for (let i = 0; i < steps.length; i++) {
      setGenerationStep(i);
      await new Promise((r) => setTimeout(r, 2000));
    }

    setGenerating(false);
  }

  const generationSteps = [
    'Collecting media files...',
    'Analyzing photo compositions...',
    'Selecting best moments...',
    'Syncing with music...',
    'Adding transitions...',
    'Rendering video...',
    'Finalizing...',
  ];

  if (media.length === 0) {
    return (
      <div className="card p-12 text-center">
        <Camera className="w-16 h-16 text-white/20 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Media Gallery</h2>
        <p className="text-white/50 mb-6">
          Upload photos and videos from your trip.
          <br />
          After the trip, generate an aftermovie with music sync!
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={handleUpload}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="btn-primary"
        >
          {uploading ? 'Uploading...' : 'Upload Media'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Media Gallery</h2>
          <p className="text-sm text-white/50">{media.length} files</p>
        </div>
        <div className="flex gap-3">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={handleUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn-secondary flex items-center gap-2"
          >
            <Camera className="w-4 h-4" />
            {uploading ? 'Uploading...' : 'Add Media'}
          </button>
          {media.length >= 5 && (
            <button
              onClick={generateAftermovie}
              className="btn-primary flex items-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Generate Aftermovie
            </button>
          )}
        </div>
      </div>

      {/* Media grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {media.map((item) => (
          <div
            key={item.id}
            className="aspect-square rounded-xl overflow-hidden bg-white/5 relative group"
          >
            {item.type === 'video' ? (
              <video
                src={item.url}
                className="w-full h-full object-cover"
                controls
              />
            ) : (
              <img
                src={item.url}
                alt=""
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute bottom-2 left-2 text-xs text-white/50 bg-black/50 px-2 py-1 rounded">
              {new Date(item.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Aftermovie Modal */}
      {showAftermovie && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-white/10 rounded-2xl p-8 max-w-lg w-full text-center">
            {generating ? (
              <>
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-fuchsia-500 to-blue-500 flex items-center justify-center mx-auto mb-6 animate-pulse">
                  <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold mb-2">Generating Aftermovie</h2>
                <p className="text-white/60 mb-6">
                  {generationSteps[generationStep]}
                </p>
                <div className="w-full bg-white/10 rounded-full h-2 mb-4">
                  <div
                    className="bg-gradient-to-r from-fuchsia-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${((generationStep + 1) / generationSteps.length) * 100}%` }}
                  />
                </div>
                <p className="text-sm text-white/40">
                  Step {generationStep + 1} of {generationSteps.length}
                </p>
              </>
            ) : (
              <>
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mx-auto mb-6">
                  <Check className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Aftermovie Ready!</h2>
                <p className="text-white/60 mb-6">
                  Your trip memories have been compiled into an amazing aftermovie
                  with synchronized music.
                </p>
                <div className="aspect-video bg-black rounded-xl mb-6 flex items-center justify-center">
                  <div className="text-center">
                    <svg className="w-16 h-16 text-white/30 mx-auto mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    <p className="text-sm text-white/40">Preview coming soon</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAftermovie(false)}
                    className="btn-secondary flex-1"
                  >
                    Close
                  </button>
                  <button className="btn-primary flex-1">
                    Download Video
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
