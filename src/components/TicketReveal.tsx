import { useState, useEffect } from 'react';
import { QrCode, Plane, MapPin, AlertCircle } from 'lucide-react';
import type { Ticket, TicketRevealStatus } from '../types';

interface TicketRevealProps {
  ticket: Ticket | null;
  revealStatus: TicketRevealStatus;
  departureTime: string;
}

export default function TicketReveal({
  ticket,
  revealStatus,
  departureTime,
}: TicketRevealProps) {
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    if (revealStatus !== 'hidden') {
      setShowAnimation(true);
    }
  }, [revealStatus]);

  if (!ticket) {
    return (
      <div className="card p-12 text-center">
        <AlertCircle className="w-16 h-16 text-white/20 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Ticket</h2>
        <p className="text-white/50">
          The admin hasn't uploaded your ticket yet.
          <br />
          Check back later or contact the trip admin.
        </p>
      </div>
    );
  }

  // Hidden state
  if (revealStatus === 'hidden') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card p-8 text-center">
          <div className="relative w-32 h-32 mx-auto mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-fuchsia-500/20 rounded-2xl animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <QrCode className="w-16 h-16 text-white/30" />
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-2">Ticket Hidden</h2>
          <p className="text-white/60 mb-6">
            Your ticket will be revealed as the departure time approaches.
          </p>

          <div className="bg-white/5 rounded-xl p-6 mb-6">
            <h3 className="text-sm font-medium text-white/70 mb-4">
              Reveal Schedule
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-white/50">3 hours before departure</span>
                <span className="text-blue-400">QR code visible</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50">1 hour before departure</span>
                <span className="text-green-400">Full ticket visible</span>
              </div>
            </div>
          </div>

          <CountdownToReveal departureTime={departureTime} />
        </div>
      </div>
    );
  }

  // QR Only state
  if (revealStatus === 'qr_only') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className={`card p-8 ${showAnimation ? 'ticket-reveal' : ''}`}>
          <div className="text-center mb-6">
            <span className="inline-block px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm font-medium">
              QR Code Revealed!
            </span>
          </div>

          {/* QR Code Display */}
          <div className="flex flex-col items-center mb-8">
            {ticket.qr_code_url ? (
              <div className="qr-glow rounded-2xl p-4 bg-white">
                <img
                  src={ticket.qr_code_url}
                  alt="Ticket QR Code"
                  className="w-48 h-48"
                />
              </div>
            ) : (
              <div className="w-48 h-48 bg-white/10 rounded-2xl flex items-center justify-center">
                <QrCode className="w-24 h-24 text-white/30" />
              </div>
            )}
            <p className="text-sm text-white/50 mt-4">
              Scan this code to check in
            </p>
          </div>

          {/* Partial Info */}
          <div className="bg-white/5 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Plane className="w-5 h-5 text-blue-400" />
              <span className="text-lg font-semibold">{ticket.type === 'flight' ? 'Flight' : ticket.type === 'train' ? 'Train' : 'Trip'}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-white/40 mb-1">Departure</p>
                <p className="font-medium">
                  {new Date(ticket.departure_time).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <div>
                <p className="text-white/40 mb-1">Reference</p>
                <p className="font-medium font-mono">
                  {ticket.booking_reference || '***'}
                </p>
              </div>
            </div>

            {/* Hidden destination */}
            <div className="mt-4 p-4 bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-xl">
              <div className="flex items-center gap-2 text-fuchsia-400">
                <MapPin className="w-4 h-4" />
                <span className="text-sm font-medium">Destination: ???</span>
              </div>
              <p className="text-xs text-white/50 mt-1">
                Will be revealed in 1 hour
              </p>
            </div>
          </div>

          <CountdownToReveal departureTime={departureTime} fullReveal />
        </div>
      </div>
    );
  }

  // Full reveal state
  return (
    <div className="max-w-2xl mx-auto">
      <div className={`card p-8 ${showAnimation ? 'ticket-reveal' : ''}`}>
        <div className="text-center mb-6">
          <span className="inline-block px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium">
            Full Ticket Revealed!
          </span>
        </div>

        {/* Full Ticket Display */}
        {ticket.full_ticket_url ? (
          <div className="mb-6">
            <img
              src={ticket.full_ticket_url}
              alt="Full Ticket"
              className="w-full rounded-xl"
            />
          </div>
        ) : null}

        {/* Ticket Details */}
        <div className="bg-white/5 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Plane className="w-6 h-6 text-blue-400" />
            <div>
              <p className="text-sm text-white/50">{ticket.carrier || 'Carrier'}</p>
              <p className="text-xl font-bold">
                {ticket.departure_location} → {ticket.arrival_location}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <DetailItem
              label="Departure"
              value={new Date(ticket.departure_time).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            />
            {ticket.arrival_time && (
              <DetailItem
                label="Arrival"
                value={new Date(ticket.arrival_time).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              />
            )}
            {ticket.gate && <DetailItem label="Gate" value={ticket.gate} />}
            {ticket.seat_number && (
              <DetailItem label="Seat" value={ticket.seat_number} />
            )}
          </div>

          {ticket.booking_reference && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-sm text-white/40 mb-1">Booking Reference</p>
              <p className="font-mono text-lg">{ticket.booking_reference}</p>
            </div>
          )}
        </div>

        {/* QR Code */}
        {ticket.qr_code_url && (
          <div className="mt-6 flex justify-center">
            <div className="qr-glow rounded-xl p-3 bg-white">
              <img
                src={ticket.qr_code_url}
                alt="Ticket QR Code"
                className="w-32 h-32"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-white/40 mb-1">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

function CountdownToReveal({
  departureTime,
  fullReveal = false,
}: {
  departureTime: string;
  fullReveal?: boolean;
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
    <div className="text-center">
      <p className="text-sm text-white/50 mb-1">
        {fullReveal ? 'Full reveal in:' : 'QR code available in:'}
      </p>
      <p className="text-2xl font-mono font-bold text-blue-400">{timeLeft}</p>
    </div>
  );
}
