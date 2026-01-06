import { useState } from 'react';
import {
  Clock,
  MapPin,
  Plus,
  Plane,
  Utensils,
  Hotel,
  Camera,
  Users,
  Coffee,
  Edit2,
  Trash2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { ScheduleItem } from '../types';

interface TimelineProps {
  schedule: ScheduleItem[];
  isAdmin: boolean;
  tripId: string;
}

const typeIcons: Record<string, React.ReactNode> = {
  travel: <Plane className="w-4 h-4" />,
  activity: <Camera className="w-4 h-4" />,
  meal: <Utensils className="w-4 h-4" />,
  accommodation: <Hotel className="w-4 h-4" />,
  free_time: <Coffee className="w-4 h-4" />,
  meeting: <Users className="w-4 h-4" />,
};

const typeColors: Record<string, string> = {
  travel: 'from-blue-500 to-blue-600',
  activity: 'from-fuchsia-500 to-fuchsia-600',
  meal: 'from-orange-500 to-orange-600',
  accommodation: 'from-purple-500 to-purple-600',
  free_time: 'from-green-500 to-green-600',
  meeting: 'from-yellow-500 to-yellow-600',
};

export default function Timeline({ schedule, isAdmin, tripId }: TimelineProps) {
  const [showAddModal, setShowAddModal] = useState(false);

  // Group schedule items by date
  const groupedSchedule = schedule.reduce((acc, item) => {
    const date = new Date(item.start_time).toDateString();
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(item);
    return acc;
  }, {} as Record<string, ScheduleItem[]>);

  if (schedule.length === 0) {
    return (
      <div className="card p-12 text-center">
        <Clock className="w-16 h-16 text-white/20 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Geen Planning</h2>
        <p className="text-white/50 mb-6">
          {isAdmin
            ? 'Voeg activiteiten toe aan de tijdlijn.'
            : 'De admin heeft nog geen planning toegevoegd.'}
        </p>
        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary"
          >
            <Plus className="w-5 h-5 inline mr-2" />
            Activiteit Toevoegen
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      {isAdmin && (
        <div className="mb-6 flex justify-end">
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Activiteit Toevoegen
          </button>
        </div>
      )}

      <div className="space-y-8">
        {Object.entries(groupedSchedule).map(([date, items]) => (
          <div key={date}>
            <h3 className="text-lg font-semibold mb-4 sticky top-20 bg-slate-900/80 backdrop-blur py-2">
              {new Date(date).toLocaleDateString('nl-NL', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </h3>

            <div className="relative pl-8">
              {/* Timeline line */}
              <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 via-fuchsia-500 to-purple-500" />

              <div className="space-y-4">
                {items.map((item, index) => (
                  <TimelineItem
                    key={item.id}
                    item={item}
                    isAdmin={isAdmin}
                    isFirst={index === 0}
                    isLast={index === items.length - 1}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <AddScheduleModal
          tripId={tripId}
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            setShowAddModal(false);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}

function TimelineItem({
  item,
  isAdmin,
}: {
  item: ScheduleItem;
  isAdmin: boolean;
  isFirst?: boolean;
  isLast?: boolean;
}) {
  const startTime = new Date(item.start_time);
  const endTime = item.end_time ? new Date(item.end_time) : null;

  async function handleDelete() {
    if (!confirm('Weet je zeker dat je dit item wilt verwijderen?')) return;
    await supabase.from('schedule_items').delete().eq('id', item.id);
    window.location.reload();
  }

  return (
    <div className="relative card p-4 ml-4">
      {/* Timeline dot */}
      <div
        className={`absolute -left-[26px] top-4 w-4 h-4 rounded-full bg-gradient-to-br ${
          typeColors[item.type] || 'from-gray-500 to-gray-600'
        }`}
      />

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`p-1.5 rounded-lg bg-gradient-to-br ${
                typeColors[item.type] || 'from-gray-500 to-gray-600'
              }`}
            >
              {typeIcons[item.type] || <Clock className="w-4 h-4" />}
            </span>
            <span className="text-sm text-white/50">
              {startTime.toLocaleTimeString('nl-NL', {
                hour: '2-digit',
                minute: '2-digit',
              })}
              {endTime &&
                ` - ${endTime.toLocaleTimeString('nl-NL', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}`}
            </span>
          </div>

          <h4 className="font-semibold mb-1">{item.title}</h4>

          {item.description && (
            <p className="text-sm text-white/60 mb-2">{item.description}</p>
          )}

          {item.location && (
            <div className="flex items-center gap-1 text-sm text-white/40">
              <MapPin className="w-3 h-3" />
              <span>{item.location}</span>
            </div>
          )}
        </div>

        {isAdmin && (
          <div className="flex gap-1">
            <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <Edit2 className="w-4 h-4 text-white/40" />
            </button>
            <button
              onClick={handleDelete}
              className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AddScheduleModal({
  tripId,
  onClose,
  onAdded,
}: {
  tripId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [type, setType] = useState<ScheduleItem['type']>('activity');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    await supabase.from('schedule_items').insert({
      trip_id: tripId,
      title,
      description: description || null,
      location: location || null,
      type,
      start_time: new Date(startTime).toISOString(),
      end_time: endTime ? new Date(endTime).toISOString() : null,
    });

    onAdded();
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-6">Activiteit Toevoegen</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Titel
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ScheduleItem['type'])}
              className="input-field"
            >
              <option value="travel">Reis</option>
              <option value="activity">Activiteit</option>
              <option value="meal">Maaltijd</option>
              <option value="accommodation">Accommodatie</option>
              <option value="free_time">Vrije tijd</option>
              <option value="meeting">Verzamelen</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Beschrijving (optioneel)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field resize-none"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Locatie (optioneel)
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Starttijd
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Eindtijd (optioneel)
              </label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="input-field"
              />
            </div>
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
              {loading ? 'Toevoegen...' : 'Toevoegen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
