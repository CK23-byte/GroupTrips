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
  Sparkles,
  Crown,
  Loader2,
  Eye,
  X,
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
                label="Manage Tickets"
              />
              <NavButton
                active={activeSection === 'members'}
                onClick={() => setActiveSection('members')}
                icon={<Users className="w-5 h-5" />}
                label="Manage Members"
              />
              <NavButton
                active={activeSection === 'settings'}
                onClick={() => setActiveSection('settings')}
                icon={<Settings className="w-5 h-5" />}
                label="Trip Settings"
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
              <MembersSection members={members} tripId={tripId!} currentUserId={user?.id || ''} onRefresh={loadData} />
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
  const [viewingTicket, setViewingTicket] = useState<Ticket | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDeleteTicket(ticketId: string) {
    if (!confirm('Are you sure you want to delete this ticket?')) return;

    setDeleting(true);
    const { error } = await supabase.from('tickets').delete().eq('id', ticketId);
    setDeleting(false);

    if (error) {
      alert('Failed to delete ticket: ' + error.message);
      return;
    }

    onRefresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Manage Tickets</h2>
        <button
          onClick={() => setShowUploadModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Upload className="w-5 h-5" />
          Upload Ticket
        </button>
      </div>

      <div className="card p-6 mb-6">
        <h3 className="font-semibold mb-4">Ticket Status by Member</h3>
        <div className="space-y-3">
          {members.map((member) => {
            const memberTickets = tickets.filter((t) => t.member_id === member.user_id);
            return (
              <div
                key={member.id}
                className="p-4 bg-white/5 rounded-xl"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-fuchsia-500 flex items-center justify-center">
                      {member.user?.name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="font-medium">{member.user?.name}</p>
                      <p className="text-sm text-white/50">{member.user?.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedMember(member);
                      setShowUploadModal(true);
                    }}
                    className="btn-primary text-sm"
                  >
                    Add Ticket
                  </button>
                </div>
                {memberTickets.length > 0 && (
                  <div className="space-y-2 mt-3">
                    {memberTickets.map((ticket) => (
                      <div key={ticket.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg text-sm">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="text-green-400 flex-shrink-0">✓</span>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">
                              {ticket.type === 'flight' && ticket.flight_number
                                ? `${ticket.carrier || ''} ${ticket.flight_number}`.trim()
                                : ticket.type === 'event'
                                ? ticket.carrier || 'Event'
                                : ticket.type}
                            </p>
                            <p className="text-white/40 text-xs truncate">
                              {ticket.departure_location} → {ticket.arrival_location}
                              {ticket.departure_time && (
                                <span className="ml-2">
                                  {new Date(ticket.departure_time).toLocaleDateString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {ticket.full_ticket_url && (
                            <button
                              onClick={() => setViewingTicket(ticket)}
                              className="p-1.5 hover:bg-white/10 rounded text-blue-400 transition-colors"
                              title="View ticket"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteTicket(ticket.id)}
                            className="p-1.5 hover:bg-red-500/20 rounded text-red-400 transition-colors"
                            title="Delete ticket"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {memberTickets.length === 0 && (
                  <p className="text-sm text-white/40 ml-13 pl-13">No tickets uploaded yet</p>
                )}
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

      {/* View Ticket Modal */}
      {viewingTicket && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setViewingTicket(null)}
        >
          <div
            className="relative max-w-2xl w-full max-h-[90vh] overflow-auto bg-slate-800 rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setViewingTicket(null)}
              className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-4">
              <h3 className="font-semibold mb-2">
                {viewingTicket.type === 'flight' && viewingTicket.flight_number
                  ? `${viewingTicket.carrier || ''} ${viewingTicket.flight_number}`.trim()
                  : viewingTicket.carrier || viewingTicket.type}
              </h3>
              <p className="text-sm text-white/50 mb-4">
                {viewingTicket.departure_location} → {viewingTicket.arrival_location}
              </p>
            </div>
            {viewingTicket.full_ticket_url && (
              <img
                src={viewingTicket.full_ticket_url}
                alt="Ticket"
                className="w-full"
              />
            )}
          </div>
        </div>
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
  const [flightNumber, setFlightNumber] = useState('');
  const [departureLocation, setDepartureLocation] = useState('');
  const [arrivalLocation, setArrivalLocation] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [seatNumber, setSeatNumber] = useState('');
  const [gate, setGate] = useState('');
  const [bookingReference, setBookingReference] = useState('');
  const [fullTicketFile, setFullTicketFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [aiError, setAiError] = useState('');

  // AI Ticket Analysis using GPT-4 Vision
  async function analyzeTicket(file: File) {
    setAnalyzing(true);
    setAiError('');

    try {
      // Import and call the AI extraction function
      const { extractTicketData, matchPassengerToMember } = await import('../lib/openai');
      const extracted = await extractTicketData(file);

      console.log('[TicketUpload] AI extracted data:', extracted);

      // Auto-fill form fields with extracted data
      if (extracted.ticket_type) setTicketType(extracted.ticket_type);
      if (extracted.carrier) setCarrier(extracted.carrier);
      if (extracted.flight_number) setFlightNumber(extracted.flight_number);
      if (extracted.departure_location) setDepartureLocation(extracted.departure_location);
      if (extracted.arrival_location) setArrivalLocation(extracted.arrival_location);
      if (extracted.departure_time) {
        // Convert ISO to datetime-local format, preserving local time
        // If the string is already in ISO format like "2026-01-15T09:45:00", extract directly
        const isoMatch = extracted.departure_time.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
        if (isoMatch) {
          setDepartureTime(`${isoMatch[1]}T${isoMatch[2]}`);
        } else {
          // Fallback: parse as date and format in local timezone
          const dt = new Date(extracted.departure_time);
          if (!isNaN(dt.getTime())) {
            const year = dt.getFullYear();
            const month = String(dt.getMonth() + 1).padStart(2, '0');
            const day = String(dt.getDate()).padStart(2, '0');
            const hours = String(dt.getHours()).padStart(2, '0');
            const minutes = String(dt.getMinutes()).padStart(2, '0');
            setDepartureTime(`${year}-${month}-${day}T${hours}:${minutes}`);
          }
        }
      }
      if (extracted.arrival_time) {
        // Same for arrival time
        const isoMatch = extracted.arrival_time.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
        if (isoMatch) {
          setArrivalTime(`${isoMatch[1]}T${isoMatch[2]}`);
        } else {
          const at = new Date(extracted.arrival_time);
          if (!isNaN(at.getTime())) {
            const year = at.getFullYear();
            const month = String(at.getMonth() + 1).padStart(2, '0');
            const day = String(at.getDate()).padStart(2, '0');
            const hours = String(at.getHours()).padStart(2, '0');
            const minutes = String(at.getMinutes()).padStart(2, '0');
            setArrivalTime(`${year}-${month}-${day}T${hours}:${minutes}`);
          }
        }
      }
      if (extracted.seat_number) setSeatNumber(extracted.seat_number);
      if (extracted.gate) setGate(extracted.gate);
      if (extracted.booking_reference) setBookingReference(extracted.booking_reference);

      // Try to auto-match passenger to member
      if (extracted.passenger_name && !selectedMemberId) {
        const match = matchPassengerToMember(extracted.passenger_name, members);
        if (match && match.confidence >= 0.7) {
          setSelectedMemberId(match.user_id);
          console.log('[TicketUpload] Auto-matched passenger to member:', match);
        }
      }

      setShowManualEntry(true);
    } catch (error) {
      console.error('[TicketUpload] AI analysis error:', error);
      setAiError(error instanceof Error ? error.message : 'Failed to analyze ticket');
      setShowManualEntry(true); // Still show manual entry on error
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setFullTicketFile(file);
      await analyzeTicket(file);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      let fullTicketUrl = null;

      if (fullTicketFile) {
        console.log('[TicketUpload] Uploading file to storage...');

        // Add timeout to prevent infinite waiting
        const uploadPromise = uploadFile(
          'tickets',
          `${tripId}/${selectedMemberId}/ticket-${Date.now()}.${fullTicketFile.name.split('.').pop()}`,
          fullTicketFile
        );

        const timeoutPromise = new Promise<null>((_, reject) => {
          setTimeout(() => reject(new Error('Upload timed out after 30 seconds')), 30000);
        });

        try {
          fullTicketUrl = await Promise.race([uploadPromise, timeoutPromise]);
          console.log('[TicketUpload] File uploaded:', fullTicketUrl);
        } catch (uploadError) {
          console.error('[TicketUpload] Upload error:', uploadError);
          // Continue without file URL - user can still save ticket data
          alert('File upload failed, but you can still save ticket details. You can re-upload the file later.');
        }
      }

      console.log('[TicketUpload] Saving ticket to database...', {
        trip_id: tripId,
        member_id: selectedMemberId,
        type: ticketType,
        flight_number: flightNumber,
      });

      // Always insert new ticket (multiple tickets per person are allowed)
      console.log('[TicketUpload] Inserting new ticket...');

      // For event tickets, set sensible defaults for transport fields
      const isEvent = ticketType === 'event';
      const { error } = await supabase.from('tickets').insert({
        trip_id: tripId,
        member_id: selectedMemberId,
        type: ticketType,
        carrier: carrier || null,
        flight_number: isEvent ? null : (flightNumber || null),
        departure_location: isEvent ? (carrier || 'Event') : (departureLocation || 'TBD'),
        arrival_location: arrivalLocation || (isEvent ? 'Event Location' : 'TBD'),
        departure_time: departureTime ? new Date(departureTime).toISOString() : null,
        arrival_time: arrivalTime ? new Date(arrivalTime).toISOString() : null,
        seat_number: seatNumber || null,
        gate: isEvent ? null : (gate || null),
        booking_reference: bookingReference || null,
        full_ticket_url: fullTicketUrl,
      });

      if (error) {
        console.error('[TicketUpload] Database error:', error);
        alert(`Failed to save ticket: ${error.message}`);
        setLoading(false);
        return;
      }

      console.log('[TicketUpload] Ticket saved successfully');
      onUploaded();
    } catch (err) {
      console.error('[TicketUpload] Unexpected error:', err);
      alert(`An error occurred: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-6">Upload Ticket</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Member Selection */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Member
            </label>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="input-field"
              required
            >
              <option value="">Select member</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.user?.name} ({m.user?.email})
                </option>
              ))}
            </select>
          </div>

          {/* AI Ticket Upload */}
          <div className="border-2 border-dashed border-white/20 rounded-xl p-6 text-center">
            {analyzing ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                <p className="text-white/70">Analyzing ticket with AI...</p>
                <p className="text-sm text-white/50">Extracting flight details, dates, and seat info</p>
              </div>
            ) : fullTicketFile ? (
              <div className="flex flex-col items-center gap-2">
                <Check className="w-8 h-8 text-green-400" />
                <p className="font-medium">{fullTicketFile.name}</p>
                <button
                  type="button"
                  onClick={() => {
                    setFullTicketFile(null);
                    setShowManualEntry(false);
                  }}
                  className="text-sm text-blue-400 hover:underline"
                >
                  Upload different file
                </button>
              </div>
            ) : (
              <label className="cursor-pointer block">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium">Upload ticket image or PDF</p>
                    <p className="text-sm text-white/50 mt-1">AI will extract all details automatically</p>
                  </div>
                </div>
              </label>
            )}
          </div>

          {/* AI Error Display */}
          {aiError && (
            <div className="p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg text-yellow-200 text-sm">
              AI analysis failed: {aiError}. Please enter details manually.
            </div>
          )}

          {/* Manual Entry Toggle */}
          {!showManualEntry && !analyzing && (
            <button
              type="button"
              onClick={() => setShowManualEntry(true)}
              className="text-sm text-blue-400 hover:underline"
            >
              Or enter details manually
            </button>
          )}

          {/* Manual Entry Fields */}
          {showManualEntry && (
            <>
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
                    <option value="flight">Flight</option>
                    <option value="train">Train</option>
                    <option value="bus">Bus</option>
                    <option value="event">Event / Festival</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    {ticketType === 'event' ? 'Venue / Organizer' : 'Carrier'}
                  </label>
                  <input
                    type="text"
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    className="input-field"
                    placeholder={ticketType === 'event' ? 'Festival name, venue' : 'KLM, Ryanair, etc.'}
                  />
                </div>
              </div>

              {/* Transport-specific fields */}
              {ticketType !== 'event' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-2">
                        Flight/Train Number
                      </label>
                      <input
                        type="text"
                        value={flightNumber}
                        onChange={(e) => setFlightNumber(e.target.value)}
                        className="input-field"
                        placeholder="KL1234, BA567, IC621"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-2">
                        Departure
                      </label>
                      <input
                        type="text"
                        value={departureLocation}
                        onChange={(e) => setDepartureLocation(e.target.value)}
                        className="input-field"
                        placeholder="Amsterdam Schiphol"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-2">
                        Arrival
                      </label>
                      <input
                        type="text"
                        value={arrivalLocation}
                        onChange={(e) => setArrivalLocation(e.target.value)}
                        className="input-field"
                        placeholder="Barcelona"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Event-specific fields */}
              {ticketType === 'event' && (
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Location / Venue
                  </label>
                  <input
                    type="text"
                    value={arrivalLocation}
                    onChange={(e) => setArrivalLocation(e.target.value)}
                    className="input-field"
                    placeholder="Event location"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    {ticketType === 'event' ? 'Event Start' : 'Departure Time'}
                  </label>
                  <input
                    type="datetime-local"
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    {ticketType === 'event' ? 'Event End' : 'Arrival Time'}
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
                    Seat
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
                    Reference
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
            </>
          )}

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || analyzing || !selectedMemberId}
              className="btn-primary flex-1"
            >
              {loading ? 'Saving...' : 'Save Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MembersSection({
  members,
  tripId,
  currentUserId,
  onRefresh,
}: {
  members: TripMember[];
  tripId: string;
  currentUserId: string;
  onRefresh: () => void;
}) {
  const [loading, setLoading] = useState<string | null>(null);

  async function toggleAdmin(member: TripMember) {
    if (member.user_id === currentUserId) {
      alert("You can't change your own admin status");
      return;
    }

    setLoading(member.id);
    const newRole = member.role === 'admin' ? 'member' : 'admin';

    await supabase
      .from('trip_members')
      .update({ role: newRole })
      .eq('id', member.id);

    onRefresh();
    setLoading(null);
  }

  async function removeMember(member: TripMember) {
    if (member.user_id === currentUserId) {
      alert("You can't remove yourself from the trip");
      return;
    }

    if (!confirm(`Are you sure you want to remove ${member.user?.name} from this trip?`)) {
      return;
    }

    setLoading(member.id);

    // Also remove their ticket if they have one
    await supabase.from('tickets').delete().eq('trip_id', tripId).eq('member_id', member.user_id);
    await supabase.from('trip_members').delete().eq('id', member.id);

    onRefresh();
    setLoading(null);
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Manage Members</h2>
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
                  <p className="font-medium flex items-center gap-2">
                    {member.user?.name}
                    {member.role === 'admin' && (
                      <Crown className="w-4 h-4 text-yellow-400" />
                    )}
                  </p>
                  <p className="text-sm text-white/50">{member.user?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {member.user_id === currentUserId ? (
                  <span className="text-sm text-white/50">You</span>
                ) : (
                  <>
                    <button
                      onClick={() => toggleAdmin(member)}
                      disabled={loading === member.id}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        member.role === 'admin'
                          ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                          : 'bg-white/10 text-white/60 hover:bg-white/20'
                      }`}
                    >
                      {loading === member.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : member.role === 'admin' ? (
                        'Remove Admin'
                      ) : (
                        'Make Admin'
                      )}
                    </button>
                    <button
                      onClick={() => removeMember(member)}
                      disabled={loading === member.id}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"
                      title="Remove member"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
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
  const [groupName, setGroupName] = useState(trip.group_name || '');
  const [description, setDescription] = useState(trip.description || '');
  const [destination, setDestination] = useState(trip.destination || '');
  const [departureTime, setDepartureTime] = useState(
    trip.departure_time ? new Date(trip.departure_time).toISOString().slice(0, 16) : ''
  );
  const [returnTime, setReturnTime] = useState(
    trip.return_time ? new Date(trip.return_time).toISOString().slice(0, 16) : ''
  );
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSaved(false);

    const { error } = await supabase
      .from('trips')
      .update({
        name,
        group_name: groupName || null,
        description: description || null,
        destination: destination || null,
        departure_time: departureTime ? new Date(departureTime).toISOString() : null,
        return_time: returnTime ? new Date(returnTime).toISOString() : null,
      })
      .eq('id', trip.id);

    setLoading(false);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    onUpdate();
  }

  async function handleDelete() {
    if (
      !confirm(
        'Are you sure you want to delete this trip? This action cannot be undone.'
      )
    )
      return;

    await supabase.from('trips').delete().eq('id', trip.id);
    navigate('/dashboard');
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Trip Settings</h2>

      <form onSubmit={handleSave} className="card p-6 mb-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Trip Name
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
              Group Name (optional)
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="input-field"
              placeholder="The Boys, Family, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field resize-none"
              rows={3}
              placeholder="A brief description of the trip..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Destination
            </label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="input-field"
              placeholder="Barcelona, Paris, etc."
            />
            <p className="text-xs text-white/50 mt-1">
              Used for weather forecast. Hidden from participants until revealed.
            </p>
          </div>

          {/* Date Range */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <label className="block text-sm font-medium text-white/70 mb-3">
              Trip Dates
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-white/50 mb-1">Departure</label>
                <input
                  type="datetime-local"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Return</label>
                <input
                  type="datetime-local"
                  value={returnTime}
                  onChange={(e) => setReturnTime(e.target.value)}
                  className="input-field"
                  min={departureTime}
                />
              </div>
            </div>
            <p className="text-xs text-white/50 mt-2">
              QR codes reveal 3 hours before, full tickets 1 hour before departure
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : saved ? (
              <>
                <Check className="w-4 h-4" />
                Saved!
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>

      <div className="card p-6 border-red-500/30">
        <h3 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Danger Zone
        </h3>
        <p className="text-white/60 text-sm mb-4">
          Deleting a trip is permanent and removes all data including tickets,
          messages, and media.
        </p>
        <button
          onClick={handleDelete}
          className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Delete Trip
        </button>
      </div>
    </div>
  );
}
