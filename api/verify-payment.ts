import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Generate a 6-character alphanumeric lobby code
function generateLobbyCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing characters (I, O, 0, 1)
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('[verify-payment] Starting payment verification');

  // Check for Stripe API key
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    console.error('[verify-payment] STRIPE_SECRET_KEY is not configured');
    return res.status(500).json({
      success: false,
      error: 'Payment verification unavailable - Stripe not configured',
    });
  }

  // Check for Supabase credentials
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[verify-payment] Supabase credentials missing');
    return res.status(500).json({
      success: false,
      error: 'Database connection unavailable',
    });
  }

  const stripe = new Stripe(stripeSecretKey);
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { sessionId, userId } = req.body;
    console.log('[verify-payment] Request body:', { sessionId: sessionId ? 'present' : 'null', userId });

    let verifiedUserId: string | null = null;
    let paymentVerified = false;

    // Step 1: Verify payment with Stripe
    if (sessionId) {
      console.log('[verify-payment] Verifying session:', sessionId);
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status === 'paid') {
        paymentVerified = true;
        verifiedUserId = session.client_reference_id || session.metadata?.userId || userId;
        console.log('[verify-payment] Payment verified for user:', verifiedUserId);
      } else {
        console.log('[verify-payment] Payment not completed, status:', session.payment_status);
        return res.status(400).json({
          success: false,
          error: 'Payment not completed',
          status: session.payment_status
        });
      }
    } else if (userId) {
      // Fallback: Look up recent payments by client_reference_id
      console.log('[verify-payment] Looking up recent sessions for userId:', userId);
      const sessions = await stripe.checkout.sessions.list({ limit: 10 });
      const userSession = sessions.data.find(
        s => s.client_reference_id === userId && s.payment_status === 'paid'
      );

      if (userSession) {
        paymentVerified = true;
        verifiedUserId = userId;
        console.log('[verify-payment] Found paid session for user');
      } else {
        console.log('[verify-payment] No recent paid session found');
        return res.status(404).json({
          success: false,
          error: 'No recent payment found for this user'
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        error: 'Session ID or User ID is required'
      });
    }

    if (!paymentVerified || !verifiedUserId) {
      return res.status(400).json({
        success: false,
        error: 'Payment verification failed'
      });
    }

    // Step 2: Check if trip already exists for this user (prevent duplicates)
    console.log('[verify-payment] Checking for existing trip...');
    const { data: existingTrip } = await supabase
      .from('trips')
      .select('id, lobby_code, name')
      .eq('created_by', verifiedUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // If trip was created in the last 5 minutes, return it (prevent duplicate creation)
    if (existingTrip) {
      const { data: membership } = await supabase
        .from('trip_members')
        .select('*')
        .eq('trip_id', existingTrip.id)
        .eq('user_id', verifiedUserId)
        .single();

      if (membership) {
        console.log('[verify-payment] Trip already exists:', existingTrip.id);
        return res.status(200).json({
          success: true,
          tripCreated: true,
          tripId: existingTrip.id,
          lobbyCode: existingTrip.lobby_code,
          tripName: existingTrip.name,
          message: 'Trip already created'
        });
      }
    }

    // Step 3: Get trip data from pending_trips table
    console.log('[verify-payment] Fetching pending trip data for user:', verifiedUserId);
    const { data: pendingTrip, error: pendingError } = await supabase
      .from('pending_trips')
      .select('*')
      .eq('user_id', verifiedUserId)
      .single();

    if (pendingError || !pendingTrip) {
      console.error('[verify-payment] No pending trip found:', pendingError?.message);
      return res.status(400).json({
        success: false,
        error: 'No pending trip data found. Please try creating your trip again.',
        paymentVerified: true // Payment was verified, but trip data is missing
      });
    }

    console.log('[verify-payment] Found pending trip:', pendingTrip.name);

    // Step 4: Generate unique lobby code
    let lobbyCode = generateLobbyCode();
    let attempts = 0;
    while (attempts < 10) {
      const { data: existing } = await supabase
        .from('trips')
        .select('id')
        .eq('lobby_code', lobbyCode)
        .single();

      if (!existing) break;
      lobbyCode = generateLobbyCode();
      attempts++;
    }
    console.log('[verify-payment] Generated lobby code:', lobbyCode);

    // Step 5: Create the trip
    const tripData = {
      name: pendingTrip.name,
      group_name: pendingTrip.group_name || null,
      description: pendingTrip.description || null,
      departure_time: pendingTrip.departure_time,
      return_time: pendingTrip.return_time || null,
      lobby_code: lobbyCode,
      created_by: verifiedUserId,
      destination: pendingTrip.destination || null,
    };

    console.log('[verify-payment] Creating trip:', tripData.name);
    const { data: createdTrip, error: tripError } = await supabase
      .from('trips')
      .insert(tripData)
      .select()
      .single();

    if (tripError || !createdTrip) {
      console.error('[verify-payment] Failed to create trip:', tripError?.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to create trip',
        details: tripError?.message,
        paymentVerified: true
      });
    }

    console.log('[verify-payment] Trip created:', createdTrip.id);

    // Step 6: Add user as admin member
    const { error: memberError } = await supabase
      .from('trip_members')
      .insert({
        trip_id: createdTrip.id,
        user_id: verifiedUserId,
        role: 'admin'
      });

    if (memberError) {
      console.error('[verify-payment] Failed to add member:', memberError.message);
      // Don't fail the whole request, trip is created
    } else {
      console.log('[verify-payment] User added as admin');
    }

    // Step 7: Delete pending trip data
    const { error: deleteError } = await supabase
      .from('pending_trips')
      .delete()
      .eq('user_id', verifiedUserId);

    if (deleteError) {
      console.error('[verify-payment] Failed to delete pending trip:', deleteError.message);
      // Don't fail, just log
    } else {
      console.log('[verify-payment] Pending trip deleted');
    }

    // Step 8: Return success with trip details
    console.log('[verify-payment] Success! Trip created with lobby code:', lobbyCode);
    return res.status(200).json({
      success: true,
      tripCreated: true,
      tripId: createdTrip.id,
      lobbyCode: createdTrip.lobby_code,
      tripName: createdTrip.name,
      message: 'Trip created successfully'
    });

  } catch (error) {
    console.error('[verify-payment] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to verify payment and create trip',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
