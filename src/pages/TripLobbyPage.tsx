import { useState, useEffect } from 'react';
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

type Tab = 'overview' | 'tickets' | 'schedule' | 'members' | 'media' | 'messages';

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

    // Load trip
    const { data: tripData } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();

    if (tripData) {
      setTrip(tripData as Trip);
    }

    // Load members
    const { data: membersData } = await supabase
      .from('trip_members')
      .select('*, user:users(*)')
      .eq('trip_id', tripId);

    if (membersData) {
      setMembers(membersData as TripMember[]);
      const userMember = membersData.find((m) => m.user_id === user.id);
      setIsAdmin(userMember?.role === 'admin');
    }

    // Load messages
    const { data: messagesData } = await supabase
      .from('trip_messages')
      .select('*, sender:users(*)')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (messagesData) {
      setMessages(messagesData as TripMessage[]);
    }

    // Load schedule
    const { data: scheduleData } = await supabase
      .from('schedule_items')
      .select('*')
      .eq('trip_id', tripId)
      .order('start_time', { ascending: true });

    if (scheduleData) {
      setSchedule(scheduleData as ScheduleItem[]);
    }

    // Load user's ticket
    const { data: ticketData } = await supabase
      .from('tickets')
      .select('*')
      .eq('trip_id', tripId)
      .eq('member_id', user.id)
      .single();

    if (ticketData) {
      setTicket(ticketData as Ticket);
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
          <p className="text-white/50">Trip laden...</p>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/50 mb-4">Trip niet gevonden</p>
          <Link to="/dashboard" className="btn-primary">
            Terug naar Dashboard
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
                    {departure.toLocaleDateString('nl-NL', {
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
              label="Overzicht"
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
              label="Planning"
            />
            <TabButton
              active={activeTab === 'members'}
              onClick={() => setActiveTab('members')}
              icon={<Users className="w-4 h-4" />}
              label={`Leden (${members.length})`}
            />
            <TabButton
              active={activeTab === 'messages'}
              onClick={() => setActiveTab('messages')}
              icon={<MessageSquare className="w-4 h-4" />}
              label="Berichten"
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
          <MembersList members={members} isAdmin={isAdmin} tripId={tripId!} />
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
            De reis is begonnen! Veel plezier!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-500/20 to-fuchsia-500/20 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-center gap-6">
          <span className="text-white/60 text-sm">Vertrek over:</span>
          <div className="flex gap-3">
            <TimeUnit value={timeLeft.days} label="dagen" />
            <TimeUnit value={timeLeft.hours} label="uren" />
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
            Jouw Ticket
          </h2>
          {ticket ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm mb-1">Status</p>
                <p className="font-medium">
                  {revealStatus === 'full'
                    ? 'Volledig zichtbaar'
                    : revealStatus === 'qr_only'
                    ? 'QR-code beschikbaar'
                    : 'Nog verborgen'}
                </p>
              </div>
              <Link to="?tab=tickets" className="btn-primary text-sm">
                Bekijk Ticket
              </Link>
            </div>
          ) : (
            <p className="text-white/50">
              De admin heeft nog geen ticket voor je geüpload.
            </p>
          )}
        </div>

        {/* Announcements */}
        {pinnedMessages.length > 0 && (
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-yellow-400" />
              Belangrijke Berichten
            </h2>
            <div className="space-y-3">
              {pinnedMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl"
                >
                  <p className="text-sm">{msg.content}</p>
                  <p className="text-xs text-white/40 mt-2">
                    {new Date(msg.created_at).toLocaleString('nl-NL')}
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
              Komende Activiteiten
            </h2>
            <div className="space-y-3">
              {upcomingSchedule.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 p-3 bg-white/5 rounded-xl"
                >
                  <div className="w-12 text-center">
                    <p className="text-xs text-white/40">
                      {new Date(item.start_time).toLocaleDateString('nl-NL', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </p>
                    <p className="font-semibold">
                      {new Date(item.start_time).toLocaleTimeString('nl-NL', {
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
                {new Date(trip.departure_time).toLocaleDateString('nl-NL', {
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
                Vertrek:{' '}
                {new Date(trip.departure_time).toLocaleTimeString('nl-NL', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-white/40" />
              <span className="text-sm">{members.length} deelnemers</span>
            </div>
          </div>
        </div>

        {/* Quick Members List */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Deelnemers</h2>
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
                +{members.length - 5} meer
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MediaTab({ tripId: _tripId }: { tripId: string }) {
  return (
    <div className="card p-12 text-center">
      <Camera className="w-16 h-16 text-white/20 mx-auto mb-4" />
      <h2 className="text-xl font-semibold mb-2">Media Galerij</h2>
      <p className="text-white/50 mb-6">
        Upload en bekijk foto's en video's van de reis.
        <br />
        Na de reis kan hier een aftermovie worden gegenereerd.
      </p>
      <button className="btn-primary">Upload Media</button>
    </div>
  );
}
