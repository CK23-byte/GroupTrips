import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Debug logging for connection issues
console.log('[Supabase] Initializing with URL:', supabaseUrl ? `${supabaseUrl.slice(0, 30)}...` : 'MISSING');
console.log('[Supabase] Anon key present:', !!supabaseAnonKey, supabaseAnonKey ? `(${supabaseAnonKey.length} chars)` : '');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] CRITICAL: Credentials not configured!');
  console.error('[Supabase] VITE_SUPABASE_URL:', supabaseUrl || 'NOT SET');
  console.error('[Supabase] VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'SET' : 'NOT SET');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  // Add request timeout
  global: {
    fetch: (url, options) => {
      console.log('[Supabase] Fetch request to:', typeof url === 'string' ? url.split('?')[0] : 'unknown');
      return fetch(url, {
        ...options,
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });
    },
  },
});

// Helper function to generate a unique lobby code
export function generateLobbyCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous characters
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Helper function to upload file to storage
export async function uploadFile(
  bucket: string,
  path: string,
  file: File
): Promise<string | null> {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true });

  if (error) {
    console.error('Upload error:', error);
    return null;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// Subscribe to real-time updates for a trip
export function subscribeToTrip(
  tripId: string,
  onMessage: (payload: unknown) => void
) {
  return supabase
    .channel(`trip-${tripId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'trip_messages',
        filter: `trip_id=eq.${tripId}`,
      },
      onMessage
    )
    .subscribe();
}

// Subscribe to location updates
export function subscribeToLocations(
  tripId: string,
  onUpdate: (payload: unknown) => void
) {
  return supabase
    .channel(`locations-${tripId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'member_locations',
        filter: `trip_id=eq.${tripId}`,
      },
      onUpdate
    )
    .subscribe();
}
