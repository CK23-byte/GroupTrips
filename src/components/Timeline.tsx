import { useState, useEffect } from 'react';
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
  Eye,
  EyeOff,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { ScheduleItem } from '../types';

interface TimelineProps {
  schedule: ScheduleItem[];
  isAdmin: boolean;
  tripId: string;
}

// Check if activity should be revealed (1 hour before start time)
function isActivityRevealed(startTime: string): boolean {
  const activityTime = new Date(startTime).getTime();
  const now = Date.now();
  const oneHourBefore = activityTime - (60 * 60 * 1000);
  return now >= oneHourBefore;
}

// Get time until reveal
function getTimeUntilReveal(startTime: string): { hours: number; minutes: number } | null {
  const activityTime = new Date(startTime).getTime();
  const now = Date.now();
  const oneHourBefore = activityTime - (60 * 60 * 1000);
  const diff = oneHourBefore - now;

  if (diff <= 0) return null;

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return { hours, minutes };
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

  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false);

  if (schedule.length === 0) {
    return (
      <div className="card p-12 text-center">
        <Clock className="w-16 h-16 text-white/20 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Schedule Yet</h2>
        <p className="text-white/50 mb-6">
          {isAdmin
            ? 'Add activities to the timeline or get AI suggestions.'
            : 'The admin hasn\'t added a schedule yet.'}
        </p>
        {isAdmin && (
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary"
            >
              <Plus className="w-5 h-5 inline mr-2" />
              Add Activity
            </button>
            <button
              onClick={() => setShowSuggestionsModal(true)}
              className="btn-secondary flex items-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              Suggestions
            </button>
          </div>
        )}

        {showSuggestionsModal && (
          <AISuggestionsModal
            tripId={tripId}
            onClose={() => setShowSuggestionsModal(false)}
            onAdded={() => {
              setShowSuggestionsModal(false);
              window.location.reload();
            }}
          />
        )}

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

  return (
    <div>
      {isAdmin && (
        <div className="mb-6 flex justify-end gap-3">
          <button
            onClick={() => setShowSuggestionsModal(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            Suggestions
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Activity
          </button>
        </div>
      )}

      <div className="space-y-8">
        {Object.entries(groupedSchedule).map(([date, items]) => (
          <div key={date}>
            <h3 className="text-lg font-semibold mb-4 sticky top-20 bg-slate-900/80 backdrop-blur py-2">
              {new Date(date).toLocaleDateString('en-US', {
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

      {showSuggestionsModal && (
        <AISuggestionsModal
          tripId={tripId}
          onClose={() => setShowSuggestionsModal(false)}
          onAdded={() => {
            setShowSuggestionsModal(false);
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
  const [revealed, setRevealed] = useState(isActivityRevealed(item.start_time));
  const [timeUntilReveal, setTimeUntilReveal] = useState(getTimeUntilReveal(item.start_time));

  // Update reveal status every minute
  useEffect(() => {
    const timer = setInterval(() => {
      const isNowRevealed = isActivityRevealed(item.start_time);
      setRevealed(isNowRevealed);
      setTimeUntilReveal(getTimeUntilReveal(item.start_time));
    }, 60000);

    return () => clearInterval(timer);
  }, [item.start_time]);

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this activity?')) return;
    await supabase.from('schedule_items').delete().eq('id', item.id);
    window.location.reload();
  }

  // Admin always sees everything
  const showContent = isAdmin || revealed;

  return (
    <div className={`relative card p-4 ml-4 ${!showContent ? 'overflow-hidden' : ''}`}>
      {/* Timeline dot */}
      <div
        className={`absolute -left-[26px] top-4 w-4 h-4 rounded-full bg-gradient-to-br ${
          typeColors[item.type] || 'from-gray-500 to-gray-600'
        }`}
      />

      {/* Blur overlay for hidden activities */}
      {!showContent && (
        <div className="absolute inset-0 bg-slate-800/80 backdrop-blur-md z-10 flex flex-col items-center justify-center rounded-xl">
          <div className="text-center p-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-fuchsia-500 to-blue-500 flex items-center justify-center mx-auto mb-3 animate-pulse">
              <EyeOff className="w-6 h-6" />
            </div>
            <p className="font-semibold text-white mb-1">Surprise Activity!</p>
            <p className="text-sm text-white/60">
              Reveals in{' '}
              {timeUntilReveal && (
                <span className="text-fuchsia-400 font-medium">
                  {timeUntilReveal.hours > 0 && `${timeUntilReveal.hours}h `}
                  {timeUntilReveal.minutes}m
                </span>
              )}
            </p>
            <div className="flex items-center justify-center gap-1 mt-2 text-xs text-white/40">
              <Sparkles className="w-3 h-3" />
              <span>1 hour before start time</span>
            </div>
          </div>
        </div>
      )}

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
              {startTime.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
              {endTime &&
                ` - ${endTime.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}`}
            </span>
            {showContent && revealed && !isAdmin && (
              <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/20 px-2 py-0.5 rounded-full">
                <Eye className="w-3 h-3" />
                Revealed
              </span>
            )}
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

          {item.booking_url && (
            <a
              href={item.booking_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors mt-1"
            >
              <ExternalLink className="w-3 h-3" />
              <span>View booking</span>
            </a>
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
  const [bookingUrl, setBookingUrl] = useState('');
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
      booking_url: bookingUrl || null,
      type,
      start_time: new Date(startTime).toISOString(),
      end_time: endTime ? new Date(endTime).toISOString() : null,
    });

    onAdded();
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-white/10 rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-6">Add Activity</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Title
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
              className="input-field bg-slate-700 text-white"
            >
              <option value="travel" className="bg-slate-700 text-white">Travel</option>
              <option value="activity" className="bg-slate-700 text-white">Activity</option>
              <option value="meal" className="bg-slate-700 text-white">Meal</option>
              <option value="accommodation" className="bg-slate-700 text-white">Accommodation</option>
              <option value="free_time" className="bg-slate-700 text-white">Free Time</option>
              <option value="meeting" className="bg-slate-700 text-white">Meeting Point</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Description (optional)
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
              Location (optional)
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="input-field"
              placeholder="e.g., Amsterdam Central"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Booking URL (optional)
            </label>
            <input
              type="url"
              value={bookingUrl}
              onChange={(e) => setBookingUrl(e.target.value)}
              className="input-field"
              placeholder="https://booking-website.com/..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Start Time
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
                End Time (optional)
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
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1"
            >
              {loading ? 'Adding...' : 'Add Activity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface AIActivity {
  title: string;
  description: string;
  type: ScheduleItem['type'];
  duration_hours: number;
  estimated_cost: number;
  best_time: string;
}

function AISuggestionsModal({
  tripId,
  onClose,
  onAdded,
}: {
  tripId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [location, setLocation] = useState('');
  const [groupSize, setGroupSize] = useState('');
  const [date, setDate] = useState('');
  const [preferences, setPreferences] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<AIActivity[]>([]);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState<number | null>(null);

  async function handleGetSuggestions(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuggestions([]);

    try {
      const response = await fetch('/api/suggest-activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location, groupSize, date, preferences }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else if (data.activities) {
        setSuggestions(data.activities);
      } else if (data.raw) {
        setError('Could not parse AI response. Try again.');
      }
    } catch {
      setError('Failed to get suggestions. Please try again.');
    }

    setLoading(false);
  }

  async function handleAddActivity(activity: AIActivity, index: number) {
    setAdding(index);

    // Calculate start time based on best_time
    const activityDate = date ? new Date(date) : new Date();
    const timeMap: Record<string, number> = {
      morning: 9,
      afternoon: 14,
      evening: 18,
      night: 21,
    };
    activityDate.setHours(timeMap[activity.best_time] || 10, 0, 0, 0);

    const endTime = new Date(activityDate);
    endTime.setHours(endTime.getHours() + activity.duration_hours);

    await supabase.from('schedule_items').insert({
      trip_id: tripId,
      title: activity.title,
      description: `${activity.description}\n\nEstimated cost: €${activity.estimated_cost} per person`,
      type: activity.type,
      start_time: activityDate.toISOString(),
      end_time: endTime.toISOString(),
    });

    // Remove from suggestions
    setSuggestions(suggestions.filter((_, i) => i !== index));
    setAdding(null);

    if (suggestions.length === 1) {
      onAdded();
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-white/10 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-fuchsia-500 to-blue-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Activity Suggestions</h2>
            <p className="text-sm text-white/50">Get personalized activity ideas for your trip</p>
          </div>
        </div>

        {suggestions.length === 0 ? (
          <form onSubmit={handleGetSuggestions} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Destination
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="input-field"
                placeholder="e.g., Barcelona, Spain"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Group Size
                </label>
                <input
                  type="number"
                  value={groupSize}
                  onChange={(e) => setGroupSize(e.target.value)}
                  className="input-field"
                  placeholder="e.g., 8"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Preferences (optional)
              </label>
              <textarea
                value={preferences}
                onChange={(e) => setPreferences(e.target.value)}
                className="input-field resize-none"
                rows={2}
                placeholder="e.g., adventurous, local cuisine, budget-friendly, nightlife..."
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Get Suggestions
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-white/60 mb-4">
              Click on an activity to add it to your schedule:
            </p>

            {suggestions.map((activity, index) => (
              <div
                key={index}
                className="p-4 bg-white/5 border border-white/10 rounded-xl hover:border-fuchsia-500/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`p-1.5 rounded-lg bg-gradient-to-br ${typeColors[activity.type] || 'from-gray-500 to-gray-600'}`}>
                        {typeIcons[activity.type] || <Clock className="w-4 h-4" />}
                      </span>
                      <h4 className="font-semibold">{activity.title}</h4>
                    </div>
                    <p className="text-sm text-white/60 mb-2">{activity.description}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-white/40">
                      <span>⏱️ {activity.duration_hours}h</span>
                      <span>💰 €{activity.estimated_cost}/person</span>
                      <span>🌅 Best: {activity.best_time}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddActivity(activity, index)}
                    disabled={adding !== null}
                    className="btn-primary text-sm py-2 px-4"
                  >
                    {adding === index ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}

            <div className="flex gap-3 pt-4">
              <button onClick={onClose} className="btn-secondary flex-1">
                Done
              </button>
              <button
                onClick={() => setSuggestions([])}
                className="btn-secondary flex-1"
              >
                Get New Suggestions
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
