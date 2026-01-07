import { useState, useEffect } from 'react';
import { QrCode, Plane, Train, Bus, MapPin, AlertCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { Ticket, TicketRevealStatus, Trip } from '../types';

interface TicketRevealProps {
  ticket: Ticket | null;
  revealStatus: TicketRevealStatus;
  departureTime: string;
  trip?: Trip | null;
  userName?: string;
}

const typeIcons = {
  flight: Plane,
  train: Train,
  bus: Bus,
  other: MapPin,
};

export default function TicketReveal({
  ticket,
  revealStatus,
  departureTime,
  trip,
  userName,
}: TicketRevealProps) {
  const [showAnimation, setShowAnimation] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  useEffect(() => {
    if (revealStatus !== 'hidden') {
      setShowAnimation(true);
    }
  }, [revealStatus]);

  if (!ticket) {
    return (
      <div className="card p-8 md:p-12 text-center">
        <AlertCircle className="w-12 h-12 md:w-16 md:h-16 text-white/20 mx-auto mb-4" />
        <h2 className="text-lg md:text-xl font-semibold mb-2">No Ticket</h2>
        <p className="text-white/50 text-sm md:text-base">
          The admin hasn't uploaded your ticket yet.
          <br />
          Check back later or contact the trip admin.
        </p>
      </div>
    );
  }

  const TypeIcon = typeIcons[ticket.type] || MapPin;

  // Generate QR code data - use booking reference or create unique ID
  const qrData = ticket.booking_reference || `GT-${ticket.id.substring(0, 8).toUpperCase()}`;

  // Hidden state
  if (revealStatus === 'hidden') {
    return (
      <div className="max-w-md mx-auto">
        <div className="card p-6 md:p-8 text-center">
          <div className="relative w-24 h-24 md:w-32 md:h-32 mx-auto mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-fuchsia-500/20 rounded-2xl animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <QrCode className="w-12 h-12 md:w-16 md:h-16 text-white/30" />
            </div>
          </div>

          <h2 className="text-xl md:text-2xl font-bold mb-2">Ticket Hidden</h2>
          <p className="text-white/60 mb-6 text-sm md:text-base">
            Your ticket will be revealed as the departure time approaches.
          </p>

          <div className="bg-white/5 rounded-xl p-4 md:p-6 mb-6">
            <h3 className="text-sm font-medium text-white/70 mb-4">
              Reveal Schedule
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-white/50">3 hours before</span>
                <span className="text-blue-400">QR code visible</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50">1 hour before</span>
                <span className="text-green-400">Full ticket visible</span>
              </div>
            </div>
          </div>

          <CountdownToReveal departureTime={departureTime} />
        </div>
      </div>
    );
  }

  // QR Only state - Festival style but with hidden destination
  if (revealStatus === 'qr_only') {
    return (
      <div className="max-w-md mx-auto">
        <div className={`relative overflow-hidden rounded-3xl ${showAnimation ? 'ticket-reveal' : ''}`}>
          {/* Gradient background like Freshtival */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-fuchsia-900 to-purple-800" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(236,72,153,0.3),transparent_50%)]" />

          <div className="relative p-6 md:p-8">
            {/* Header with icon and date */}
            <div className="flex items-start justify-between mb-6">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center shadow-xl">
                <TypeIcon className="w-8 h-8 md:w-10 md:h-10" />
              </div>
              <div className="text-right">
                <p className="text-fuchsia-300 text-sm font-medium">
                  {new Date(ticket.departure_time).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                <p className="text-xl md:text-2xl font-bold">
                  {new Date(ticket.departure_time).toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>

            {/* Event/Trip name */}
            <div className="mb-6">
              <p className="text-fuchsia-300 text-sm font-medium uppercase tracking-wider mb-1">
                {ticket.type === 'flight' ? 'Flight' : ticket.type === 'train' ? 'Train Journey' : 'Trip'}
              </p>
              <h2 className="text-2xl md:text-3xl font-bold">
                {trip?.name || ticket.carrier || 'Your Journey'}
              </h2>
            </div>

            {/* Ticket info */}
            <div className="mb-4">
              <p className="text-fuchsia-300 text-sm font-medium uppercase tracking-wider mb-1">
                Ticket
              </p>
              <p className="text-lg">
                {ticket.carrier ? `${ticket.carrier} • ` : ''}{ticket.departure_location} → ???
              </p>
            </div>

            {/* Destination hidden notice */}
            <div className="mb-6 p-4 bg-fuchsia-500/20 border border-fuchsia-500/30 rounded-xl">
              <div className="flex items-center gap-2 text-fuchsia-300">
                <MapPin className="w-4 h-4" />
                <span className="font-medium">Destination: Hidden</span>
              </div>
              <p className="text-xs text-white/50 mt-1">
                Will be revealed 1 hour before departure
              </p>
            </div>

            {/* Name */}
            <div className="mb-6">
              <p className="text-fuchsia-300 text-sm font-medium uppercase tracking-wider mb-1">
                Passenger
              </p>
              <p className="text-lg font-semibold">{userName || 'Traveler'}</p>
            </div>

            {/* QR Code */}
            <div
              className="flex flex-col items-center cursor-pointer"
              onClick={() => setShowQRModal(true)}
            >
              <div className="bg-white rounded-2xl p-4 shadow-2xl mb-2">
                {ticket.qr_code_url ? (
                  <img src={ticket.qr_code_url} alt="QR Code" className="w-40 h-40 md:w-48 md:h-48" />
                ) : (
                  <QRCodeSVG
                    value={qrData}
                    size={160}
                    level="H"
                    includeMargin={false}
                  />
                )}
              </div>
              <p className="font-mono text-sm text-white/60">{qrData}</p>
              <p className="text-xs text-white/40 mt-1">Tap to enlarge</p>
            </div>
          </div>
        </div>

        <CountdownToReveal departureTime={departureTime} fullReveal className="mt-6" />

        {/* QR Modal */}
        {showQRModal && (
          <QRModal
            qrData={qrData}
            qrUrl={ticket.qr_code_url}
            onClose={() => setShowQRModal(false)}
          />
        )}
      </div>
    );
  }

  // Full reveal - Festival style ticket like Freshtival
  return (
    <div className="max-w-md mx-auto">
      <div className={`relative overflow-hidden rounded-3xl ${showAnimation ? 'ticket-reveal' : ''}`}>
        {/* Gradient background like Freshtival */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-fuchsia-900 to-purple-800" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(236,72,153,0.3),transparent_50%)]" />

        <div className="relative p-6 md:p-8">
          {/* Header with icon and date */}
          <div className="flex items-start justify-between mb-6">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center shadow-xl">
              <TypeIcon className="w-8 h-8 md:w-10 md:h-10" />
            </div>
            <div className="text-right">
              <p className="text-fuchsia-300 text-sm font-medium">
                {new Date(ticket.departure_time).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
              <p className="text-xl md:text-2xl font-bold">
                {new Date(ticket.departure_time).toLocaleDateString('en-US', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>

          {/* Event/Trip name */}
          <div className="mb-6">
            <p className="text-fuchsia-300 text-sm font-medium uppercase tracking-wider mb-1">
              {ticket.type === 'flight' ? 'Flight' : ticket.type === 'train' ? 'Train Journey' : 'Trip'}
            </p>
            <h2 className="text-2xl md:text-3xl font-bold">
              {trip?.name || ticket.carrier || 'Your Journey'}
            </h2>
          </div>

          {/* Ticket info with full route */}
          <div className="mb-4">
            <p className="text-fuchsia-300 text-sm font-medium uppercase tracking-wider mb-1">
              Ticket
            </p>
            <p className="text-lg">
              {ticket.carrier ? `${ticket.carrier} • ` : ''}{ticket.departure_location} → {ticket.arrival_location}
            </p>
          </div>

          {/* Additional details */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {ticket.gate && (
              <div>
                <p className="text-fuchsia-300 text-xs font-medium uppercase tracking-wider mb-1">Gate</p>
                <p className="font-semibold">{ticket.gate}</p>
              </div>
            )}
            {ticket.seat_number && (
              <div>
                <p className="text-fuchsia-300 text-xs font-medium uppercase tracking-wider mb-1">Seat</p>
                <p className="font-semibold">{ticket.seat_number}</p>
              </div>
            )}
            {ticket.arrival_time && (
              <div>
                <p className="text-fuchsia-300 text-xs font-medium uppercase tracking-wider mb-1">Arrival</p>
                <p className="font-semibold">
                  {new Date(ticket.arrival_time).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            )}
            {ticket.booking_reference && (
              <div>
                <p className="text-fuchsia-300 text-xs font-medium uppercase tracking-wider mb-1">Reference</p>
                <p className="font-mono font-semibold">{ticket.booking_reference}</p>
              </div>
            )}
          </div>

          {/* Name */}
          <div className="mb-6">
            <p className="text-fuchsia-300 text-sm font-medium uppercase tracking-wider mb-1">
              Passenger
            </p>
            <p className="text-lg font-semibold">{userName || 'Traveler'}</p>
          </div>

          {/* QR Code */}
          <div
            className="flex flex-col items-center cursor-pointer"
            onClick={() => setShowQRModal(true)}
          >
            <div className="bg-white rounded-2xl p-4 shadow-2xl mb-2">
              {ticket.qr_code_url ? (
                <img src={ticket.qr_code_url} alt="QR Code" className="w-40 h-40 md:w-48 md:h-48" />
              ) : (
                <QRCodeSVG
                  value={qrData}
                  size={160}
                  level="H"
                  includeMargin={false}
                />
              )}
            </div>
            <p className="font-mono text-sm text-white/60">{qrData}</p>
            <p className="text-xs text-white/40 mt-1">Tap to enlarge for check-in</p>
          </div>
        </div>
      </div>

      {/* Full ticket image if available */}
      {ticket.full_ticket_url && (
        <div className="mt-6">
          <p className="text-sm text-white/50 mb-2 text-center">Original Ticket</p>
          <img
            src={ticket.full_ticket_url}
            alt="Full Ticket"
            className="w-full rounded-xl"
          />
        </div>
      )}

      {/* QR Modal */}
      {showQRModal && (
        <QRModal
          qrData={qrData}
          qrUrl={ticket.qr_code_url}
          onClose={() => setShowQRModal(false)}
        />
      )}
    </div>
  );
}

// QR Modal for enlarged view
function QRModal({ qrData, qrUrl, onClose }: { qrData: string; qrUrl?: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <div className="flex flex-col items-center">
          {qrUrl ? (
            <img src={qrUrl} alt="QR Code" className="w-64 h-64 md:w-80 md:h-80" />
          ) : (
            <QRCodeSVG
              value={qrData}
              size={280}
              level="H"
              includeMargin={false}
            />
          )}
          <p className="font-mono text-lg text-gray-800 mt-4 font-bold">{qrData}</p>
          <p className="text-sm text-gray-500 mt-2">Scan this code for check-in</p>
          <button
            onClick={onClose}
            className="mt-6 px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function CountdownToReveal({
  departureTime,
  fullReveal = false,
  className = '',
}: {
  departureTime: string;
  fullReveal?: boolean;
  className?: string;
}) {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const update = () => {
      const departure = new Date(departureTime);
      const revealTime = new Date(
        departure.getTime() - (fullReveal ? 1 : 3) * 60 * 60 * 1000
      );
      const diff = revealTime.getTime() - Date.now();

      if (diff <= 0) {
        setTimeLeft('Now!');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [departureTime, fullReveal]);

  return (
    <div className={`text-center ${className}`}>
      <p className="text-sm text-white/50 mb-1">
        {fullReveal ? 'Full reveal in:' : 'QR code available in:'}
      </p>
      <p className="text-2xl font-mono font-bold text-blue-400">{timeLeft}</p>
    </div>
  );
}
