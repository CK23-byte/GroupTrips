import React, { useState, useEffect, useRef } from 'react';
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
  ChevronRight,
  Bell,
  Navigation,
  RefreshCw,
  Map,
  X,
  GripVertical,
  Music,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Download,
  EyeOff,
  ZoomIn,
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
import GoogleMapComponent from '../components/GoogleMap';

type Tab = 'overview' | 'tickets' | 'schedule' | 'members' | 'location' | 'media' | 'messages' | 'route';

interface MediaItem {
  id: string;
  file_url: string;
  type: string;
  created_at: string;
  latitude?: number;
  longitude?: number;
  caption?: string;
}

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
            <TabButton
              active={activeTab === 'route'}
              onClick={() => setActiveTab('route')}
              icon={<Map className="w-4 h-4" />}
              label="Route"
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
            onViewTicket={() => setActiveTab('tickets')}
            isAdmin={isAdmin}
          />
        )}
        {activeTab === 'tickets' && (
          <TicketReveal
            ticket={ticket}
            revealStatus={revealStatus}
            departureTime={trip.departure_time}
            trip={trip}
            userName={(user as unknown as { user_metadata?: { name?: string } })?.user_metadata?.name || user?.email?.split('@')[0]}
          />
        )}
        {activeTab === 'schedule' && (
          <Timeline schedule={schedule} isAdmin={isAdmin} tripId={tripId!} trip={trip} memberCount={members.length} />
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
          <MediaTab tripId={tripId!} isAdmin={isAdmin} />
        )}
        {activeTab === 'route' && (
          <RouteTab tripId={tripId!} schedule={schedule} trip={trip} />
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

// Check if activity should be revealed (1 hour before start time)
function isActivityRevealed(startTime: string): boolean {
  const activityTime = new Date(startTime).getTime();
  const now = Date.now();
  const oneHourBefore = activityTime - (60 * 60 * 1000);
  return now >= oneHourBefore;
}

function OverviewTab({
  trip,
  ticket,
  members,
  messages,
  schedule,
  revealStatus,
  onViewTicket,
  isAdmin,
}: {
  trip: Trip;
  ticket: Ticket | null;
  members: TripMember[];
  messages: TripMessage[];
  schedule: ScheduleItem[];
  revealStatus: string;
  onViewTicket: () => void;
  isAdmin: boolean;
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
              <button onClick={onViewTicket} className="btn-primary text-sm">
                View Ticket
              </button>
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
              {upcomingSchedule.map((item) => {
                const revealed = isAdmin || isActivityRevealed(item.start_time);
                const timeUntil = new Date(item.start_time).getTime() - Date.now();
                const hoursUntil = Math.floor(timeUntil / (1000 * 60 * 60));
                const minsUntil = Math.floor((timeUntil % (1000 * 60 * 60)) / (1000 * 60));

                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 p-3 bg-white/5 rounded-xl relative overflow-hidden"
                  >
                    {!revealed && (
                      <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-md z-10 flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-12 h-12 rounded-full bg-fuchsia-500/20 flex items-center justify-center mx-auto mb-2">
                            <EyeOff className="w-6 h-6 text-fuchsia-400" />
                          </div>
                          <p className="text-sm font-medium text-fuchsia-400">Surprise Activity!</p>
                          <p className="text-xs text-white/50 mt-1">
                            Reveals in {hoursUntil}h {minsUntil}m
                          </p>
                          <p className="text-[10px] text-white/30 mt-1">1 hour before start time</p>
                        </div>
                      </div>
                    )}
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
                    <div className={!revealed ? 'invisible' : ''}>
                      <p className="font-medium">{item.title}</p>
                      {item.location && (
                        <p className="text-sm text-white/50 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {item.location}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
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
  const [watchId, setWatchId] = useState<number | null>(null);

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

  // Cleanup geolocation watcher on unmount
  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

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

    const id = navigator.geolocation.watchPosition(
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
    setWatchId(id);
  }

  async function stopSharing() {
    // Clear the geolocation watcher
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }

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

      {/* Interactive Map */}
      <div className="card p-6">
        <GoogleMapComponent
          memberLocations={locations.map(loc => ({
            user_id: loc.user_id,
            latitude: loc.latitude,
            longitude: loc.longitude,
            updated_at: loc.updated_at,
            user: loc.user ? { name: loc.user.name } : undefined,
          }))}
          height="400px"
        />

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

function MediaTab({ tripId, isAdmin }: { tripId: string; isAdmin: boolean }) {
  const { user } = useAuth();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [showAftermovie, setShowAftermovie] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [aftermovieReady, setAftermovieReady] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [enlargedItem, setEnlargedItem] = useState<MediaItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [customAudioFile, setCustomAudioFile] = useState<File | null>(null);
  const [customAudioUrl, setCustomAudioUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Get current location for geotagging uploads
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          console.log('[MediaTab] Geolocation not available');
        }
      );
    }
  }, []);

  useEffect(() => {
    loadMedia();
  }, [tripId]);

  // Slideshow effect for aftermovie preview - now includes videos
  const photos = media.filter(m => m.type === 'photo');
  const videos = media.filter(m => m.type === 'video');
  const allMedia = [...photos, ...videos]; // Photos first, then videos
  const selectedForMovie = editMode && selectedPhotos.length > 0
    ? allMedia.filter(p => selectedPhotos.includes(p.id))
    : allMedia;

  useEffect(() => {
    if (aftermovieReady && selectedForMovie.length > 0 && isPlaying) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % selectedForMovie.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [aftermovieReady, selectedForMovie.length, isPlaying]);

  // Audio setup for aftermovie
  useEffect(() => {
    if (aftermovieReady && musicEnabled && customAudioUrl) {
      // Create audio context for background music
      if (!audioRef.current || audioRef.current.src !== customAudioUrl) {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        audioRef.current = new Audio(customAudioUrl);
        audioRef.current.loop = true;
        audioRef.current.volume = 0.3;
      }
      if (isPlaying) {
        audioRef.current.play().catch((e) => console.log('Audio autoplay blocked:', e));
      } else {
        audioRef.current.pause();
      }
    } else if (audioRef.current) {
      audioRef.current.pause();
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [aftermovieReady, musicEnabled, isPlaying, customAudioUrl]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!enlargedItem) return;

    const currentItem = enlargedItem;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setEnlargedItem(null);
      } else if (e.key === 'ArrowLeft') {
        const currentIndex = media.findIndex(m => m.id === currentItem.id);
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : media.length - 1;
        setEnlargedItem(media[prevIndex]);
      } else if (e.key === 'ArrowRight') {
        const currentIndex = media.findIndex(m => m.id === currentItem.id);
        const nextIndex = currentIndex < media.length - 1 ? currentIndex + 1 : 0;
        setEnlargedItem(media[nextIndex]);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enlargedItem, media]);

  // Handle custom audio file upload
  function handleAudioUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setCustomAudioFile(file);
      const url = URL.createObjectURL(file);
      setCustomAudioUrl(url);
      setMusicEnabled(true);
    }
  }

  async function loadMedia() {
    console.log('[MediaTab] Loading media for trip:', tripId);
    const { data, error } = await supabase
      .from('trip_media')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false });

    console.log('[MediaTab] Media loaded:', data?.length, 'Error:', error);

    if (data) {
      setMedia(data);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;

    setUploading(true);
    setUploadError('');

    console.log('[MediaTab] Starting upload of', files.length, 'files');

    for (const file of Array.from(files)) {
      try {
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        const fileName = `${tripId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const isVideo = file.type.startsWith('video/');

        console.log('[MediaTab] Uploading file:', fileName, 'Type:', file.type);

        // Upload to storage
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('trip-media')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('[MediaTab] Storage upload error:', uploadError);
          setUploadError(`Upload failed: ${uploadError.message}`);
          continue;
        }

        console.log('[MediaTab] Storage upload success:', uploadData);

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('trip-media')
          .getPublicUrl(fileName);

        console.log('[MediaTab] Public URL:', publicUrl);

        // Save to database with geolocation
        const { error: dbError } = await supabase.from('trip_media').insert({
          trip_id: tripId,
          uploaded_by: user?.id,
          file_url: publicUrl,
          type: isVideo ? 'video' : 'photo',
          latitude: currentLocation?.lat,
          longitude: currentLocation?.lng,
        });

        if (dbError) {
          console.error('[MediaTab] Database insert error:', dbError);
          setUploadError(`Database error: ${dbError.message}`);
        } else {
          console.log('[MediaTab] Media saved to database');
        }
      } catch (err) {
        console.error('[MediaTab] Unexpected upload error:', err);
        setUploadError(`Unexpected error: ${String(err)}`);
      }
    }

    await loadMedia();
    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function togglePhotoSelection(photoId: string) {
    setSelectedPhotos(prev =>
      prev.includes(photoId)
        ? prev.filter(id => id !== photoId)
        : [...prev, photoId]
    );
  }

  async function generateAftermovie() {
    const mediaToUse = editMode && selectedPhotos.length > 0
      ? allMedia.filter(p => selectedPhotos.includes(p.id))
      : allMedia;

    if (mediaToUse.length < 3) {
      setUploadError('You need at least 3 photos/videos to generate an aftermovie. Select more or add more to the gallery.');
      return;
    }

    setGenerating(true);
    setShowAftermovie(true);
    setAftermovieReady(false);
    setCurrentSlide(0);
    setIsPlaying(true);

    // Simulate aftermovie generation steps
    for (let i = 0; i < generationSteps.length; i++) {
      setGenerationStep(i);
      await new Promise((r) => setTimeout(r, 1500));
    }

    setGenerating(false);
    setAftermovieReady(true);
  }

  function closeAftermovie() {
    setShowAftermovie(false);
    setAftermovieReady(false);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }

  // Export functionality - download images or share
  async function handleExportAftermovie() {
    const mediaToExport = editMode && selectedPhotos.length > 0
      ? allMedia.filter(p => selectedPhotos.includes(p.id))
      : allMedia;

    if (mediaToExport.length === 0) {
      setUploadError('No media to export');
      return;
    }

    // Check if Web Share API is available with files
    if (navigator.share && navigator.canShare) {
      try {
        // Try to share the slideshow
        const shareData = {
          title: 'GroupTrips Aftermovie',
          text: `Check out our trip memories! ${mediaToExport.length} photos/videos.`,
          url: window.location.href,
        };

        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);
          return;
        }
      } catch (err) {
        console.log('Web Share cancelled or failed:', err);
      }
    }

    // Fallback: Download images sequentially
    setUploadError('Downloading images...');

    for (let i = 0; i < mediaToExport.length; i++) {
      const item = mediaToExport[i];
      try {
        const response = await fetch(item.file_url);
        const blob = await response.blob();
        const ext = item.type === 'video' ? 'mp4' : 'jpg';
        const filename = `grouptrips-memory-${String(i + 1).padStart(3, '0')}.${ext}`;

        // Create download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Small delay between downloads to prevent browser blocking
        await new Promise(r => setTimeout(r, 300));
      } catch (err) {
        console.error('Failed to download:', item.file_url, err);
      }
    }

    // Download audio if available
    if (customAudioFile) {
      const audioUrl = URL.createObjectURL(customAudioFile);
      const a = document.createElement('a');
      a.href = audioUrl;
      a.download = `grouptrips-audio.${customAudioFile.name.split('.').pop()}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(audioUrl);
    }

    setUploadError(`Downloaded ${mediaToExport.length} files${customAudioFile ? ' + audio' : ''}!`);
    setTimeout(() => setUploadError(''), 3000);
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

        {uploadError && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6 text-red-200 text-sm">
            {uploadError}
          </div>
        )}

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
          {uploading ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Uploading...
            </span>
          ) : (
            'Upload Media'
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-semibold">Media Gallery</h2>
          <p className="text-sm text-white/50">
            {photos.length} photos, {media.length - photos.length} videos
            {currentLocation && (
              <span className="ml-2 text-green-400">📍 Location enabled</span>
            )}
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
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
            {uploading ? (
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Uploading...
              </span>
            ) : (
              'Add Media'
            )}
          </button>
          {/* Admin-only: Edit selection for aftermovie */}
          {isAdmin && allMedia.length >= 1 && (
            <button
              onClick={() => {
                setEditMode(!editMode);
                if (editMode) setSelectedPhotos([]);
              }}
              className={`btn-secondary flex items-center gap-2 ${editMode ? 'ring-2 ring-fuchsia-500' : ''}`}
            >
              <GripVertical className="w-4 h-4" />
              {editMode ? 'Done Editing' : 'Edit Selection'}
            </button>
          )}
          {/* Admin-only: Generate aftermovie */}
          {isAdmin && allMedia.length >= 3 && (
            <button
              onClick={generateAftermovie}
              className="btn-primary flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              {editMode && selectedPhotos.length > 0
                ? `Create with ${selectedPhotos.length} items`
                : 'Generate Aftermovie'}
            </button>
          )}
        </div>
      </div>

      {/* Edit mode instructions */}
      {editMode && (
        <div className="bg-fuchsia-500/20 border border-fuchsia-500/50 rounded-xl p-4 text-sm">
          <p className="font-medium mb-1">✨ Edit Mode Active</p>
          <p className="text-white/70">
            Click on photos and videos to select/deselect them for your aftermovie.
            {selectedPhotos.length > 0 && ` Selected: ${selectedPhotos.length} items`}
          </p>
        </div>
      )}

      {/* Error message */}
      {uploadError && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-red-200 text-sm">
          {uploadError}
        </div>
      )}

      {/* Media grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {media.map((item) => (
          <div
            key={item.id}
            onClick={() => {
              if (editMode) {
                togglePhotoSelection(item.id);
              } else {
                setEnlargedItem(item);
              }
            }}
            className={`aspect-square rounded-xl overflow-hidden bg-white/5 relative group cursor-pointer hover:ring-2 hover:ring-white/30 transition-all ${
              editMode && selectedPhotos.includes(item.id)
                ? 'ring-4 ring-fuchsia-500 ring-offset-2 ring-offset-slate-900'
                : ''
            }`}
          >
            {item.type === 'video' ? (
              <video
                src={item.file_url}
                className="w-full h-full object-cover"
                onClick={(e) => {
                  if (!editMode) {
                    e.stopPropagation();
                    setEnlargedItem(item);
                  }
                }}
              />
            ) : (
              <img
                src={item.file_url}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
            )}
            {/* Selection indicator */}
            {editMode && (
              <div className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                selectedPhotos.includes(item.id)
                  ? 'bg-fuchsia-500 border-fuchsia-500'
                  : 'bg-black/50 border-white/50'
              }`}>
                {selectedPhotos.includes(item.id) && <Check className="w-4 h-4" />}
              </div>
            )}
            {/* Zoom icon on hover */}
            {!editMode && (
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
            {/* Location indicator */}
            {item.latitude && item.longitude && (
              <div className="absolute top-2 left-2 bg-green-500/80 px-2 py-1 rounded-full text-xs flex items-center gap-1">
                <MapPin className="w-3 h-3" />
              </div>
            )}
            {/* Date */}
            <div className="absolute bottom-2 left-2 text-xs text-white/50 bg-black/50 px-2 py-1 rounded">
              {new Date(item.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </div>
            {/* Type badge for videos */}
            {item.type === 'video' && (
              <div className="absolute bottom-2 right-2 bg-blue-500/80 px-2 py-1 rounded text-xs">
                Video
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {enlargedItem && (
        <div
          className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setEnlargedItem(null)}
        >
          <button
            onClick={() => setEnlargedItem(null)}
            className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Navigation arrows */}
          {media.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const currentIndex = media.findIndex(m => m.id === enlargedItem.id);
                  const prevIndex = currentIndex > 0 ? currentIndex - 1 : media.length - 1;
                  setEnlargedItem(media[prevIndex]);
                }}
                className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const currentIndex = media.findIndex(m => m.id === enlargedItem.id);
                  const nextIndex = currentIndex < media.length - 1 ? currentIndex + 1 : 0;
                  setEnlargedItem(media[nextIndex]);
                }}
                className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          {/* Media content */}
          <div className="max-w-5xl max-h-[85vh] w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {enlargedItem.type === 'video' ? (
              <video
                src={enlargedItem.file_url}
                className="max-w-full max-h-full rounded-lg"
                controls
                autoPlay
              />
            ) : (
              <img
                src={enlargedItem.file_url}
                alt=""
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            )}
          </div>

          {/* Image counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 px-4 py-2 rounded-full text-sm">
            {media.findIndex(m => m.id === enlargedItem.id) + 1} / {media.length}
          </div>
        </div>
      )}

      {/* Aftermovie Modal */}
      {showAftermovie && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-white/10 rounded-2xl p-8 max-w-2xl w-full text-center">
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
            ) : aftermovieReady ? (
              <>
                <h2 className="text-2xl font-bold mb-2">Your Aftermovie</h2>
                <p className="text-white/60 mb-4">
                  {selectedForMovie.filter(m => m.type === 'photo').length} photos, {selectedForMovie.filter(m => m.type === 'video').length} videos compiled with music sync
                </p>

                {/* Slideshow Preview */}
                <div className="aspect-video bg-black rounded-xl mb-4 relative overflow-hidden">
                  {selectedForMovie.map((item, index) => (
                    item.type === 'video' ? (
                      <video
                        key={item.id}
                        src={item.file_url}
                        autoPlay={index === currentSlide && isPlaying}
                        muted={musicEnabled} // Mute video if music is on
                        loop
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
                          index === currentSlide ? 'opacity-100' : 'opacity-0'
                        }`}
                      />
                    ) : (
                      <img
                        key={item.id}
                        src={item.file_url}
                        alt=""
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
                          index === currentSlide ? 'opacity-100' : 'opacity-0'
                        }`}
                      />
                    )
                  ))}

                  {/* GroupTrips Watermark */}
                  <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full">
                    <Plane className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-semibold text-white/90">GroupTrips</span>
                  </div>

                  {/* Music visualization overlay */}
                  {musicEnabled && isPlaying && (
                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/80 to-transparent flex items-end justify-center pb-3">
                      <div className="flex items-end gap-1">
                        {[...Array(20)].map((_, i) => (
                          <div
                            key={i}
                            className="w-1 bg-gradient-to-t from-fuchsia-500 to-blue-500 rounded-full animate-pulse"
                            style={{
                              height: `${Math.random() * 24 + 8}px`,
                              animationDelay: `${i * 0.05}s`,
                              animationDuration: '0.5s'
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Playback controls overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors"
                    >
                      {isPlaying ? (
                        <Pause className="w-8 h-8" />
                      ) : (
                        <Play className="w-8 h-8 ml-1" />
                      )}
                    </button>
                  </div>

                  {/* Top controls */}
                  <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 bg-black/50 px-3 py-1.5 rounded-full">
                      <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`} />
                      <span className="text-xs font-medium">{isPlaying ? 'Playing' : 'Paused'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setMusicEnabled(!musicEnabled)}
                        className="bg-black/50 p-2 rounded-full hover:bg-black/70 transition-colors"
                      >
                        {musicEnabled ? (
                          <Volume2 className="w-4 h-4" />
                        ) : (
                          <VolumeX className="w-4 h-4" />
                        )}
                      </button>
                      <div className="bg-black/50 px-3 py-1.5 rounded-full text-xs">
                        {currentSlide + 1} / {selectedForMovie.length}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Thumbnail strip */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                  {selectedForMovie.slice(0, 10).map((item, index) => (
                    <button
                      key={item.id}
                      onClick={() => setCurrentSlide(index)}
                      className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                        index === currentSlide ? 'border-fuchsia-500 scale-105' : 'border-transparent opacity-60'
                      }`}
                    >
                      <img src={item.file_url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                  {selectedForMovie.length > 10 && (
                    <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-white/10 flex items-center justify-center text-sm text-white/50">
                      +{selectedForMovie.length - 10}
                    </div>
                  )}
                </div>

                {/* Music Selection */}
                <div className="bg-white/5 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-2 mb-3 text-sm font-medium">
                    <Music className="w-4 h-4 text-fuchsia-400" />
                    <span>Background Music</span>
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    <input
                      ref={audioInputRef}
                      type="file"
                      accept="audio/*"
                      onChange={handleAudioUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => audioInputRef.current?.click()}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        customAudioFile
                          ? 'bg-fuchsia-500/30 text-fuchsia-300 border border-fuchsia-500/50'
                          : 'bg-white/10 text-white/60 hover:bg-white/20'
                      }`}
                    >
                      {customAudioFile ? `♪ ${customAudioFile.name.substring(0, 20)}...` : '+ Upload Audio'}
                    </button>
                    {customAudioFile && (
                      <button
                        onClick={() => {
                          setCustomAudioFile(null);
                          setCustomAudioUrl(null);
                          setMusicEnabled(false);
                        }}
                        className="px-2 py-1 text-xs text-red-400 hover:text-red-300"
                      >
                        Remove
                      </button>
                    )}
                    {!customAudioFile && (
                      <span className="text-xs text-white/40">No audio selected - upload your own music</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={closeAftermovie}
                    className="btn-secondary flex-1"
                  >
                    Close
                  </button>
                  <button
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                    onClick={handleExportAftermovie}
                  >
                    <Download className="w-4 h-4" />
                    Download All
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

type RouteItem = (MediaItem & { itemType: 'media'; lat?: number; lng?: number }) | (ScheduleItem & { itemType: 'schedule'; lat: number; lng: number });

// Route Tab - Shows trip route with schedule waypoints and media pins
function RouteTab({ tripId, schedule, trip }: { tripId: string; schedule: ScheduleItem[]; trip: Trip | null }) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<RouteItem | null>(null);

  useEffect(() => {
    loadMediaWithLocation();
  }, [tripId]);

  async function loadMediaWithLocation() {
    const { data } = await supabase
      .from('trip_media')
      .select('*')
      .eq('trip_id', tripId)
      .not('latitude', 'is', null)
      .order('created_at', { ascending: true });

    if (data) {
      setMedia(data);
    }
  }

  // Calculate trip progress (0-100%)
  const now = new Date();
  const departureTime = trip?.departure_time ? new Date(trip.departure_time) : null;
  const tripStarted = departureTime && now >= departureTime;

  // Get schedule items with locations (mock coordinates for demo)
  const scheduleWithLocations = schedule.map((item, index) => ({
    ...item,
    // Generate mock coordinates along a path for visualization
    lat: 52.3676 + (index * 0.01),
    lng: 4.9041 + (index * 0.015),
  }));

  // Combine schedule and media into timeline
  const allItems: RouteItem[] = [
    ...scheduleWithLocations.map(s => ({ ...s, itemType: 'schedule' as const })),
    ...media.map(m => ({ ...m, itemType: 'media' as const, lat: m.latitude, lng: m.longitude })),
  ].sort((a, b) => {
    const dateA = 'start_time' in a ? new Date(a.start_time) : new Date(a.created_at);
    const dateB = 'start_time' in b ? new Date(b.start_time) : new Date(b.created_at);
    return dateA.getTime() - dateB.getTime();
  });

  // Filter items based on trip progress
  const visibleItems = tripStarted
    ? allItems.filter(item => {
        const itemDate = 'start_time' in item ? new Date(item.start_time) : new Date(item.created_at);
        return itemDate <= now;
      })
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Trip Route</h2>
          <p className="text-sm text-white/50">
            {tripStarted
              ? `${visibleItems.length} waypoints revealed`
              : 'Route will be revealed as the trip progresses'}
          </p>
        </div>
      </div>

      {!tripStarted ? (
        <div className="card p-12 text-center">
          <Map className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Route Not Yet Available</h3>
          <p className="text-white/50 mb-4">
            The trip route will be revealed progressively once the trip starts.
            <br />
            Check back after {departureTime?.toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Interactive Map with Route */}
          <div className="lg:col-span-2 card p-0 overflow-hidden relative">
            <GoogleMapComponent
              activityLocations={visibleItems
                .filter(item => item.lat && item.lng)
                .map(item => ({
                  id: item.id,
                  title: item.itemType === 'schedule' ? (item as ScheduleItem).title : 'Photo/Video',
                  latitude: item.lat!,
                  longitude: item.lng!,
                  type: item.itemType === 'media' ? 'media' : (item as ScheduleItem).type,
                  start_time: item.itemType === 'schedule' ? (item as ScheduleItem).start_time : item.created_at,
                  isRevealed: true,
                }))}
              showRoute={true}
              height="500px"
              onMarkerClick={(loc) => {
                if ('id' in loc) {
                  const found = visibleItems.find(v => v.id === loc.id);
                  if (found) setSelectedItem(found);
                }
              }}
            />

            {/* Progress indicator overlay */}
            <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm rounded-lg px-4 py-2 z-10">
              <p className="text-xs text-white/60">Trip Progress</p>
              <p className="text-lg font-bold">
                {Math.round((visibleItems.length / Math.max(allItems.length, 1)) * 100)}%
              </p>
            </div>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm rounded-lg p-3 z-10">
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                  <span>Activity</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-teal-500" />
                  <span>Photo/Video</span>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline sidebar */}
          <div className="card p-4 max-h-[500px] overflow-y-auto">
            <h3 className="font-semibold mb-4">Journey Timeline</h3>
            <div className="space-y-4">
              {visibleItems.length === 0 ? (
                <p className="text-white/50 text-sm">No waypoints revealed yet</p>
              ) : (
                visibleItems.map((item, index) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={`flex gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedItem?.id === item.id ? 'bg-white/10' : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="flex-shrink-0">
                      {item.itemType === 'media' ? (
                        <div className="w-12 h-12 rounded-lg overflow-hidden">
                          <img src={(item as MediaItem).file_url} alt="" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                          <MapPin className="w-5 h-5 text-purple-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {item.itemType === 'schedule'
                          ? (item as ScheduleItem).title
                          : 'Photo taken'}
                      </p>
                      <p className="text-xs text-white/50">
                        {new Date(
                          item.itemType === 'schedule'
                            ? (item as ScheduleItem).start_time
                            : (item as MediaItem).created_at
                        ).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      {item.itemType === 'schedule' && (item as ScheduleItem).location && (
                        <p className="text-xs text-white/40 truncate mt-1">
                          📍 {(item as ScheduleItem).location}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-xs text-white/30">
                      #{index + 1}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Selected item detail modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedItem(null)}>
          <div className="bg-slate-800 border border-white/10 rounded-2xl p-6 max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {selectedItem.itemType === 'schedule'
                  ? (selectedItem as ScheduleItem).title
                  : 'Photo'}
              </h3>
              <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-white/10 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedItem.itemType === 'media' && (
              <img
                src={(selectedItem as MediaItem).file_url}
                alt=""
                className="w-full rounded-xl mb-4"
              />
            )}

            <div className="space-y-2 text-sm">
              <p className="text-white/60">
                <Clock className="w-4 h-4 inline mr-2" />
                {new Date(
                  selectedItem.itemType === 'schedule'
                    ? (selectedItem as ScheduleItem).start_time
                    : (selectedItem as MediaItem).created_at
                ).toLocaleString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
              {selectedItem.itemType === 'schedule' && (selectedItem as ScheduleItem).location && (
                <p className="text-white/60">
                  <MapPin className="w-4 h-4 inline mr-2" />
                  {(selectedItem as ScheduleItem).location}
                </p>
              )}
              {selectedItem.itemType === 'media' && (selectedItem as MediaItem).latitude && (
                <p className="text-white/60">
                  <MapPin className="w-4 h-4 inline mr-2" />
                  {(selectedItem as MediaItem).latitude?.toFixed(4)}, {(selectedItem as MediaItem).longitude?.toFixed(4)}
                </p>
              )}
              {selectedItem.itemType === 'schedule' && (selectedItem as ScheduleItem).description && (
                <p className="text-white/80 mt-4">
                  {(selectedItem as ScheduleItem).description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
