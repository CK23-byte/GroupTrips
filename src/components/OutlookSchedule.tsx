import { useState, useMemo, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit2,
  Trash2,
  Clock,
  MapPin,
  Sparkles,
  X,
  Calendar,
  Info,
  Phone,
  Euro,
  Copy,
  Check,
  Navigation,
  Save,
  ExternalLink,
  Plane,
  Utensils,
  Hotel,
  Camera,
  Users,
  Coffee,
  FileText,
  Loader2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { ScheduleItem, Trip } from '../types';

// Activity type colors
const typeColors: Record<string, { bg: string; border: string; text: string }> = {
  travel: { bg: 'bg-blue-500/30', border: 'border-blue-400', text: 'text-blue-200' },
  activity: { bg: 'bg-fuchsia-500/30', border: 'border-fuchsia-400', text: 'text-fuchsia-200' },
  meal: { bg: 'bg-orange-500/30', border: 'border-orange-400', text: 'text-orange-200' },
  accommodation: { bg: 'bg-purple-500/30', border: 'border-purple-400', text: 'text-purple-200' },
  free_time: { bg: 'bg-green-500/30', border: 'border-green-400', text: 'text-green-200' },
  meeting: { bg: 'bg-yellow-500/30', border: 'border-yellow-400', text: 'text-yellow-200' },
};

const typeColorsGradient: Record<string, string> = {
  travel: 'from-blue-500 to-blue-600',
  activity: 'from-fuchsia-500 to-fuchsia-600',
  meal: 'from-orange-500 to-orange-600',
  accommodation: 'from-purple-500 to-purple-600',
  free_time: 'from-green-500 to-green-600',
  meeting: 'from-yellow-500 to-yellow-600',
};

const typeIcons: Record<string, React.ReactNode> = {
  travel: <Plane className="w-4 h-4" />,
  activity: <Camera className="w-4 h-4" />,
  meal: <Utensils className="w-4 h-4" />,
  accommodation: <Hotel className="w-4 h-4" />,
  free_time: <Coffee className="w-4 h-4" />,
  meeting: <Users className="w-4 h-4" />,
};

// Hours to display (full 24 hours: 0-23 + 24 for midnight display)
const HOURS = Array.from({ length: 25 }, (_, i) => i); // 0-24

interface OutlookScheduleProps {
  items: ScheduleItem[];
  tripStartDate: string;
  tripEndDate?: string;
  isAdmin: boolean;
  tripId: string;
  trip?: Trip | null;
  memberCount?: number;
  onRefresh?: () => void;
}

export default function OutlookSchedule({
  items,
  tripStartDate,
  tripEndDate,
  isAdmin,
  tripId,
  trip,
  memberCount,
  onRefresh,
}: OutlookScheduleProps) {
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalDate, setAddModalDate] = useState<string>('');
  const [addModalHour, setAddModalHour] = useState<number | undefined>();
  const [selectedActivity, setSelectedActivity] = useState<ScheduleItem | null>(null);
  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Ref for scroll container
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Responsive: show fewer days on mobile
  const [isMobile, setIsMobile] = useState(false);
  // View mode: 1, 3, or 7 days
  const [viewMode, setViewMode] = useState<1 | 3 | 7>(3);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 640;
      setIsMobile(mobile);
      // On mobile, force 1-day view
      if (mobile && viewMode !== 1) {
        setViewMode(1);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [viewMode]);

  // Scroll to 6am on mount
  useEffect(() => {
    if (scrollContainerRef.current) {
      // Each hour is 48px, scroll to 6am (6 * 48 = 288px)
      scrollContainerRef.current.scrollTop = 6 * 48;
    }
  }, []);

  const daysToShow = isMobile ? 1 : viewMode;

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

  // Get days to display (responsive)
  const displayDates = useMemo(() => {
    const dates: Date[] = [];
    for (let i = 0; i < daysToShow; i++) {
      const date = new Date(viewStartDate);
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [viewStartDate, daysToShow]);

  // Navigate functions
  const goToPrevious = () => {
    const newDate = new Date(viewStartDate);
    newDate.setDate(newDate.getDate() - daysToShow);
    setViewStartDate(newDate);
  };

  const goToNext = () => {
    const newDate = new Date(viewStartDate);
    newDate.setDate(newDate.getDate() + daysToShow);
    setViewStartDate(newDate);
  };

  const goToToday = () => {
    setViewStartDate(new Date());
  };

  // Separate accommodations from regular items
  const { accommodations, regularItems } = useMemo(() => {
    const acc: ScheduleItem[] = [];
    const reg: ScheduleItem[] = [];

    items.forEach(item => {
      if (item.type === 'accommodation') {
        acc.push(item);
      } else {
        reg.push(item);
      }
    });

    return { accommodations: acc, regularItems: reg };
  }, [items]);

  // Group regular items by date (excluding accommodations)
  const itemsByDate = useMemo(() => {
    const grouped: Record<string, ScheduleItem[]> = {};

    displayDates.forEach(date => {
      const dateStr = date.toISOString().split('T')[0];
      grouped[dateStr] = regularItems.filter(item => {
        const itemDate = new Date(item.start_time).toISOString().split('T')[0];
        return itemDate === dateStr;
      }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    });

    return grouped;
  }, [regularItems, displayDates]);

  // Get accommodations that overlap with displayed dates
  const visibleAccommodations = useMemo(() => {
    const startRange = displayDates[0];
    const endRange = displayDates[displayDates.length - 1];
    endRange.setHours(23, 59, 59);

    return accommodations.filter(acc => {
      const accStart = new Date(acc.start_time);
      const accEnd = acc.end_time ? new Date(acc.end_time) : accStart;

      // Check if accommodation overlaps with visible range
      return accStart <= endRange && accEnd >= startRange;
    });
  }, [accommodations, displayDates]);

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

    // Position from top (relative to 0 AM start, 24 hours total)
    const topPercent = (startHour / 24) * 100;
    const heightPercent = (durationHours / 24) * 100;

    return {
      top: `${Math.max(0, topPercent)}%`,
      height: `${Math.min(heightPercent, 100 - topPercent)}%`,
      minHeight: '48px',
    };
  };

  // Handle add activity click from calendar
  const handleCalendarClick = (dateStr: string, hour: number) => {
    setAddModalDate(dateStr);
    setAddModalHour(hour);
    setShowAddModal(true);
  };

  // Helper to refresh data
  const refreshData = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      window.location.reload();
    }
  };

  // Handle delete
  const handleDelete = async (item: ScheduleItem) => {
    if (!confirm('Are you sure you want to delete this activity?')) return;
    await supabase.from('schedule_items').delete().eq('id', item.id);
    refreshData();
  };

  return (
    <div className="card overflow-hidden">
      {/* Header with navigation */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between flex-wrap gap-3">
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

          {/* View mode toggle - hidden on mobile */}
          {!isMobile && (
            <div className="ml-2 flex items-center bg-white/5 rounded-lg p-0.5">
              {([3, 7] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    viewMode === mode
                      ? 'bg-blue-500/30 text-blue-400'
                      : 'text-white/50 hover:text-white/70'
                  }`}
                >
                  {mode}d
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="text-lg font-semibold">
          {displayDates[0].toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors text-sm"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">AI Import</span>
            </button>
            <button
              onClick={() => setShowSuggestionsModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-fuchsia-500/20 text-fuchsia-400 rounded-lg hover:bg-fuchsia-500/30 transition-colors text-sm"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Suggestions</span>
            </button>
            <button
              onClick={() => {
                setAddModalDate(displayDates[0].toISOString().split('T')[0]);
                setAddModalHour(undefined);
                setShowAddModal(true);
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add</span>
            </button>
          </div>
        )}
      </div>

      {/* Accommodation bar - like Outlook all-day events */}
      {visibleAccommodations.length > 0 && (
        <div className="border-b border-white/10 bg-purple-500/5">
          <div className="flex">
            {/* Label column */}
            <div className="w-16 flex-shrink-0 border-r border-white/10 p-2 flex items-center justify-center">
              <Hotel className="w-4 h-4 text-purple-400" />
            </div>

            {/* Accommodation spans across days */}
            <div className="flex-1 relative min-h-[60px] py-2 px-1">
              {visibleAccommodations.map(acc => {
                const accStart = new Date(acc.start_time);
                const accEnd = acc.end_time ? new Date(acc.end_time) : accStart;
                const rangeStart = new Date(displayDates[0]);
                rangeStart.setHours(0, 0, 0, 0);
                const rangeEnd = new Date(displayDates[displayDates.length - 1]);
                rangeEnd.setHours(23, 59, 59, 999);

                // Calculate position as percentage of visible range
                const totalDays = daysToShow;
                const startDay = Math.max(0, Math.floor((accStart.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)));
                const endDay = Math.min(totalDays, Math.ceil((accEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)));
                const leftPercent = (startDay / totalDays) * 100;
                const widthPercent = ((endDay - startDay) / totalDays) * 100;

                return (
                  <div
                    key={acc.id}
                    className="absolute top-2 bottom-2 bg-purple-500/30 border border-purple-400 rounded-lg px-3 py-1 cursor-pointer hover:bg-purple-500/40 transition-colors flex items-center gap-2 overflow-hidden"
                    style={{
                      left: `${leftPercent}%`,
                      width: `${Math.max(widthPercent, 100 / totalDays)}%`,
                    }}
                    onClick={() => setSelectedActivity(acc)}
                  >
                    <Hotel className="w-4 h-4 text-purple-300 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-purple-200 truncate">{acc.title}</p>
                      <p className="text-xs text-white/50 truncate">
                        {accStart.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                        {acc.end_time && ` - ${accEnd.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Calendar grid - scrollable container */}
      <div ref={scrollContainerRef} className="overflow-x-auto overflow-y-auto max-h-[600px] relative">
        {/* Sticky header row */}
        <div className="flex sticky top-0 z-20 bg-slate-900">
          {/* Time labels column header */}
          <div className="w-16 flex-shrink-0 border-r border-white/10 h-16 border-b border-white/10 bg-slate-900" />

          {/* Day column headers */}
          {displayDates.map(date => {
            const dateStr = date.toISOString().split('T')[0];
            const { dayName, dateNum, month, isToday } = formatDateHeader(date);

            return (
              <div
                key={`header-${dateStr}`}
                className={`flex-1 border-r border-white/10 last:border-r-0 ${viewMode === 7 ? 'min-w-[100px]' : 'min-w-[150px]'} h-16 border-b border-white/10 p-2 text-center bg-slate-900 ${
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
            );
          })}
        </div>

        {/* Scrollable content */}
        <div className="flex">
          {/* Time labels column */}
          <div className="w-16 flex-shrink-0 border-r border-white/10" style={{ minHeight: `${HOURS.length * 48}px` }}>
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
            const { isToday } = formatDateHeader(date);

            return (
              <div key={dateStr} className={`flex-1 border-r border-white/10 last:border-r-0 ${viewMode === 7 ? 'min-w-[100px]' : 'min-w-[150px]'} ${isToday ? 'bg-blue-500/5' : ''}`} style={{ minHeight: `${HOURS.length * 48}px` }}>
                {/* Time slots - covers full 24 hours */}
                <div className="relative" style={{ height: `${HOURS.length * 48}px` }}>
                {/* Hour grid lines */}
                {HOURS.map((_, index) => (
                  <div
                    key={index}
                    className="absolute w-full border-b border-white/5"
                    style={{ top: `${(index + 1) * 48}px` }}
                  />
                ))}

                {/* Click to add (admin only) - background layer */}
                {isAdmin && (
                  <div
                    className="absolute inset-0 cursor-pointer hover:bg-white/5 transition-colors"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const y = e.clientY - rect.top;
                      const hour = Math.floor(y / 48); // Now starts from 0
                      handleCalendarClick(dateStr, hour);
                    }}
                  />
                )}

                {/* Activity items - positioned above click area */}
                {dayItems.map(item => {
                  const style = getItemStyle(item);
                  const colors = typeColors[item.type] || typeColors.activity;

                  return (
                    <div
                      key={item.id}
                      className={`absolute left-1 right-1 rounded-lg p-2 overflow-hidden cursor-pointer z-10
                        ${colors.bg} border-l-4 ${colors.border}
                        hover:brightness-110 transition-all group`}
                      style={style}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedActivity(item);
                      }}
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
                                setSelectedActivity(item);
                              }}
                              className="p-1 hover:bg-white/20 rounded"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(item);
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
              </div>
            </div>
          );
        })}
        </div>
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

      {/* Add Modal */}
      {showAddModal && (
        <AddScheduleModal
          tripId={tripId}
          defaultDate={addModalDate}
          defaultHour={addModalHour}
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            setShowAddModal(false);
            refreshData();
          }}
        />
      )}

      {/* Activity Detail/Edit Modal */}
      {selectedActivity && (
        <ActivityDetailModal
          activity={selectedActivity}
          isAdmin={isAdmin}
          onClose={() => setSelectedActivity(null)}
          onSaved={refreshData}
        />
      )}

      {/* AI Suggestions Modal */}
      {showSuggestionsModal && (
        <AISuggestionsModal
          tripId={tripId}
          trip={trip}
          memberCount={memberCount}
          onClose={() => {
            setShowSuggestionsModal(false);
            refreshData();
          }}
          onRefreshCalendar={refreshData}
        />
      )}

      {/* AI Import Modal */}
      {showImportModal && (
        <AIImportModal
          tripId={tripId}
          tripStartDate={tripStartDate}
          tripEndDate={tripEndDate}
          onClose={() => {
            setShowImportModal(false);
            refreshData();
          }}
          onRefreshCalendar={refreshData}
        />
      )}
    </div>
  );
}

// Add Schedule Modal
function AddScheduleModal({
  tripId,
  defaultDate,
  defaultHour,
  onClose,
  onAdded,
}: {
  tripId: string;
  defaultDate?: string;
  defaultHour?: number;
  onClose: () => void;
  onAdded: () => void;
}) {
  // Calculate default datetime
  const getDefaultDateTime = () => {
    if (defaultDate && defaultHour !== undefined) {
      return `${defaultDate}T${defaultHour.toString().padStart(2, '0')}:00`;
    }
    if (defaultDate) {
      return `${defaultDate}T10:00`;
    }
    return '';
  };

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [locationUrl, setLocationUrl] = useState('');
  const [bookingUrl, setBookingUrl] = useState('');
  const [reservationCode, setReservationCode] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [type, setType] = useState<ScheduleItem['type']>('activity');
  const [startTime, setStartTime] = useState(getDefaultDateTime());
  const [endTime, setEndTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    // Validate start_time
    if (!startTime) {
      alert('Please select a start time');
      setLoading(false);
      return;
    }

    // Only include basic columns that are guaranteed to exist
    // Additional columns like booking_url, location_url etc. may not exist in all deployments
    const insertData: Record<string, unknown> = {
      trip_id: tripId,
      title,
      description: description || null,
      location: location || null,
      type,
      start_time: new Date(startTime).toISOString(),
      end_time: endTime ? new Date(endTime).toISOString() : null,
    };

    // Try to add optional columns - they may or may not exist in the database
    // These will be silently ignored if they don't exist
    if (locationUrl) insertData.location_url = locationUrl;
    if (bookingUrl) insertData.booking_url = bookingUrl;
    if (reservationCode) insertData.reservation_code = reservationCode;
    if (contactInfo) insertData.contact_info = contactInfo;
    if (estimatedCost) insertData.estimated_cost = parseFloat(estimatedCost);

    console.log('[AddScheduleModal] Inserting:', insertData);

    const { error } = await supabase.from('schedule_items').insert(insertData);

    if (error) {
      console.error('[AddScheduleModal] Insert error:', error);

      // If error is about missing column, try with minimal data
      if (error.message.includes('column') && error.message.includes('schema cache')) {
        console.log('[AddScheduleModal] Retrying with minimal columns...');
        const minimalData = {
          trip_id: tripId,
          title,
          description: description || null,
          location: location || null,
          type,
          start_time: new Date(startTime).toISOString(),
          end_time: endTime ? new Date(endTime).toISOString() : null,
        };

        const { error: retryError } = await supabase.from('schedule_items').insert(minimalData);

        if (retryError) {
          alert(`Failed to add activity: ${retryError.message}`);
          setLoading(false);
          return;
        }

        console.log('[AddScheduleModal] Insert successful with minimal data');
        onAdded();
        return;
      }

      alert(`Failed to add activity: ${error.message}`);
      setLoading(false);
      return;
    }

    console.log('[AddScheduleModal] Insert successful');
    onAdded();
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-800 border border-white/10 rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
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
              Estimated Cost € (optional)
            </label>
            <input
              type="number"
              value={estimatedCost}
              onChange={(e) => setEstimatedCost(e.target.value)}
              className="input-field"
              placeholder="e.g., 25"
              min="0"
              step="0.01"
            />
          </div>

          {/* Advanced options toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
          >
            {showAdvanced ? '- Hide' : '+ Show'} advanced options
          </button>

          {showAdvanced && (
            <div className="space-y-4 p-4 bg-white/5 rounded-xl border border-white/10">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Location URL (Google Maps)
                </label>
                <input
                  type="url"
                  value={locationUrl}
                  onChange={(e) => setLocationUrl(e.target.value)}
                  className="input-field"
                  placeholder="https://goo.gl/maps/..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Booking URL
                </label>
                <input
                  type="url"
                  value={bookingUrl}
                  onChange={(e) => setBookingUrl(e.target.value)}
                  className="input-field"
                  placeholder="https://booking-website.com/..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Reservation Code
                </label>
                <input
                  type="text"
                  value={reservationCode}
                  onChange={(e) => setReservationCode(e.target.value)}
                  className="input-field"
                  placeholder="e.g., ABC123"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Contact Info
                </label>
                <input
                  type="text"
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  className="input-field"
                  placeholder="e.g., +31 20 123 4567"
                />
              </div>
            </div>
          )}

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

// Activity Detail Modal with Edit functionality
function ActivityDetailModal({
  activity,
  isAdmin,
  onClose,
  onSaved,
}: {
  activity: ScheduleItem;
  isAdmin?: boolean;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Edit form state
  const [title, setTitle] = useState(activity.title);
  const [description, setDescription] = useState(activity.description || '');
  const [location, setLocation] = useState(activity.location || '');
  const [locationUrl, setLocationUrl] = useState(activity.location_url || '');
  const [bookingUrl, setBookingUrl] = useState(activity.booking_url || '');
  const [reservationCode, setReservationCode] = useState(activity.reservation_code || '');
  const [contactInfo, setContactInfo] = useState(activity.contact_info || '');
  const [estimatedCost, setEstimatedCost] = useState(activity.estimated_cost?.toString() || '');
  const [type, setType] = useState<ScheduleItem['type']>(activity.type);
  const [startTime, setStartTime] = useState(
    new Date(activity.start_time).toISOString().slice(0, 16)
  );
  const [endTime, setEndTime] = useState(
    activity.end_time ? new Date(activity.end_time).toISOString().slice(0, 16) : ''
  );

  const displayStartTime = new Date(activity.start_time);
  const displayEndTime = activity.end_time ? new Date(activity.end_time) : null;

  async function handleSave() {
    setSaving(true);

    const { error } = await supabase.from('schedule_items').update({
      title,
      description: description || null,
      location: location || null,
      location_url: locationUrl || null,
      booking_url: bookingUrl || null,
      reservation_code: reservationCode || null,
      contact_info: contactInfo || null,
      estimated_cost: estimatedCost ? parseFloat(estimatedCost) : null,
      type,
      start_time: new Date(startTime).toISOString(),
      end_time: endTime ? new Date(endTime).toISOString() : null,
    }).eq('id', activity.id);

    setSaving(false);

    if (error) {
      alert('Failed to save: ' + error.message);
      return;
    }

    onClose();
    if (onSaved) {
      onSaved();
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Generate Google Maps URL from location
  function getGoogleMapsUrl(loc: string): string {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc)}`;
  }

  if (isEditing && isAdmin) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-slate-800 border border-white/10 rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Edit Activity</h2>
            <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-white/10 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ScheduleItem['type'])}
                className="input-field bg-slate-700 text-white"
              >
                <option value="travel" className="bg-slate-700">Travel</option>
                <option value="activity" className="bg-slate-700">Activity</option>
                <option value="meal" className="bg-slate-700">Meal</option>
                <option value="accommodation" className="bg-slate-700">Accommodation</option>
                <option value="free_time" className="bg-slate-700">Free Time</option>
                <option value="meeting" className="bg-slate-700">Meeting Point</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input-field resize-none"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Start Time</label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">End Time</label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="input-field"
                placeholder="e.g., Amsterdam Central"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Location URL (Google Maps)</label>
              <input
                type="url"
                value={locationUrl}
                onChange={(e) => setLocationUrl(e.target.value)}
                className="input-field"
                placeholder="https://goo.gl/maps/..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Booking URL</label>
              <input
                type="url"
                value={bookingUrl}
                onChange={(e) => setBookingUrl(e.target.value)}
                className="input-field"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Reservation Code</label>
              <input
                type="text"
                value={reservationCode}
                onChange={(e) => setReservationCode(e.target.value)}
                className="input-field"
                placeholder="e.g., ABC123"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Contact Info</label>
              <input
                type="text"
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                className="input-field"
                placeholder="e.g., +31 20 123 4567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Estimated Cost (€)</label>
              <input
                type="number"
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(e.target.value)}
                className="input-field"
                placeholder="e.g., 25"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={() => setIsEditing(false)} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-800 border border-white/10 rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className={`p-2 rounded-xl bg-gradient-to-br ${typeColorsGradient[activity.type] || 'from-gray-500 to-gray-600'}`}>
              {typeIcons[activity.type] || <Clock className="w-5 h-5" />}
            </span>
            <div>
              <h2 className="text-xl font-bold">{activity.title}</h2>
              <p className="text-sm text-white/50 capitalize">{activity.type.replace('_', ' ')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 hover:bg-white/10 rounded-full text-blue-400"
                title="Edit activity"
              >
                <Edit2 className="w-5 h-5" />
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {/* Time */}
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
            <Calendar className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-sm text-white/50">Date & Time</p>
              <p className="font-medium">
                {displayStartTime.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              <p className="text-sm">
                {displayStartTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                {displayEndTime && ` - ${displayEndTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`}
              </p>
            </div>
          </div>

          {/* Location */}
          {activity.location && (
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
              <MapPin className="w-5 h-5 text-green-400" />
              <div className="flex-1">
                <p className="text-sm text-white/50">Location</p>
                <p className="font-medium">{activity.location}</p>
              </div>
              <a
                href={activity.location_url || getGoogleMapsUrl(activity.location)}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-green-500/20 hover:bg-green-500/30 rounded-lg transition-colors"
                title="Open in Maps"
              >
                <Navigation className="w-4 h-4 text-green-400" />
              </a>
            </div>
          )}

          {/* Estimated Cost */}
          {activity.estimated_cost && (
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
              <Euro className="w-5 h-5 text-yellow-400" />
              <div>
                <p className="text-sm text-white/50">Estimated Cost</p>
                <p className="font-medium">€{activity.estimated_cost.toFixed(2)}</p>
              </div>
            </div>
          )}

          {/* Reservation Code */}
          {activity.reservation_code && (
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
              <Copy className="w-5 h-5 text-fuchsia-400" />
              <div className="flex-1">
                <p className="text-sm text-white/50">Reservation Code</p>
                <p className="font-medium font-mono">{activity.reservation_code}</p>
              </div>
              <button
                onClick={() => copyToClipboard(activity.reservation_code!)}
                className="p-2 bg-fuchsia-500/20 hover:bg-fuchsia-500/30 rounded-lg transition-colors"
                title="Copy to clipboard"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-fuchsia-400" />
                )}
              </button>
            </div>
          )}

          {/* Contact Info */}
          {activity.contact_info && (
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
              <Phone className="w-5 h-5 text-blue-400" />
              <div className="flex-1">
                <p className="text-sm text-white/50">Contact</p>
                <p className="font-medium">{activity.contact_info}</p>
              </div>
              <a
                href={`tel:${activity.contact_info.replace(/\s/g, '')}`}
                className="p-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg transition-colors"
                title="Call"
              >
                <Phone className="w-4 h-4 text-blue-400" />
              </a>
            </div>
          )}

          {/* Description */}
          {activity.description && (
            <div className="p-3 bg-white/5 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-fuchsia-400" />
                <p className="text-sm text-white/50">Description</p>
              </div>
              <p className="text-white/80 whitespace-pre-wrap">{activity.description}</p>
            </div>
          )}

          {/* Booking URL */}
          {activity.booking_url && (
            <a
              href={activity.booking_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full p-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 rounded-xl text-blue-400 font-medium transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              View Booking / More Info
            </a>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 btn-secondary"
        >
          Close
        </button>
      </div>
    </div>
  );
}

// AI Suggestions Modal
interface AIActivity {
  title: string;
  description: string;
  type: ScheduleItem['type'];
  duration_hours: number;
  estimated_cost: number;
  best_time: string;
  booking_url?: string;
  location?: string;
  address?: string;
  rating?: number;
  tips?: string;
}

function AISuggestionsModal({
  tripId,
  trip,
  memberCount,
  onClose,
  onRefreshCalendar,
}: {
  tripId: string;
  trip?: Trip | null;
  memberCount?: number;
  onClose: () => void;
  onRefreshCalendar?: () => void;
}) {
  // Pre-fill with trip data
  const [location, setLocation] = useState(trip?.destination || '');
  const [groupSize, setGroupSize] = useState(memberCount?.toString() || '');
  const [date, setDate] = useState(trip?.departure_time ? new Date(trip.departure_time).toISOString().split('T')[0] : '');
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

  // Generate a search URL for TripAdvisor/Google if no booking_url provided
  function getSearchUrl(activityTitle: string, activityLocation: string): string {
    const searchQuery = encodeURIComponent(`${activityTitle} ${activityLocation}`);
    // Use TripAdvisor search as primary, fallback to Google
    return `https://www.tripadvisor.com/Search?q=${searchQuery}`;
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

    // Use provided booking_url or generate a search URL
    const bookingUrl = activity.booking_url || getSearchUrl(activity.title, activity.location || location);

    // Build description with tips if available
    let fullDescription = activity.description;
    if (activity.tips) {
      fullDescription += `\n\nTip: ${activity.tips}`;
    }
    if (activity.rating) {
      fullDescription += `\n\nRating: ${activity.rating}/5`;
    }

    await supabase.from('schedule_items').insert({
      trip_id: tripId,
      title: activity.title,
      description: fullDescription,
      type: activity.type,
      location: activity.address || activity.location || location,
      booking_url: bookingUrl,
      estimated_cost: activity.estimated_cost,
      start_time: activityDate.toISOString(),
      end_time: endTime.toISOString(),
    });

    // Remove from suggestions
    setSuggestions(suggestions.filter((_, i) => i !== index));
    setAdding(null);

    // Refresh the calendar immediately after adding (without closing modal)
    if (onRefreshCalendar) {
      onRefreshCalendar();
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-800 border border-white/10 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
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

            {suggestions.map((activity, index) => {
              // Generate fallback search URL
              const viewUrl = activity.booking_url || `https://www.tripadvisor.com/Search?q=${encodeURIComponent(`${activity.title} ${activity.location || location}`)}`;

              return (
                <div
                  key={index}
                  className="p-4 bg-white/5 border border-white/10 rounded-xl hover:border-fuchsia-500/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`p-1.5 rounded-lg bg-gradient-to-br ${typeColorsGradient[activity.type] || 'from-gray-500 to-gray-600'}`}>
                          {typeIcons[activity.type] || <Clock className="w-4 h-4" />}
                        </span>
                        <h4 className="font-semibold">{activity.title}</h4>
                        {activity.rating && (
                          <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">
                            ⭐ {activity.rating}/5
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-white/60 mb-2">{activity.description}</p>

                      {/* Location/Address */}
                      {(activity.address || activity.location) && (
                        <p className="text-xs text-white/50 mb-2 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {activity.address || activity.location}
                        </p>
                      )}

                      {/* Tip */}
                      {activity.tips && (
                        <p className="text-xs text-fuchsia-400/80 mb-2 italic">
                          💡 {activity.tips}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-xs text-white/40">
                        <span>⏱️ {activity.duration_hours}h</span>
                        <span>💰 €{activity.estimated_cost}/person</span>
                        <span>🌅 Best: {activity.best_time}</span>

                        {/* View Details link */}
                        <a
                          href={viewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3 h-3" />
                          View Details
                        </a>
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
              );
            })}

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

// AI Import Modal - Parse booking confirmations
interface ParsedItem {
  title: string;
  type: string;
  description?: string;
  location?: string;
  location_url?: string;
  start_time: string;
  end_time?: string;
  estimated_cost?: number;
  reservation_code?: string;
  contact_info?: string;
}

function AIImportModal({
  tripId,
  tripStartDate,
  tripEndDate,
  onClose,
  onRefreshCalendar,
}: {
  tripId: string;
  tripStartDate: string;
  tripEndDate?: string;
  onClose: () => void;
  onRefreshCalendar?: () => void;
}) {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState<number | null>(null);
  const [addedItems, setAddedItems] = useState<Set<number>>(new Set());

  async function handleParse() {
    if (!inputText.trim()) {
      setError('Please paste a booking confirmation or text');
      return;
    }

    setLoading(true);
    setError('');
    setParsedItems([]);

    try {
      const response = await fetch('/api/parse-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputText,
          tripStartDate,
          tripEndDate,
        }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else if (data.items && data.items.length > 0) {
        setParsedItems(data.items);
      } else if (data.raw) {
        setError('Could not process the text. Please try again.');
      } else {
        setError('No bookings found in the text.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    }

    setLoading(false);
  }

  async function handleAddItem(item: ParsedItem, index: number) {
    setAdding(index);
    setError('');

    // Map type to valid schedule item type
    const typeMap: Record<string, string> = {
      accommodation: 'accommodation',
      travel: 'travel',
      activity: 'activity',
      meal: 'meal',
      meeting: 'meeting',
    };
    const scheduleType = typeMap[item.type] || 'activity';

    // Ensure start_time is a valid ISO string
    let startTimeISO: string;
    let endTimeISO: string | null = null;

    try {
      startTimeISO = new Date(item.start_time).toISOString();
      if (item.end_time) {
        endTimeISO = new Date(item.end_time).toISOString();
      }
    } catch (e) {
      console.error('[AIImport] Invalid date format:', item.start_time, e);
      setError(`Invalid date format: ${item.start_time}`);
      setAdding(null);
      return;
    }

    console.log('[AIImport] Adding item:', {
      title: item.title,
      type: scheduleType,
      start_time: startTimeISO,
      end_time: endTimeISO,
    });

    const insertData: Record<string, unknown> = {
      trip_id: tripId,
      title: item.title,
      description: item.description || null,
      location: item.location || null,
      type: scheduleType,
      start_time: startTimeISO,
      end_time: endTimeISO,
    };

    // Add optional fields
    if (item.location_url) insertData.location_url = item.location_url;
    if (item.estimated_cost) insertData.estimated_cost = item.estimated_cost;
    if (item.reservation_code) insertData.reservation_code = item.reservation_code;
    if (item.contact_info) insertData.contact_info = item.contact_info;

    const { error: insertError } = await supabase.from('schedule_items').insert(insertData);

    if (insertError) {
      console.error('[AIImport] Insert error:', insertError);

      // Try with minimal data if column error
      if (insertError.message.includes('column')) {
        console.log('[AIImport] Retrying with minimal data...');
        const minimalData = {
          trip_id: tripId,
          title: item.title,
          description: item.description || null,
          location: item.location || null,
          type: scheduleType,
          start_time: startTimeISO,
          end_time: endTimeISO,
        };
        const { error: retryError } = await supabase.from('schedule_items').insert(minimalData);

        if (retryError) {
          console.error('[AIImport] Retry also failed:', retryError);
          setError(`Failed to add: ${retryError.message}`);
          setAdding(null);
          return;
        }
        console.log('[AIImport] Retry succeeded');
      } else {
        setError(`Failed to add: ${insertError.message}`);
        setAdding(null);
        return;
      }
    } else {
      console.log('[AIImport] Insert succeeded');
    }

    setAdding(null);
    setAddedItems(prev => new Set(prev).add(index));

    // Refresh the calendar immediately
    if (onRefreshCalendar) {
      console.log('[AIImport] Refreshing calendar...');
      onRefreshCalendar();
    }
  }

  async function handleAddAll() {
    for (let i = 0; i < parsedItems.length; i++) {
      if (!addedItems.has(i)) {
        await handleAddItem(parsedItems[i], i);
      }
    }
  }

  const pendingCount = parsedItems.length - addedItems.size;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-800 border border-white/10 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold">AI Import</h2>
            <p className="text-sm text-white/50">Paste booking confirmations to create schedule items</p>
          </div>
        </div>

        {parsedItems.length === 0 ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Paste your booking confirmation or text here
              </label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="input-field resize-none font-mono text-sm"
                rows={12}
                placeholder={`For example:

Your reservation is confirmed.

Hotel Berchielli
Check-in: Thursday 15 January 2026 (14:00)
Check-out: Friday 16 January 2026 (11:00)
Address: Lungarno Acciaiuoli, 14, Florence
Total price: €272.98
Reference: ABC123456`}
              />
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-sm">
              <p className="font-medium text-blue-400 mb-2">💡 Tips</p>
              <ul className="text-white/60 space-y-1">
                <li>• Copy the complete confirmation email</li>
                <li>• Works with hotels, flights, trains, activities</li>
                <li>• Multiple bookings in one text? No problem!</li>
                <li>• AI automatically recognizes dates, times and prices</li>
              </ul>
            </div>

            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={onClose} className="btn-secondary flex-1">
                Cancel
              </button>
              <button
                onClick={handleParse}
                disabled={loading || !inputText.trim()}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Analyze with AI
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-white/60">
                {parsedItems.length} item{parsedItems.length !== 1 ? 's' : ''} found
              </p>
              {pendingCount > 0 && (
                <button
                  onClick={handleAddAll}
                  className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add all ({pendingCount})
                </button>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                {error}
              </div>
            )}

            {parsedItems.map((item, index) => {
              const isAdded = addedItems.has(index);
              const colors = typeColors[item.type] || typeColors.activity;

              return (
                <div
                  key={index}
                  className={`p-4 rounded-xl border transition-all ${
                    isAdded
                      ? 'bg-green-500/10 border-green-500/30'
                      : 'bg-white/5 border-white/10 hover:border-blue-500/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`p-1.5 rounded-lg ${colors.bg} ${colors.border} border`}>
                          {typeIcons[item.type] || <Calendar className="w-4 h-4" />}
                        </span>
                        <h4 className="font-semibold">{item.title}</h4>
                        {isAdded && (
                          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Added
                          </span>
                        )}
                      </div>

                      {item.description && (
                        <p className="text-sm text-white/60 mb-2">{item.description}</p>
                      )}

                      <div className="flex flex-wrap gap-3 text-xs text-white/50">
                        {item.start_time && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(item.start_time).toLocaleString('en-US', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            {item.end_time && (
                              <> - {new Date(item.end_time).toLocaleString('en-US', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}</>
                            )}
                          </span>
                        )}
                        {item.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {item.location.length > 40 ? item.location.substring(0, 40) + '...' : item.location}
                          </span>
                        )}
                        {item.estimated_cost && (
                          <span className="flex items-center gap-1">
                            <Euro className="w-3 h-3" />
                            €{item.estimated_cost.toFixed(2)}
                          </span>
                        )}
                        {item.reservation_code && (
                          <span className="flex items-center gap-1 font-mono">
                            #{item.reservation_code}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleAddItem(item, index)}
                      disabled={adding !== null || isAdded}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isAdded
                          ? 'bg-green-500/20 text-green-400 cursor-default'
                          : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                      }`}
                    >
                      {adding === index ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : isAdded ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  setParsedItems([]);
                  setAddedItems(new Set());
                  setInputText('');
                }}
                className="btn-secondary flex-1"
              >
                New Import
              </button>
              <button onClick={onClose} className="btn-primary flex-1">
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
