import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, Edit2, Trash2, Clock, MapPin } from 'lucide-react';
import type { ScheduleItem } from '../types';

// Activity type colors
const typeColors: Record<string, { bg: string; border: string; text: string }> = {
  travel: { bg: 'bg-blue-500/30', border: 'border-blue-400', text: 'text-blue-200' },
  activity: { bg: 'bg-fuchsia-500/30', border: 'border-fuchsia-400', text: 'text-fuchsia-200' },
  meal: { bg: 'bg-orange-500/30', border: 'border-orange-400', text: 'text-orange-200' },
  accommodation: { bg: 'bg-purple-500/30', border: 'border-purple-400', text: 'text-purple-200' },
  free_time: { bg: 'bg-green-500/30', border: 'border-green-400', text: 'text-green-200' },
  meeting: { bg: 'bg-yellow-500/30', border: 'border-yellow-400', text: 'text-yellow-200' },
};

// Hours to display (6 AM to midnight)
const HOURS = Array.from({ length: 19 }, (_, i) => i + 6); // 6-24

interface OutlookScheduleProps {
  items: ScheduleItem[];
  tripStartDate: string;
  tripEndDate?: string;
  isAdmin: boolean;
  onAddActivity?: (date: string, hour?: number) => void;
  onEditActivity?: (item: ScheduleItem) => void;
  onDeleteActivity?: (item: ScheduleItem) => void;
}

export default function OutlookSchedule({
  items,
  tripStartDate,
  tripEndDate,
  isAdmin,
  onAddActivity,
  onEditActivity,
  onDeleteActivity,
}: OutlookScheduleProps) {
  // Calculate the date range for the trip
  const tripStart = new Date(tripStartDate);
  const tripEnd = tripEndDate ? new Date(tripEndDate) : tripStart;

  // Start viewing from trip start date
  const [viewStartDate, setViewStartDate] = useState(() => {
    const today = new Date();
    // If trip hasn't started, show from trip start
    if (tripStart > today) return tripStart;
    // If trip is ongoing, show from today
    if (tripEnd >= today) return today;
    // If trip is over, show from trip start
    return tripStart;
  });

  // Get 3 days to display
  const displayDates = useMemo(() => {
    const dates: Date[] = [];
    for (let i = 0; i < 3; i++) {
      const date = new Date(viewStartDate);
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [viewStartDate]);

  // Navigate functions
  const goToPrevious = () => {
    const newDate = new Date(viewStartDate);
    newDate.setDate(newDate.getDate() - 3);
    setViewStartDate(newDate);
  };

  const goToNext = () => {
    const newDate = new Date(viewStartDate);
    newDate.setDate(newDate.getDate() + 3);
    setViewStartDate(newDate);
  };

  const goToToday = () => {
    setViewStartDate(new Date());
  };

  // Group items by date
  const itemsByDate = useMemo(() => {
    const grouped: Record<string, ScheduleItem[]> = {};

    displayDates.forEach(date => {
      const dateStr = date.toISOString().split('T')[0];
      grouped[dateStr] = items.filter(item => {
        const itemDate = new Date(item.start_time).toISOString().split('T')[0];
        return itemDate === dateStr;
      }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    });

    return grouped;
  }, [items, displayDates]);

  // Format date header
  const formatDateHeader = (date: Date) => {
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    const dayName = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : date.toLocaleDateString('en-US', { weekday: 'short' });
    const dateNum = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' });

    return { dayName, dateNum, month, isToday };
  };

  // Calculate item position and height
  const getItemStyle = (item: ScheduleItem) => {
    const startTime = new Date(item.start_time);
    const startHour = startTime.getHours() + startTime.getMinutes() / 60;

    // Calculate duration
    let durationHours = 1; // Default 1 hour
    if (item.end_time) {
      const endTime = new Date(item.end_time);
      durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    }

    // Position from top (relative to 6 AM start)
    const topPercent = ((startHour - 6) / 18) * 100;
    const heightPercent = (durationHours / 18) * 100;

    return {
      top: `${Math.max(0, topPercent)}%`,
      height: `${Math.min(heightPercent, 100 - topPercent)}%`,
      minHeight: '48px',
    };
  };

  return (
    <div className="card overflow-hidden">
      {/* Header with navigation */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevious}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-sm bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
          >
            Today
          </button>
          <button
            onClick={goToNext}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="text-lg font-semibold">
          {displayDates[0].toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </div>

        {isAdmin && onAddActivity && (
          <button
            onClick={() => onAddActivity(displayDates[0].toISOString())}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Activity
          </button>
        )}
      </div>

      {/* Calendar grid */}
      <div className="flex">
        {/* Time labels column */}
        <div className="w-16 flex-shrink-0 border-r border-white/10">
          <div className="h-16 border-b border-white/10" /> {/* Header spacer */}
          {HOURS.map(hour => (
            <div
              key={hour}
              className="h-12 border-b border-white/5 px-2 flex items-start justify-end pt-0.5"
            >
              <span className="text-xs text-white/40">
                {hour === 24 ? '00:00' : `${hour.toString().padStart(2, '0')}:00`}
              </span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        {displayDates.map(date => {
          const dateStr = date.toISOString().split('T')[0];
          const dayItems = itemsByDate[dateStr] || [];
          const { dayName, dateNum, month, isToday } = formatDateHeader(date);

          return (
            <div key={dateStr} className="flex-1 min-w-0 border-r border-white/10 last:border-r-0">
              {/* Day header */}
              <div
                className={`h-16 border-b border-white/10 p-2 text-center ${
                  isToday ? 'bg-blue-500/10' : ''
                }`}
              >
                <p className={`text-sm ${isToday ? 'text-blue-400 font-medium' : 'text-white/60'}`}>
                  {dayName}
                </p>
                <p className={`text-2xl font-bold ${isToday ? 'text-blue-400' : ''}`}>
                  {dateNum}
                </p>
                <p className="text-xs text-white/40">{month}</p>
              </div>

              {/* Time slots */}
              <div className="relative" style={{ height: `${HOURS.length * 48}px` }}>
                {/* Hour grid lines */}
                {HOURS.map((_, index) => (
                  <div
                    key={index}
                    className="absolute w-full border-b border-white/5"
                    style={{ top: `${(index + 1) * 48}px` }}
                  />
                ))}

                {/* Activity items */}
                {dayItems.map(item => {
                  const style = getItemStyle(item);
                  const colors = typeColors[item.type] || typeColors.activity;

                  return (
                    <div
                      key={item.id}
                      className={`absolute left-1 right-1 rounded-lg p-2 overflow-hidden cursor-pointer
                        ${colors.bg} border-l-4 ${colors.border}
                        hover:brightness-110 transition-all group`}
                      style={style}
                      onClick={() => isAdmin && onEditActivity?.(item)}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0 flex-1">
                          <p className={`font-medium text-sm truncate ${colors.text}`}>
                            {item.title}
                          </p>
                          <p className="text-xs text-white/50 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(item.start_time).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            {item.end_time && (
                              <>
                                {' - '}
                                {new Date(item.end_time).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </>
                            )}
                          </p>
                          {item.location && (
                            <p className="text-xs text-white/40 truncate flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3" />
                              {item.location}
                            </p>
                          )}
                        </div>

                        {/* Admin actions */}
                        {isAdmin && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditActivity?.(item);
                              }}
                              className="p-1 hover:bg-white/20 rounded"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteActivity?.(item);
                              }}
                              className="p-1 hover:bg-red-500/50 rounded text-red-400"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Click to add (admin only) */}
                {isAdmin && onAddActivity && (
                  <div
                    className="absolute inset-0 cursor-pointer"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const y = e.clientY - rect.top;
                      const hour = Math.floor(y / 48) + 6;
                      onAddActivity(dateStr, hour);
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="p-3 border-t border-white/10 flex flex-wrap gap-3 justify-center">
        {Object.entries(typeColors).map(([type, colors]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded ${colors.bg} border ${colors.border}`} />
            <span className="text-xs text-white/60 capitalize">{type.replace('_', ' ')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
