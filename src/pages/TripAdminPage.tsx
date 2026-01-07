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
                      <span className="text-sm text-green-400">Ticket uploaded</span>
                      <button
                        onClick={() => {
                          setSelectedMember(member);
                          setShowUploadModal(true);
                        }}
                        className="btn-secondary text-sm"
                      >
                        Edit
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
  const [fullTicketFile, setFullTicketFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);

  // AI Ticket Analysis - simulated for now (would need OCR API in production)
  async function analyzeTicket(file: File) {
    setAnalyzing(true);

    // Simulate AI analysis delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // In production, this would call an OCR API like Google Vision, AWS Textract, or OpenAI GPT-4V
    // For now, we'll show the manual entry form after "analysis"
    setShowManualEntry(true);
    setAnalyzing(false);

    // Mock extracted data for demo purposes
    // In production, parse the actual ticket image
    console.log('[TicketUpload] Would analyze ticket:', file.name);
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
      });

      // First try to insert, then update if it exists
      const { data: existingTicket } = await supabase
        .from('tickets')
        .select('id, full_ticket_url')
        .eq('trip_id', tripId)
        .eq('member_id', selectedMemberId)
        .single();

      let error;

      if (existingTicket) {
        // Update existing ticket
        console.log('[TicketUpload] Updating existing ticket...');
        const result = await supabase.from('tickets').update({
          type: ticketType,
          carrier: carrier || null,
          departure_location: departureLocation || null,
          arrival_location: arrivalLocation || null,
          departure_time: departureTime ? new Date(departureTime).toISOString() : null,
          arrival_time: arrivalTime ? new Date(arrivalTime).toISOString() : null,
          seat_number: seatNumber || null,
          gate: gate || null,
          booking_reference: bookingReference || null,
          full_ticket_url: fullTicketUrl || existingTicket.full_ticket_url || null,
        }).eq('id', existingTicket.id);
        error = result.error;
      } else {
        // Insert new ticket
        console.log('[TicketUpload] Inserting new ticket...');
        const result = await supabase.from('tickets').insert({
          trip_id: tripId,
          member_id: selectedMemberId,
          type: ticketType,
          carrier: carrier || null,
          departure_location: departureLocation || null,
          arrival_location: arrivalLocation || null,
          departure_time: departureTime ? new Date(departureTime).toISOString() : null,
          arrival_time: arrivalTime ? new Date(arrivalTime).toISOString() : null,
          seat_number: seatNumber || null,
          gate: gate || null,
          booking_reference: bookingReference || null,
          full_ticket_url: fullTicketUrl,
        });
        error = result.error;
      }

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
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Carrier
                  </label>
                  <input
                    type="text"
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    className="input-field"
                    placeholder="KLM, Ryanair, etc."
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Departure Time
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
                    Arrival Time
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
  const [description, setDescription] = useState(trip.description || '');
  const [destination, setDestination] = useState(trip.destination || '');
  const [departureTime, setDepartureTime] = useState(
    trip.departure_time ? new Date(trip.departure_time).toISOString().slice(0, 16) : ''
  );
  const [loading, setLoading] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    await supabase
      .from('trips')
      .update({
        name,
        description: description || null,
        destination: destination || null,
        departure_time: departureTime ? new Date(departureTime).toISOString() : null,
      })
      .eq('id', trip.id);

    setLoading(false);
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
            />
            <p className="text-xs text-white/50 mt-1">
              QR codes reveal 3 hours before, full tickets 1 hour before departure
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? 'Saving...' : 'Save Changes'}
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
