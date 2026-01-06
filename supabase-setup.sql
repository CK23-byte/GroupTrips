-- GroupTrips Database Setup
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trips table
CREATE TABLE IF NOT EXISTS public.trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  lobby_code TEXT NOT NULL UNIQUE,
  admin_id UUID NOT NULL REFERENCES public.users(id),
  departure_time TIMESTAMPTZ NOT NULL,
  destination TEXT,
  cover_image_url TEXT,
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trip members table
CREATE TABLE IF NOT EXISTS public.trip_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trip_id, user_id)
);

-- Tickets table
CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.users(id),
  type TEXT NOT NULL CHECK (type IN ('flight', 'train', 'bus', 'other')),
  carrier TEXT,
  departure_location TEXT NOT NULL,
  arrival_location TEXT NOT NULL,
  departure_time TIMESTAMPTZ NOT NULL,
  arrival_time TIMESTAMPTZ,
  seat_number TEXT,
  gate TEXT,
  booking_reference TEXT,
  qr_code_url TEXT,
  full_ticket_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trip_id, member_id)
);

-- Trip documents table
CREATE TABLE IF NOT EXISTS public.trip_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.users(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('passport', 'visa', 'insurance', 'booking', 'other')),
  file_url TEXT NOT NULL,
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Schedule items table
CREATE TABLE IF NOT EXISTS public.schedule_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  type TEXT NOT NULL CHECK (type IN ('travel', 'activity', 'meal', 'accommodation', 'free_time', 'meeting')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trip messages table
CREATE TABLE IF NOT EXISTS public.trip_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id),
  content TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('announcement', 'update', 'reminder', 'alert')),
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Member locations table
CREATE TABLE IF NOT EXISTS public.member_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id),
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trip_id, user_id)
);

-- Trip media table
CREATE TABLE IF NOT EXISTS public.trip_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.users(id),
  type TEXT NOT NULL CHECK (type IN ('photo', 'video')),
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  taken_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- After movies table
CREATE TABLE IF NOT EXISTS public.after_movies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.users(id),
  title TEXT NOT NULL,
  duration INTEGER NOT NULL,
  music_track TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_trips_lobby_code ON public.trips(lobby_code);
CREATE INDEX IF NOT EXISTS idx_trips_admin_id ON public.trips(admin_id);
CREATE INDEX IF NOT EXISTS idx_trip_members_trip_id ON public.trip_members(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_members_user_id ON public.trip_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_trip_id ON public.tickets(trip_id);
CREATE INDEX IF NOT EXISTS idx_schedule_items_trip_id ON public.schedule_items(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_messages_trip_id ON public.trip_messages(trip_id);
CREATE INDEX IF NOT EXISTS idx_member_locations_trip_id ON public.member_locations(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_media_trip_id ON public.trip_media(trip_id);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.after_movies ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users: can read all, update own
CREATE POLICY "Users are viewable by everyone" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- Trips: members can view, admin can update
CREATE POLICY "Trip members can view trips" ON public.trips FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.trip_members WHERE trip_id = id AND user_id = auth.uid()));
CREATE POLICY "Anyone can create trips" ON public.trips FOR INSERT WITH CHECK (auth.uid() = admin_id);
CREATE POLICY "Admin can update trips" ON public.trips FOR UPDATE
  USING (admin_id = auth.uid());
CREATE POLICY "Admin can delete trips" ON public.trips FOR DELETE
  USING (admin_id = auth.uid());

-- Trip members: trip members can view, admin can manage
CREATE POLICY "Trip members can view members" ON public.trip_members FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.trip_members tm WHERE tm.trip_id = trip_id AND tm.user_id = auth.uid()));
CREATE POLICY "Anyone can join trips" ON public.trip_members FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admin can manage members" ON public.trip_members FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.trips WHERE id = trip_id AND admin_id = auth.uid()));

-- Tickets: own ticket viewable, admin can manage
CREATE POLICY "Users can view own ticket" ON public.tickets FOR SELECT
  USING (member_id = auth.uid());
CREATE POLICY "Admin can manage tickets" ON public.tickets FOR ALL
  USING (EXISTS (SELECT 1 FROM public.trips WHERE id = trip_id AND admin_id = auth.uid()));

-- Schedule items: trip members can view, admin can manage
CREATE POLICY "Trip members can view schedule" ON public.schedule_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.trip_members WHERE trip_id = schedule_items.trip_id AND user_id = auth.uid()));
CREATE POLICY "Admin can manage schedule" ON public.schedule_items FOR ALL
  USING (EXISTS (SELECT 1 FROM public.trips WHERE id = trip_id AND admin_id = auth.uid()));

-- Messages: trip members can view and send
CREATE POLICY "Trip members can view messages" ON public.trip_messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.trip_members WHERE trip_id = trip_messages.trip_id AND user_id = auth.uid()));
CREATE POLICY "Trip members can send messages" ON public.trip_messages FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.trip_members WHERE trip_id = trip_messages.trip_id AND user_id = auth.uid()));
CREATE POLICY "Admin can manage messages" ON public.trip_messages FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.trips WHERE id = trip_id AND admin_id = auth.uid()));

-- Locations: trip members can view and update own
CREATE POLICY "Trip members can view locations" ON public.member_locations FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.trip_members WHERE trip_id = member_locations.trip_id AND user_id = auth.uid()));
CREATE POLICY "Users can update own location" ON public.member_locations FOR ALL
  USING (user_id = auth.uid());

-- Media: trip members can view and upload
CREATE POLICY "Trip members can view media" ON public.trip_media FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.trip_members WHERE trip_id = trip_media.trip_id AND user_id = auth.uid()));
CREATE POLICY "Trip members can upload media" ON public.trip_media FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.trip_members WHERE trip_id = trip_media.trip_id AND user_id = auth.uid()));

-- Enable realtime for messages and locations
ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.member_locations;

-- Storage buckets setup (run in Supabase dashboard or via API)
-- Create buckets: 'tickets', 'documents', 'trip-media', 'avatars'
-- IMPORTANT: The trip-media bucket must be public for photos to display in the gallery
-- In Supabase Dashboard: Storage > trip-media > Policies > New Policy
-- Add a SELECT policy with "true" for public read access
