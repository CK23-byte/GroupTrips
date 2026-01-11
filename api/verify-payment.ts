import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId, userId } = req.body;

    // If we have a sessionId, use it directly
    if (sessionId) {
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status === 'paid') {
        return res.status(200).json({
          success: true,
          tripName: session.metadata?.tripName,
          userId: session.metadata?.userId,
          groupName: session.metadata?.groupName || '',
          description: session.metadata?.description || '',
          departureTime: session.metadata?.departureTime || '',
          returnTime: session.metadata?.returnTime || '',
        });
      } else {
        return res.status(400).json({
          success: false,
          error: 'Payment not completed',
          status: session.payment_status
        });
      }
    }

    // Fallback: Look up recent payments by client_reference_id (userId)
    // This is used for Payment Link flow where session_id isn't in the URL
    if (userId) {
      console.log('[verify-payment] Looking up recent sessions for userId:', userId);

      // Get recent checkout sessions with this client_reference_id
      const sessions = await stripe.checkout.sessions.list({
        limit: 5,
        expand: ['data.line_items'],
      });

      // Find the most recent paid session for this user
      const userSession = sessions.data.find(
        s => s.client_reference_id === userId && s.payment_status === 'paid'
      );

      if (userSession) {
        console.log('[verify-payment] Found session for user:', userSession.id);
        return res.status(200).json({
          success: true,
          paymentVerified: true,
          // Payment Link sessions don't have trip metadata, so return empty values
          // The frontend should use localStorage for trip data in this case
          tripName: userSession.metadata?.tripName || '',
          userId: userSession.client_reference_id || userId,
          groupName: userSession.metadata?.groupName || '',
          description: userSession.metadata?.description || '',
          departureTime: userSession.metadata?.departureTime || '',
          returnTime: userSession.metadata?.returnTime || '',
        });
      } else {
        console.log('[verify-payment] No recent paid session found for user');
        return res.status(404).json({
          success: false,
          error: 'No recent payment found for this user'
        });
      }
    }

    return res.status(400).json({ error: 'Session ID or User ID is required' });
  } catch (error) {
    console.error('Payment verification error:', error);
    return res.status(500).json({
      error: 'Failed to verify payment',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
