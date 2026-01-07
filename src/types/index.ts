// User types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  created_at: string;
}

// Trip types
export interface Trip {
  id: string;
  name: string;
  description?: string;
  lobby_code: string;
  admin_id: string;
  departure_time: string;
  destination?: string; // Hidden until reveal time
  cover_image_url?: string;
  status: 'planning' | 'active' | 'completed';
  created_at: string;
  updated_at: string;
}

// Trip member types
export interface TripMember {
  id: string;
  trip_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  user?: User;
}

// Ticket types
export interface Ticket {
  id: string;
  trip_id: string;
  member_id: string;
  type: 'flight' | 'train' | 'bus' | 'other';
  carrier?: string;
  departure_location: string;
  arrival_location: string;
  departure_time: string;
  arrival_time?: string;
  seat_number?: string;
  gate?: string;
  booking_reference?: string;
  qr_code_url?: string;
  full_ticket_url?: string;
  created_at: string;
}

// Document types
export interface TripDocument {
  id: string;
  trip_id: string;
  uploaded_by: string;
  name: string;
  type: 'passport' | 'visa' | 'insurance' | 'booking' | 'other';
  file_url: string;
  is_private: boolean;
  created_at: string;
}

// Timeline/Schedule types
export interface ScheduleItem {
  id: string;
  trip_id: string;
  title: string;
  description?: string;
  location?: string;
  location_url?: string; // Google Maps link
  start_time: string;
  end_time?: string;
  type: 'travel' | 'activity' | 'meal' | 'accommodation' | 'free_time' | 'meeting';
  booking_url?: string;
  reservation_code?: string;
  contact_info?: string;
  estimated_cost?: number;
  is_transport?: boolean; // For flights, trains, buses
  created_at: string;
}

// Message/Notification types
export interface TripMessage {
  id: string;
  trip_id: string;
  sender_id: string;
  content: string;
  type: 'announcement' | 'update' | 'reminder' | 'alert';
  is_pinned: boolean;
  created_at: string;
  sender?: User;
}

// Location sharing types
export interface MemberLocation {
  id: string;
  trip_id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  updated_at: string;
  user?: User;
}

// Media types
export interface TripMedia {
  id: string;
  trip_id: string;
  uploaded_by: string;
  type: 'photo' | 'video';
  file_url: string;
  thumbnail_url?: string;
  caption?: string;
  taken_at?: string;
  created_at: string;
  uploader?: User;
}

// After-movie types
export interface AfterMovie {
  id: string;
  trip_id: string;
  created_by: string;
  title: string;
  duration: number; // in seconds
  music_track?: string;
  video_url?: string;
  thumbnail_url?: string;
  status: 'processing' | 'ready' | 'failed';
  created_at: string;
}

// Weather types
export interface WeatherInfo {
  location: string;
  temperature: number;
  condition: string;
  icon: string;
  humidity: number;
  wind_speed: number;
  forecast: WeatherForecast[];
}

export interface WeatherForecast {
  date: string;
  high: number;
  low: number;
  condition: string;
  icon: string;
}

// Reveal status helper type
export type TicketRevealStatus = 'hidden' | 'qr_only' | 'full';

// Helper function to determine ticket reveal status
export function getTicketRevealStatus(departureTime: string): TicketRevealStatus {
  const now = new Date();
  const departure = new Date(departureTime);
  const hoursUntilDeparture = (departure.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntilDeparture <= 1) {
    return 'full';
  } else if (hoursUntilDeparture <= 3) {
    return 'qr_only';
  }
  return 'hidden';
}
