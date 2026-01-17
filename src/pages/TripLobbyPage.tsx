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
import OutlookSchedule from '../components/OutlookSchedule';
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
  const [scheduleView, setScheduleView] = useState<'calendar' | 'timeline'>('calendar');

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
              label={`Group (${members.length})`}
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
          <div className="space-y-4">
            {/* View toggle */}
            <div className="flex justify-end">
              <div className="inline-flex bg-white/5 rounded-lg p-1">
                <button
                  onClick={() => setScheduleView('calendar')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    scheduleView === 'calendar'
                      ? 'bg-blue-500 text-white'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  Calendar
                </button>
                <button
                  onClick={() => setScheduleView('timeline')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    scheduleView === 'timeline'
                      ? 'bg-blue-500 text-white'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  Timeline
                </button>
              </div>
            </div>

            {/* Schedule views */}
            {scheduleView === 'calendar' ? (
              <OutlookSchedule
                items={schedule}
                tripStartDate={trip?.departure_time || new Date().toISOString()}
                tripEndDate={trip?.return_time}
                isAdmin={isAdmin}
                tripId={tripId!}
                trip={trip}
                memberCount={members.length}
                onRefresh={loadTripData}
              />
            ) : (
              <Timeline schedule={schedule} isAdmin={isAdmin} tripId={tripId!} trip={trip} memberCount={members.length} onRefresh={loadTripData} />
            )}
          </div>
        )}
        {activeTab === 'members' && (
          <MembersList members={members} isAdmin={isAdmin} tripId={tripId!} lobbyCode={trip?.lobby_code} />
        )}
        {activeTab === 'location' && (
          <LocationTab tripId={tripId!} members={members} tripEndTime={trip?.return_time} />
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
      className={`flex items-center gap-2 px-3 sm:px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
        active
          ? 'text-blue-400 border-b-2 border-blue-400'
          : 'text-white/50 hover:text-white/80'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
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
  messages,
  schedule,
  revealStatus,
  onViewTicket,
  isAdmin,
}: {
  trip: Trip;
  ticket: Ticket | null;
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
          </div>
        </div>

        {/* Weather Card */}
        <WeatherCard
          destination={trip.destination}
          departureDate={trip.departure_time}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );
}

// Weather component using Open-Meteo API (free, no API key required)
function WeatherCard({ destination, departureDate, isAdmin }: { destination?: string; departureDate: string; isAdmin: boolean }) {
  const [weather, setWeather] = useState<{
    temperature: number;
    condition: string;
    icon: string;
    humidity: number;
    windSpeed: number;
    forecast: { date: string; high: number; low: number; condition: string; icon: string }[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (destination) {
      fetchWeather(destination);
    }
  }, [destination]);

  async function fetchWeather(location: string) {
    setLoading(true);
    setError('');

    try {
      // First, geocode the location to get coordinates
      const geoResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`
      );
      const geoData = await geoResponse.json();

      if (!geoData.results || geoData.results.length === 0) {
        setError('Location not found');
        setLoading(false);
        return;
      }

      const { latitude, longitude } = geoData.results[0];

      // Calculate the date range (departure date + 7 days)
      const startDate = new Date(departureDate);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);

      // Fetch weather data
      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&start_date=${startDate.toISOString().split('T')[0]}&end_date=${endDate.toISOString().split('T')[0]}`
      );
      const weatherData = await weatherResponse.json();

      // Map weather codes to conditions and icons
      const weatherCondition = getWeatherCondition(weatherData.current.weather_code);

      setWeather({
        temperature: Math.round(weatherData.current.temperature_2m),
        condition: weatherCondition.text,
        icon: weatherCondition.icon,
        humidity: weatherData.current.relative_humidity_2m,
        windSpeed: Math.round(weatherData.current.wind_speed_10m),
        forecast: weatherData.daily.time.map((date: string, i: number) => ({
          date,
          high: Math.round(weatherData.daily.temperature_2m_max[i]),
          low: Math.round(weatherData.daily.temperature_2m_min[i]),
          ...getWeatherCondition(weatherData.daily.weather_code[i]),
        })),
      });
    } catch (err) {
      console.error('Weather fetch error:', err);
      setError('Could not load weather');
    } finally {
      setLoading(false);
    }
  }

  // Map WMO weather codes to conditions
  function getWeatherCondition(code: number): { text: string; icon: string } {
    const conditions: Record<number, { text: string; icon: string }> = {
      0: { text: 'Clear', icon: '☀️' },
      1: { text: 'Mostly Clear', icon: '🌤️' },
      2: { text: 'Partly Cloudy', icon: '⛅' },
      3: { text: 'Cloudy', icon: '☁️' },
      45: { text: 'Foggy', icon: '🌫️' },
      48: { text: 'Foggy', icon: '🌫️' },
      51: { text: 'Light Drizzle', icon: '🌧️' },
      53: { text: 'Drizzle', icon: '🌧️' },
      55: { text: 'Heavy Drizzle', icon: '🌧️' },
      61: { text: 'Light Rain', icon: '🌧️' },
      63: { text: 'Rain', icon: '🌧️' },
      65: { text: 'Heavy Rain', icon: '🌧️' },
      71: { text: 'Light Snow', icon: '🌨️' },
      73: { text: 'Snow', icon: '🌨️' },
      75: { text: 'Heavy Snow', icon: '❄️' },
      77: { text: 'Snow Grains', icon: '🌨️' },
      80: { text: 'Light Showers', icon: '🌦️' },
      81: { text: 'Showers', icon: '🌦️' },
      82: { text: 'Heavy Showers', icon: '⛈️' },
      85: { text: 'Snow Showers', icon: '🌨️' },
      86: { text: 'Heavy Snow', icon: '❄️' },
      95: { text: 'Thunderstorm', icon: '⛈️' },
      96: { text: 'Thunderstorm', icon: '⛈️' },
      99: { text: 'Severe Storm', icon: '⛈️' },
    };
    return conditions[code] || { text: 'Unknown', icon: '❓' };
  }

  // Check if destination should be hidden
  // - More than 3 hours: Show approximate weather for packing, hide destination
  // - 1-3 hours: Show approximate weather, hide destination
  // - Less than 1 hour: Full reveal with destination name
  const departureTime = new Date(departureDate).getTime();
  const now = Date.now();
  const hoursUntilDeparture = (departureTime - now) / (1000 * 60 * 60);
  const isDestinationRevealed = isAdmin || hoursUntilDeparture <= 1;
  const showApproximateWeather = hoursUntilDeparture <= 72; // Show approximate weather up to 3 days before

  // Helper to approximate temperatures (+/- 3 degrees range)
  const approximateTemp = (temp: number) => {
    const roundedBase = Math.round(temp / 5) * 5; // Round to nearest 5
    return `${roundedBase - 3}° - ${roundedBase + 3}°C`;
  };

  // Helper to get general weather category (less specific)
  const getGeneralCondition = (condition: string) => {
    const lowerCondition = condition.toLowerCase();
    if (lowerCondition.includes('rain') || lowerCondition.includes('drizzle') || lowerCondition.includes('shower')) {
      return { text: 'Rainy', icon: '🌧️', tip: 'Bring a rain jacket' };
    }
    if (lowerCondition.includes('snow')) {
      return { text: 'Cold & Snowy', icon: '❄️', tip: 'Pack warm clothes' };
    }
    if (lowerCondition.includes('cloud') || lowerCondition.includes('fog')) {
      return { text: 'Cloudy', icon: '☁️', tip: 'Layers recommended' };
    }
    if (lowerCondition.includes('storm') || lowerCondition.includes('thunder')) {
      return { text: 'Stormy', icon: '⛈️', tip: 'Bring rain gear' };
    }
    return { text: 'Pleasant', icon: '🌤️', tip: 'Light clothing should be fine' };
  };

  if (!destination) {
    return (
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="text-2xl">🌤️</span>
          Weather
        </h2>
        <p className="text-white/50 text-sm">
          {isAdmin
            ? 'Set a destination in Trip Settings to show weather forecast.'
            : 'Weather forecast will appear closer to departure.'}
        </p>
      </div>
    );
  }

  // Show approximate weather for packing (destination hidden)
  if (!isDestinationRevealed && weather && showApproximateWeather) {
    const generalCondition = getGeneralCondition(weather.condition);
    const avgHigh = weather.forecast.length > 0
      ? Math.round(weather.forecast.reduce((sum, d) => sum + d.high, 0) / weather.forecast.length)
      : weather.temperature;

    return (
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="text-2xl">🧳</span>
          Packing Guide
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/50 text-sm">Expected temperature</p>
              <p className="text-2xl font-bold">{approximateTemp(avgHigh)}</p>
            </div>
            <div className="text-4xl">{generalCondition.icon}</div>
          </div>

          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-white/70 flex items-center gap-2">
              <span>{generalCondition.icon}</span>
              <span>{generalCondition.text} conditions expected</span>
            </p>
            <p className="text-sm text-white/50 mt-1">{generalCondition.tip}</p>
          </div>

          {/* Approximate forecast */}
          <div className="border-t border-white/10 pt-4">
            <p className="text-xs text-white/40 mb-3">Trip forecast (approximate)</p>
            <div className="grid grid-cols-4 gap-2">
              {weather.forecast.slice(0, 4).map((day) => {
                const dayCondition = getGeneralCondition(day.condition);
                return (
                  <div key={day.date} className="text-center">
                    <p className="text-xs text-white/50">
                      {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </p>
                    <p className="text-lg my-1">{dayCondition.icon}</p>
                    <p className="text-xs text-white/60">
                      ~{Math.round(day.high / 5) * 5}°
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-xs text-white/40 text-center">
            🎁 Exact location reveals {hoursUntilDeparture > 24
              ? `in ${Math.floor(hoursUntilDeparture / 24)} days`
              : `in ${Math.floor(hoursUntilDeparture)} hours`}
          </p>
        </div>
      </div>
    );
  }

  // Show mystery message when weather hasn't loaded yet or too far out
  if (!isDestinationRevealed) {
    return (
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="text-2xl">🎁</span>
          Weather
        </h2>
        <div className="text-center py-4">
          <p className="text-2xl mb-2">🤫</p>
          <p className="text-white/70 font-medium">Destination is a surprise!</p>
          <p className="text-white/50 text-sm mt-2">
            Packing guide available 3 days before departure
          </p>
          {hoursUntilDeparture > 0 && (
            <p className="text-xs text-white/40 mt-2">
              {hoursUntilDeparture > 24
                ? `${Math.floor(hoursUntilDeparture / 24)} days to go`
                : `${Math.floor(hoursUntilDeparture)} hours to go`}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="text-2xl">🌤️</span>
          Weather
        </h2>
        <div className="flex items-center gap-2 text-white/50">
          <div className="w-4 h-4 border-2 border-white/30 border-t-white/70 rounded-full animate-spin" />
          Loading weather...
        </div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="text-2xl">🌤️</span>
          Weather
        </h2>
        <p className="text-white/50 text-sm">{error || 'Weather unavailable'}</p>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span className="text-2xl">{weather.icon}</span>
        Weather in {destination}
      </h2>

      {/* Current weather */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-4xl font-bold">{weather.temperature}°C</p>
          <p className="text-white/60">{weather.condition}</p>
        </div>
        <div className="text-right text-sm text-white/50">
          <p>💧 {weather.humidity}%</p>
          <p>💨 {weather.windSpeed} km/h</p>
        </div>
      </div>

      {/* Forecast */}
      <div className="border-t border-white/10 pt-4">
        <p className="text-xs text-white/40 mb-3">Trip forecast</p>
        <div className="grid grid-cols-4 gap-2">
          {weather.forecast.slice(0, 4).map((day) => (
            <div key={day.date} className="text-center">
              <p className="text-xs text-white/50">
                {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
              </p>
              <p className="text-lg my-1">{day.icon}</p>
              <p className="text-xs">
                <span className="text-white">{day.high}°</span>
                <span className="text-white/40"> / {day.low}°</span>
              </p>
            </div>
          ))}
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

// Debug logging for location sharing
function locationLog(message: string, data?: unknown) {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, 12);
  console.log(`[${timestamp}][Location] ${message}`, data !== undefined ? data : '');
}

function LocationTab({ tripId, members, tripEndTime }: { tripId: string; members: TripMember[]; tripEndTime?: string }) {
  const { user } = useAuth();
  const [sharing, setSharing] = useState(false);
  const [locations, setLocations] = useState<MemberLocation[]>([]);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState('');
  const [debugMsg, setDebugMsg] = useState('');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  // Check if trip has ended + 1 hour (location sharing auto-stops)
  const now = new Date();
  const tripEnd = tripEndTime ? new Date(tripEndTime) : null;
  const autoStopTime = tripEnd ? new Date(tripEnd.getTime() + 60 * 60 * 1000) : null; // +1 hour
  const isSharingDisabled = autoStopTime ? now > autoStopTime : false;

  // Auto-stop sharing if trip has ended + 1 hour
  useEffect(() => {
    if (isSharingDisabled && sharing && watchId !== null) {
      locationLog('Auto-stopping location sharing (trip ended + 1 hour)');
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      setSharing(false);
      setMyLocation(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSharingDisabled]);

  useEffect(() => {
    locationLog('LocationTab mounted', { tripId, userId: user?.id });
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
        (payload) => {
          locationLog('Realtime update received', payload);
          loadLocations();
        }
      )
      .subscribe((status) => {
        locationLog('Subscription status', status);
      });

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
    locationLog('Loading locations from database...');
    const { data, error: fetchError } = await supabase
      .from('member_locations')
      .select('*, user:users(name)')
      .eq('trip_id', tripId);

    if (fetchError) {
      locationLog('Error loading locations', fetchError);
      setDebugMsg(`Load error: ${fetchError.message}`);
    } else if (data) {
      locationLog('Locations loaded', { count: data.length, data });
      setLocations(data);
      setLastUpdate(new Date());
      setDebugMsg(`Loaded ${data.length} locations`);
    }
  }

  async function startSharing() {
    locationLog('startSharing called', { userId: user?.id });

    if (!navigator.geolocation) {
      const msg = 'Geolocation is not supported by your browser';
      setError(msg);
      locationLog(msg);
      return;
    }

    if (!user?.id) {
      const msg = 'You must be logged in to share location';
      setError(msg);
      locationLog(msg);
      return;
    }

    setSharing(true);
    setGettingLocation(true);
    setError('');
    setDebugMsg('Requesting location permission...');

    const id = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        locationLog('Position received', { latitude, longitude, accuracy });
        setMyLocation({ lat: latitude, lng: longitude });
        setGettingLocation(false);
        setDebugMsg(`Got location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)} (accuracy: ${Math.round(accuracy)}m)`);

        // Update location in database
        const { error: upsertError } = await supabase.from('member_locations').upsert({
          trip_id: tripId,
          user_id: user.id,
          latitude,
          longitude,
          updated_at: new Date().toISOString(),
        });

        if (upsertError) {
          locationLog('Error upserting location', upsertError);
          setDebugMsg(`DB error: ${upsertError.message}`);
        } else {
          locationLog('Location saved to database');
          // Reload to get the updated list
          loadLocations();
        }
      },
      (err) => {
        locationLog('Geolocation error', { code: err.code, message: err.message });
        let errorMsg = 'Error getting location';
        switch (err.code) {
          case 1:
            errorMsg = 'Location permission denied. Please allow location access in your browser settings.';
            break;
          case 2:
            errorMsg = 'Location unavailable. Please check your device settings.';
            break;
          case 3:
            errorMsg = 'Location request timed out. Please try again.';
            break;
          default:
            errorMsg = `Error: ${err.message}`;
        }
        setError(errorMsg);
        setSharing(false);
        setGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 30000,
        timeout: 15000,
      }
    );
    setWatchId(id);
  }

  async function stopSharing() {
    locationLog('stopSharing called');

    // Clear the geolocation watcher
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }

    setSharing(false);
    setMyLocation(null);
    setDebugMsg('Location sharing stopped');

    // Remove location from database
    if (user?.id) {
      const { error: deleteError } = await supabase
        .from('member_locations')
        .delete()
        .eq('trip_id', tripId)
        .eq('user_id', user.id);

      if (deleteError) {
        locationLog('Error deleting location', deleteError);
      } else {
        locationLog('Location deleted from database');
        loadLocations();
      }
    }
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

  // Merge locations: include user's own location if sharing but not yet in DB
  const allLocations = React.useMemo(() => {
    const dbLocations = locations.map(loc => ({
      user_id: loc.user_id,
      latitude: loc.latitude,
      longitude: loc.longitude,
      updated_at: loc.updated_at,
      user: loc.user ? { name: loc.user.name } : undefined,
    }));

    // Add own location if sharing and not already in locations
    if (sharing && myLocation && user?.id) {
      const existsInDb = locations.some(loc => loc.user_id === user.id);
      if (!existsInDb) {
        dbLocations.push({
          user_id: user.id,
          latitude: myLocation.lat,
          longitude: myLocation.lng,
          updated_at: new Date().toISOString(),
          user: { name: user.name || 'You' },
        });
      }
    }

    return dbLocations;
  }, [locations, sharing, myLocation, user]);

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
            disabled={gettingLocation || isSharingDisabled}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors disabled:opacity-50 ${
              isSharingDisabled
                ? 'bg-white/10 text-white/40 cursor-not-allowed'
                : sharing
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
            }`}
          >
            {isSharingDisabled ? (
              <>
                <Navigation className="w-4 h-4" />
                Trip Ended
              </>
            ) : gettingLocation ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Getting location...
              </>
            ) : sharing ? (
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

        {/* Info about auto-stop */}
        {tripEnd && !isSharingDisabled && (
          <div className="p-3 bg-white/5 border border-white/10 rounded-lg text-white/60 text-sm mb-4">
            <p>Location sharing automatically stops 1 hour after the trip ends.</p>
            {autoStopTime && (
              <p className="text-xs text-white/40 mt-1">
                Auto-stop: {autoStopTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {autoStopTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        )}

        {/* Trip ended message */}
        {isSharingDisabled && (
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-200/80 text-sm mb-4">
            This trip has ended. Location sharing is no longer available.
          </div>
        )}

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

        {/* Debug info - helpful for troubleshooting */}
        {debugMsg && (
          <div className="mt-2 text-xs text-white/40 font-mono">
            {debugMsg}
          </div>
        )}
      </div>

      {/* Interactive Map */}
      <div className="card p-6">
        <GoogleMapComponent
          memberLocations={allLocations}
          height="400px"
          currentUserId={user?.id}
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
        {allLocations.length === 0 ? (
          <p className="text-white/50 text-sm">
            No members are currently sharing their location.
            Be the first to share!
          </p>
        ) : (
          <div className="space-y-3">
            {allLocations.map((loc) => {
              const isMe = loc.user_id === user?.id;
              return (
                <div
                  key={loc.user_id}
                  className={`flex items-center gap-3 p-3 rounded-xl ${
                    isMe ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-white/5'
                  }`}
                >
                  <div className="relative">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
                      isMe
                        ? 'bg-gradient-to-br from-blue-500 to-cyan-500'
                        : 'bg-gradient-to-br from-blue-500 to-fuchsia-500'
                    }`}>
                      {loc.user?.name?.charAt(0) || '?'}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-slate-800" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">
                      {isMe ? 'You' : (loc.user?.name || 'Unknown')}
                      {isMe && <span className="ml-2 text-xs text-blue-400">(sharing)</span>}
                    </p>
                    <p className="text-xs text-white/40">
                      Updated {getTimeSince(loc.updated_at)}
                    </p>
                  </div>
                  <div className="text-right text-xs text-white/40">
                    <p>{loc.latitude.toFixed(4)}</p>
                    <p>{loc.longitude.toFixed(4)}</p>
                  </div>
                </div>
              );
            })}
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
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
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
    const fileArray = Array.from(files);
    setUploadProgress({ current: 0, total: fileArray.length });

    console.log('[MediaTab] Starting upload of', fileArray.length, 'files');

    // Upload function for a single file
    async function uploadSingleFile(file: File, index: number): Promise<boolean> {
      try {
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        const fileName = `${tripId}/${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const isVideo = file.type.startsWith('video/');

        console.log('[MediaTab] Uploading file:', fileName, 'Type:', file.type);

        // Upload to storage
        const { error: storageError, data: uploadData } = await supabase.storage
          .from('trip-media')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (storageError) {
          console.error('[MediaTab] Storage upload error:', storageError);
          return false;
        }

        console.log('[MediaTab] Storage upload success:', uploadData);

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('trip-media')
          .getPublicUrl(fileName);

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
          return false;
        }

        return true;
      } catch (err) {
        console.error('[MediaTab] Unexpected upload error:', err);
        return false;
      }
    }

    // Upload in parallel batches of 3 to prevent overload
    const batchSize = 3;
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < fileArray.length; i += batchSize) {
      const batch = fileArray.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map((file, idx) => uploadSingleFile(file, i + idx))
      );

      results.forEach(success => {
        if (success) successCount++;
        else failCount++;
      });

      setUploadProgress({ current: Math.min(i + batchSize, fileArray.length), total: fileArray.length });
    }

    if (failCount > 0) {
      setUploadError(`${failCount} of ${fileArray.length} files failed to upload`);
    }

    await loadMedia();
    setUploading(false);
    setUploadProgress({ current: 0, total: 0 });
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
              Uploading {uploadProgress.current}/{uploadProgress.total}...
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
                {uploadProgress.current}/{uploadProgress.total}
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
                  // Pass photo URL for media items to render photo markers
                  photoUrl: item.itemType === 'media' ? (item as MediaItem).file_url : undefined,
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
