import { useState } from 'react';
import {
  Users,
  Crown,
  MapPin,
  MoreVertical,
  UserMinus,
  Shield,
  Share2,
  Copy,
  Check,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { TripMember } from '../types';

interface MembersListProps {
  members: TripMember[];
  isAdmin: boolean;
  tripId: string;
  lobbyCode?: string;
}

export default function MembersList({
  members,
  isAdmin,
  tripId,
  lobbyCode,
}: MembersListProps) {
  const [showLocationMap, setShowLocationMap] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [copied, setCopied] = useState(false);

  const admins = members.filter((m) => m.role === 'admin');
  const regularMembers = members.filter((m) => m.role === 'member');

  async function copyInviteLink() {
    const link = `${window.location.origin}/join?code=${lobbyCode}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function copyCode() {
    if (lobbyCode) {
      await navigator.clipboard.writeText(lobbyCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h2 className="text-xl font-semibold">
          {members.length} Participants
        </h2>
        <div className="flex gap-2">
          {/* All members can invite others */}
          {lobbyCode && (
            <button
              onClick={() => setShowInvite(!showInvite)}
              className="btn-primary text-sm flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              Invite Members
            </button>
          )}
          <button
            onClick={() => setShowLocationMap(!showLocationMap)}
            className="btn-secondary text-sm flex items-center gap-2"
          >
            <MapPin className="w-4 h-4" />
            {showLocationMap ? 'List view' : 'Map view'}
          </button>
        </div>
      </div>

      {/* Invite Panel */}
      {showInvite && lobbyCode && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
          <h3 className="font-medium mb-2">Invite new members</h3>
          <p className="text-sm text-white/60 mb-4">
            Share the lobby code or invite link with friends to add them to this trip.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex items-center gap-2 bg-white/5 rounded-lg px-4 py-2">
              <span className="font-mono text-lg">{lobbyCode}</span>
              <button
                onClick={copyCode}
                className="ml-auto p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <button
              onClick={copyInviteLink}
              className="btn-secondary flex items-center justify-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Copy Invite Link
            </button>
          </div>
        </div>
      )}

      {showLocationMap ? (
        <LocationMap members={members} />
      ) : (
        <>
          {/* Admins */}
          {admins.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-white/50 mb-3 flex items-center gap-2">
                <Crown className="w-4 h-4 text-yellow-400" />
                Admins ({admins.length})
              </h3>
              <div className="space-y-2">
                {admins.map((member) => (
                  <MemberCard
                    key={member.id}
                    member={member}
                    isAdmin={isAdmin}
                    isCurrentUserAdmin
                    tripId={tripId}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Regular Members */}
          {regularMembers.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-white/50 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Members ({regularMembers.length})
              </h3>
              <div className="space-y-2">
                {regularMembers.map((member) => (
                  <MemberCard
                    key={member.id}
                    member={member}
                    isAdmin={isAdmin}
                    tripId={tripId}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MemberCard({
  member,
  isAdmin,
  isCurrentUserAdmin = false,
}: {
  member: TripMember;
  isAdmin: boolean;
  isCurrentUserAdmin?: boolean;
  tripId: string;
}) {
  const [showMenu, setShowMenu] = useState(false);

  async function handleRemove() {
    if (!confirm(`Are you sure you want to remove ${member.user?.name}?`)) return;
    await supabase.from('trip_members').delete().eq('id', member.id);
    window.location.reload();
  }

  async function handleMakeAdmin() {
    await supabase
      .from('trip_members')
      .update({ role: 'admin' })
      .eq('id', member.id);
    window.location.reload();
  }

  return (
    <div className="card p-4 flex items-center gap-4">
      {/* Avatar */}
      <div className="relative">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-fuchsia-500 flex items-center justify-center text-lg font-semibold">
          {member.user?.name?.charAt(0) || '?'}
        </div>
        {member.role === 'admin' && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
            <Crown className="w-3 h-3 text-yellow-900" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{member.user?.name}</p>
        <p className="text-sm text-white/50 truncate">{member.user?.email}</p>
      </div>

      {/* Joined date */}
      <div className="text-sm text-white/40 hidden sm:block">
        Member since{' '}
        {new Date(member.joined_at).toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'short',
        })}
      </div>

      {/* Actions (admin only) */}
      {isAdmin && !isCurrentUserAdmin && (
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-48 bg-slate-800 border border-white/10 rounded-xl p-2 z-20">
                <button
                  onClick={handleMakeAdmin}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Shield className="w-4 h-4" />
                  Make Admin
                </button>
                <button
                  onClick={handleRemove}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <UserMinus className="w-4 h-4" />
                  Remove
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function LocationMap({ members }: { members: TripMember[] }) {
  // Placeholder for actual map implementation
  // In production, you'd integrate with Google Maps, Mapbox, or Leaflet
  return (
    <div className="card p-8">
      <div className="aspect-video bg-white/5 rounded-xl flex flex-col items-center justify-center mb-4">
        <MapPin className="w-12 h-12 text-white/20 mb-2" />
        <p className="text-white/50 text-center">
          Interactive Map
          <br />
          <span className="text-sm">(Location sharing must be enabled)</span>
        </p>
      </div>

      <div className="space-y-2">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-fuchsia-500 flex items-center justify-center text-sm">
                {member.user?.name?.charAt(0) || '?'}
              </div>
              <span className="text-sm">{member.user?.name}</span>
            </div>
            <span className="text-xs text-white/40">Location unknown</span>
          </div>
        ))}
      </div>

      <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
        <p className="text-sm text-blue-200">
          Tip: Enable location sharing to see where everyone is. This helps
          with meeting up and ensures nobody gets lost.
        </p>
      </div>
    </div>
  );
}
