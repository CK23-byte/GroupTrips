import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase, subscribeToTrip, subscribeToLocations } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type { Trip, TripMember, TripMessage, MemberLocation, ScheduleItem } from '../types';

interface TripContextType {
  currentTrip: Trip | null;
  members: TripMember[];
  messages: TripMessage[];
  locations: MemberLocation[];
  schedule: ScheduleItem[];
  isAdmin: boolean;
  loading: boolean;
  joinTrip: (lobbyCode: string) => Promise<{ error: string | null; tripId?: string }>;
  leaveTrip: () => void;
  sendMessage: (content: string, type: TripMessage['type']) => Promise<{ error: string | null }>;
  updateLocation: (lat: number, lng: number) => Promise<void>;
  refreshTrip: () => Promise<void>;
}

const TripContext = createContext<TripContextType | undefined>(undefined);

export function TripProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentTrip, setCurrentTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [messages, setMessages] = useState<TripMessage[]>([]);
  const [locations, setLocations] = useState<MemberLocation[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentTrip) return;

    // Subscribe to real-time messages
    const messageChannel = subscribeToTrip(currentTrip.id, (payload) => {
      const newMessage = (payload as { new: TripMessage }).new;
      setMessages((prev) => [...prev, newMessage]);
    });

    // Subscribe to location updates
    const locationChannel = subscribeToLocations(currentTrip.id, (payload) => {
      const update = (payload as { new: MemberLocation }).new;
      setLocations((prev) => {
        const existing = prev.findIndex((l) => l.user_id === update.user_id);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = update;
          return updated;
        }
        return [...prev, update];
      });
    });

    return () => {
      messageChannel.unsubscribe();
      locationChannel.unsubscribe();
    };
  }, [currentTrip]);

  async function joinTrip(lobbyCode: string): Promise<{ error: string | null; tripId?: string }> {
    if (!user) return { error: 'Not authenticated' };

    console.log('[TripContext] joinTrip called with code:', lobbyCode);
    setLoading(true);

    // Timeout protection - 5 seconds max
    const timeoutPromise = new Promise<{ error: string }>((resolve) => {
      setTimeout(() => resolve({ error: 'Request timed out. Please try again.' }), 5000);
    });

    const joinPromise = async (): Promise<{ error: string | null; tripId?: string }> => {
      try {
        // Find trip by lobby code (normalize to uppercase)
        const normalizedCode = lobbyCode.toUpperCase().trim();
        console.log('[TripContext] Looking up trip with code:', normalizedCode);

        const { data: trip, error: tripError } = await supabase
          .from('trips')
          .select('*')
          .eq('lobby_code', normalizedCode)
          .single();

        if (tripError) {
          console.error('[TripContext] Trip lookup error:', tripError);
          if (tripError.code === 'PGRST116') {
            return { error: 'Invalid lobby code. Please check and try again.' };
          }
          return { error: `Failed to find trip: ${tripError.message}` };
        }

        if (!trip) {
          return { error: 'Trip not found. Please check the lobby code.' };
        }

        console.log('[TripContext] Found trip:', trip.id, trip.name);

        // Check if already a member
        const { data: existingMember, error: memberCheckError } = await supabase
          .from('trip_members')
          .select('*')
          .eq('trip_id', trip.id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (memberCheckError) {
          console.error('[TripContext] Member check error:', memberCheckError);
        }

        if (existingMember) {
          console.log('[TripContext] User already a member, loading trip data');
        } else {
          // Add as member
          console.log('[TripContext] Adding user as member');
          const { error: joinError } = await supabase.from('trip_members').insert({
            trip_id: trip.id,
            user_id: user.id,
            role: 'member',
          });

          if (joinError) {
            console.error('[TripContext] Join error:', joinError);
            return { error: `Failed to join trip: ${joinError.message}` };
          }
        }

        // Load trip data
        await loadTripData(trip.id);
        setCurrentTrip(trip as Trip);

        console.log('[TripContext] Successfully joined trip:', trip.id);
        return { error: null, tripId: trip.id };
      } catch (err) {
        console.error('[TripContext] Unexpected error:', err);
        return { error: 'An unexpected error occurred. Please try again.' };
      }
    };

    try {
      const result = await Promise.race([joinPromise(), timeoutPromise]);
      setLoading(false);
      return result;
    } catch (err) {
      console.error('[TripContext] Race error:', err);
      setLoading(false);
      return { error: 'An unexpected error occurred. Please try again.' };
    }
  }

  async function loadTripData(tripId: string) {
    // Load members
    const { data: membersData } = await supabase
      .from('trip_members')
      .select('*, user:users(*)')
      .eq('trip_id', tripId);

    if (membersData) {
      setMembers(membersData as TripMember[]);
      const userMember = membersData.find((m) => m.user_id === user?.id);
      setIsAdmin(userMember?.role === 'admin');
    }

    // Load messages
    const { data: messagesData } = await supabase
      .from('trip_messages')
      .select('*, sender:users(*)')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: true });

    if (messagesData) {
      setMessages(messagesData as TripMessage[]);
    }

    // Load schedule
    const { data: scheduleData } = await supabase
      .from('schedule_items')
      .select('*')
      .eq('trip_id', tripId)
      .order('start_time', { ascending: true });

    if (scheduleData) {
      setSchedule(scheduleData as ScheduleItem[]);
    }

    // Load locations
    const { data: locationsData } = await supabase
      .from('member_locations')
      .select('*, user:users(*)')
      .eq('trip_id', tripId);

    if (locationsData) {
      setLocations(locationsData as MemberLocation[]);
    }
  }

  function leaveTrip() {
    setCurrentTrip(null);
    setMembers([]);
    setMessages([]);
    setLocations([]);
    setSchedule([]);
    setIsAdmin(false);
  }

  async function sendMessage(content: string, type: TripMessage['type']) {
    if (!currentTrip || !user) return { error: 'Not in a trip' };

    const { error } = await supabase.from('trip_messages').insert({
      trip_id: currentTrip.id,
      sender_id: user.id,
      content,
      type,
      is_pinned: false,
    });

    if (error) {
      return { error: error.message };
    }
    return { error: null };
  }

  async function updateLocation(lat: number, lng: number) {
    if (!currentTrip || !user) return;

    await supabase.from('member_locations').upsert({
      trip_id: currentTrip.id,
      user_id: user.id,
      latitude: lat,
      longitude: lng,
      updated_at: new Date().toISOString(),
    });
  }

  async function refreshTrip() {
    if (currentTrip) {
      await loadTripData(currentTrip.id);
    }
  }

  return (
    <TripContext.Provider
      value={{
        currentTrip,
        members,
        messages,
        locations,
        schedule,
        isAdmin,
        loading,
        joinTrip,
        leaveTrip,
        sendMessage,
        updateLocation,
        refreshTrip,
      }}
    >
      {children}
    </TripContext.Provider>
  );
}

export function useTrip() {
  const context = useContext(TripContext);
  if (context === undefined) {
    throw new Error('useTrip must be used within a TripProvider');
  }
  return context;
}
