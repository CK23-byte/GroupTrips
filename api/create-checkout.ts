import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check for Stripe API key before initializing
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    console.error('[create-checkout] STRIPE_SECRET_KEY is not configured');
    return res.status(500).json({
      error: 'Payment system unavailable - Stripe not configured',
      details: 'STRIPE_SECRET_KEY environment variable is missing'
    });
  }

  const stripe = new Stripe(stripeSecretKey);

  try {
    const { tripName, userId, successUrl, cancelUrl, groupName, description, departureTime, returnTime } = req.body;

    if (!tripName || !userId) {
      return res.status(400).json({ error: 'Trip name and user ID are required' });
    }

    // Determine the app URL - prefer provided URLs, then env var, then Vercel URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'https://grouptrips.app';

    const finalSuccessUrl = successUrl || `${appUrl}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`;
    const finalCancelUrl = cancelUrl || `${appUrl}/dashboard?payment=cancelled`;

    console.log('[create-checkout] URLs:', { successUrl: finalSuccessUrl, cancelUrl: finalCancelUrl });

    // Create Stripe checkout session with all trip data in metadata
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'ideal'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `GroupTrips - ${tripName}`,
              description: 'Create a new group trip with unlimited members, AI ticket scanning, aftermovie generation, and more.',
              images: ['https://grouptrips.app/og-image.png'],
            },
            unit_amount: 2499, // €24.99 in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: finalSuccessUrl,
      cancel_url: finalCancelUrl,
      metadata: {
        tripName,
        userId,
        groupName: groupName || '',
        description: description || '',
        departureTime: departureTime || '',
        returnTime: returnTime || '',
      },
      customer_email: req.body.email,
    });

    return res.status(200).json({
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return res.status(500).json({
      error: 'Failed to create checkout session',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
