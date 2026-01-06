import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Settings,
  FileText,
  Upload,
  Users,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, uploadFile } from '../lib/supabase';
import type { Trip, TripMember, Ticket } from '../types';

export default function TripAdminPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'settings' | 'tickets' | 'members'>('tickets');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (tripId && user) {
      loadData();
    }
  }, [tripId, user]);

  async function loadData() {
    if (!tripId || !user) return;

    // Load trip
    const { data: tripData } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();

    if (!tripData) {
      navigate('/dashboard');
      return;
    }

    // Verify admin access
    const { data: memberData } = await supabase
      .from('trip_members')
      .select('*')
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!memberData) {
      navigate(`/trip/${tripId}`);
      return;
    }

    setTrip(tripData as Trip);

    // Load members
    const { data: membersData } = await supabase
      .from('trip_members')
      .select('*, user:users(*)')
      .eq('trip_id', tripId);

    if (membersData) {
      setMembers(membersData as TripMember[]);
    }

    // Load tickets
    const { data: ticketsData } = await supabase
      .from('tickets')
      .select('*')
      .eq('trip_id', tripId);

    if (ticketsData) {
      setTickets(ticketsData as Ticket[]);
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

  if (loading || !trip) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to={`/trip/${tripId}`}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-400" />
                  Admin: {trip.name}
                </h1>
              </div>
            </div>

            <button
              onClick={copyLobbyCode}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              <span className="font-mono">{trip.lobby_code}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <div className="w-64 shrink-0">
            <nav className="space-y-1">
              <NavButton
                active={activeSection === 'tickets'}
                onClick={() => setActiveSection('tickets')}
                icon={<FileText className="w-5 h-5" />}
                label="Tickets Beheren"
              />
              <NavButton
                active={activeSection === 'members'}
                onClick={() => setActiveSection('members')}
                icon={<Users className="w-5 h-5" />}
                label="Leden Beheren"
              />
              <NavButton
                active={activeSection === 'settings'}
                onClick={() => setActiveSection('settings')}
                icon={<Settings className="w-5 h-5" />}
                label="Trip Instellingen"
              />
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {activeSection === 'tickets' && (
              <TicketsSection
                tripId={tripId!}
                members={members}
                tickets={tickets}
                onRefresh={loadData}
              />
            )}
            {activeSection === 'members' && (
              <MembersSection members={members} tripId={tripId!} />
            )}
            {activeSection === 'settings' && (
              <SettingsSection trip={trip} onUpdate={loadData} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function NavButton({
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
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
        active
          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
          : 'hover:bg-white/5 text-white/70'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function TicketsSection({
  tripId,
  members,
  tickets,
  onRefresh,
}: {
  tripId: string;
  members: TripMember[];
  tickets: Ticket[];
  onRefresh: () => void;
}) {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TripMember | null>(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Tickets Beheren</h2>
        <button
          onClick={() => setShowUploadModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Upload className="w-5 h-5" />
          Ticket Uploaden
        </button>
      </div>

      <div className="card p-6 mb-6">
        <h3 className="font-semibold mb-4">Ticket Status per Lid</h3>
        <div className="space-y-3">
          {members.map((member) => {
            const ticket = tickets.find((t) => t.member_id === member.user_id);
            return (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 bg-white/5 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-fuchsia-500 flex items-center justify-center">
                    {member.user?.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="font-medium">{member.user?.name}</p>
                    <p className="text-sm text-white/50">{member.user?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {ticket ? (
                    <>
                      <span className="text-sm text-green-400">Ticket geüpload</span>
                      <button
                        onClick={() => {
                          setSelectedMember(member);
                          setShowUploadModal(true);
                        }}
                        className="btn-secondary text-sm"
                      >
                        Wijzigen
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedMember(member);
                        setShowUploadModal(true);
                      }}
                      className="btn-primary text-sm"
                    >
                      Upload Ticket
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showUploadModal && (
        <TicketUploadModal
          tripId={tripId}
          member={selectedMember}
          members={members}
          onClose={() => {
            setShowUploadModal(false);
            setSelectedMember(null);
          }}
          onUploaded={() => {
            setShowUploadModal(false);
            setSelectedMember(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

function TicketUploadModal({
  tripId,
  member,
  members,
  onClose,
  onUploaded,
}: {
  tripId: string;
  member: TripMember | null;
  members: TripMember[];
  onClose: () => void;
  onUploaded: () => void;
}) {
  const [selectedMemberId, setSelectedMemberId] = useState(member?.user_id || '');
  const [ticketType, setTicketType] = useState<Ticket['type']>('flight');
  const [carrier, setCarrier] = useState('');
  const [departureLocation, setDepartureLocation] = useState('');
  const [arrivalLocation, setArrivalLocation] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [seatNumber, setSeatNumber] = useState('');
  const [gate, setGate] = useState('');
  const [bookingReference, setBookingReference] = useState('');
  const [qrCodeFile, setQrCodeFile] = useState<File | null>(null);
  const [fullTicketFile, setFullTicketFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    let qrCodeUrl = null;
    let fullTicketUrl = null;

    if (qrCodeFile) {
      qrCodeUrl = await uploadFile(
        'tickets',
        `${tripId}/${selectedMemberId}/qr-${Date.now()}.png`,
        qrCodeFile
      );
    }

    if (fullTicketFile) {
      fullTicketUrl = await uploadFile(
        'tickets',
        `${tripId}/${selectedMemberId}/ticket-${Date.now()}.${fullTicketFile.name.split('.').pop()}`,
        fullTicketFile
      );
    }

    // Upsert ticket
    await supabase.from('tickets').upsert({
      trip_id: tripId,
      member_id: selectedMemberId,
      type: ticketType,
      carrier: carrier || null,
      departure_location: departureLocation,
      arrival_location: arrivalLocation,
      departure_time: new Date(departureTime).toISOString(),
      arrival_time: arrivalTime ? new Date(arrivalTime).toISOString() : null,
      seat_number: seatNumber || null,
      gate: gate || null,
      booking_reference: bookingReference || null,
      qr_code_url: qrCodeUrl,
      full_ticket_url: fullTicketUrl,
    }, {
      onConflict: 'trip_id,member_id',
    });

    onUploaded();
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-6">Ticket Uploaden</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Lid
            </label>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="input-field"
              required
            >
              <option value="">Selecteer lid</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.user?.name} ({m.user?.email})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Type
              </label>
              <select
                value={ticketType}
                onChange={(e) => setTicketType(e.target.value as Ticket['type'])}
                className="input-field"
              >
                <option value="flight">Vlucht</option>
                <option value="train">Trein</option>
                <option value="bus">Bus</option>
                <option value="other">Anders</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Vervoerder
              </label>
              <input
                type="text"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                className="input-field"
                placeholder="KLM, NS, etc."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Vertreklocatie
              </label>
              <input
                type="text"
                value={departureLocation}
                onChange={(e) => setDepartureLocation(e.target.value)}
                className="input-field"
                placeholder="Amsterdam Schiphol"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Aankomstlocatie
              </label>
              <input
                type="text"
                value={arrivalLocation}
                onChange={(e) => setArrivalLocation(e.target.value)}
                className="input-field"
                placeholder="Barcelona"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Vertrektijd
              </label>
              <input
                type="datetime-local"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Aankomsttijd
              </label>
              <input
                type="datetime-local"
                value={arrivalTime}
                onChange={(e) => setArrivalTime(e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Stoelnummer
              </label>
              <input
                type="text"
                value={seatNumber}
                onChange={(e) => setSeatNumber(e.target.value)}
                className="input-field"
                placeholder="12A"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Gate
              </label>
              <input
                type="text"
                value={gate}
                onChange={(e) => setGate(e.target.value)}
                className="input-field"
                placeholder="B42"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Referentie
              </label>
              <input
                type="text"
                value={bookingReference}
                onChange={(e) => setBookingReference(e.target.value)}
                className="input-field"
                placeholder="ABC123"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              QR-code afbeelding
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setQrCodeFile(e.target.files?.[0] || null)}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Volledig ticket (PDF/afbeelding)
            </label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setFullTicketFile(e.target.files?.[0] || null)}
              className="input-field"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Annuleren
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1"
            >
              {loading ? 'Uploaden...' : 'Opslaan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MembersSection({
  members,
}: {
  members: TripMember[];
  tripId: string;
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Leden Beheren</h2>
      <div className="card p-6">
        <div className="space-y-3">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-4 bg-white/5 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-fuchsia-500 flex items-center justify-center">
                  {member.user?.name?.charAt(0) || '?'}
                </div>
                <div>
                  <p className="font-medium">{member.user?.name}</p>
                  <p className="text-sm text-white/50">{member.user?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-1 rounded-full text-xs ${
                    member.role === 'admin'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-white/10 text-white/60'
                  }`}
                >
                  {member.role === 'admin' ? 'Admin' : 'Lid'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SettingsSection({
  trip,
  onUpdate,
}: {
  trip: Trip;
  onUpdate: () => void;
}) {
  const navigate = useNavigate();
  const [name, setName] = useState(trip.name);
  const [description, setDescription] = useState(trip.description || '');
  const [loading, setLoading] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    await supabase
      .from('trips')
      .update({ name, description: description || null })
      .eq('id', trip.id);

    setLoading(false);
    onUpdate();
  }

  async function handleDelete() {
    if (
      !confirm(
        'Weet je zeker dat je deze trip wilt verwijderen? Dit kan niet ongedaan worden gemaakt.'
      )
    )
      return;

    await supabase.from('trips').delete().eq('id', trip.id);
    navigate('/dashboard');
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Trip Instellingen</h2>

      <form onSubmit={handleSave} className="card p-6 mb-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Trip Naam
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Beschrijving
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field resize-none"
              rows={3}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? 'Opslaan...' : 'Wijzigingen Opslaan'}
          </button>
        </div>
      </form>

      <div className="card p-6 border-red-500/30">
        <h3 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Gevaarlijke Zone
        </h3>
        <p className="text-white/60 text-sm mb-4">
          Het verwijderen van een trip is permanent en verwijdert alle data
          inclusief tickets, berichten en media.
        </p>
        <button
          onClick={handleDelete}
          className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Trip Verwijderen
        </button>
      </div>
    </div>
  );
}
