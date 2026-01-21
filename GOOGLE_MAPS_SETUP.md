# Google Maps API Setup Guide

This guide explains how to set up Google Maps for the GroupTrips application, enabling the interactive map and location sharing features.

## Prerequisites

- A Google Cloud Platform (GCP) account
- A credit card for billing (Google offers $200 free credit monthly for Maps)

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" dropdown at the top
3. Click "New Project"
4. Name it (e.g., "GroupTrips") and click "Create"
5. Make sure your new project is selected

## Step 2: Enable the Maps JavaScript API

1. Go to [APIs & Services > Library](https://console.cloud.google.com/apis/library)
2. Search for "Maps JavaScript API"
3. Click on it and press "Enable"

**Important:** This is the only API required for GroupTrips. Do NOT enable:
- Geocoding API (not used)
- Places API (not used)
- Directions API (not used)

## Step 3: Create an API Key

1. Go to [APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials)
2. Click "Create Credentials" > "API Key"
3. Copy the generated API key

## Step 4: Restrict the API Key (Recommended)

For security, restrict your API key:

1. Click on your newly created API key
2. Under "Application restrictions":
   - Select "HTTP referrers (websites)"
   - Add your domains:
     ```
     http://localhost:*
     https://localhost:*
     https://yourdomain.com/*
     https://*.vercel.app/*
     ```
3. Under "API restrictions":
   - Select "Restrict key"
   - Choose only "Maps JavaScript API"
4. Click "Save"

## Step 5: Enable Billing

Google Maps requires a billing account, but you get $200 free credit monthly:

1. Go to [Billing](https://console.cloud.google.com/billing)
2. Create or link a billing account
3. Associate it with your project

**Note:** The free tier ($200/month) covers approximately:
- 28,000 map loads
- This is more than enough for most GroupTrips deployments

## Step 6: Add the API Key to Your Environment

### For Local Development

Create or edit `.env.local`:

```env
VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
```

### For Vercel Deployment

1. Go to your project in Vercel Dashboard
2. Navigate to Settings > Environment Variables
3. Add:
   - Name: `VITE_GOOGLE_MAPS_API_KEY`
   - Value: `your_api_key_here`
4. Redeploy your application

## Troubleshooting

### "Maps JavaScript API not activated"

- Ensure you've enabled the Maps JavaScript API in your GCP Console
- Check that billing is enabled on your project

### "This page can't load Google Maps correctly"

- Verify your API key is correct
- Check that the domain is added to HTTP referrer restrictions
- Ensure billing is enabled

### Map shows but location sharing doesn't work

Location sharing uses the browser's Geolocation API, not Google Maps. Check:

1. **HTTPS Required:** Geolocation only works on HTTPS (or localhost)
2. **User Permission:** Users must allow location access when prompted
3. **Browser Extensions:** Extensions like "Location Guard" can block/spoof location
4. **Supabase Table:** Ensure the `member_locations` table exists with proper RLS policies

### Location updates are slow/missing

- Check browser console for geolocation errors
- Verify the Supabase realtime subscription is working
- Ensure users have stable GPS signal

## Cost Estimation

Google Maps pricing (as of 2024):
- Maps JavaScript API: $7 per 1,000 loads
- Free tier: $200/month credit (~28,500 free loads)

For a typical group trip:
- 10 members viewing the map
- Average 20 map loads per day
- 7-day trip = 1,400 loads = ~$10 (covered by free tier)

## Security Best Practices

1. **Always restrict your API key** to specific domains and APIs
2. **Never commit API keys** to version control
3. **Monitor usage** in GCP Console for unexpected spikes
4. **Set billing alerts** to avoid surprise charges

## API Key Checklist

Before going live, verify:

- [ ] Maps JavaScript API is enabled
- [ ] Billing is enabled
- [ ] API key has HTTP referrer restrictions
- [ ] API key restricts to Maps JavaScript API only
- [ ] Key is added to Vercel environment variables
- [ ] Key is NOT in your git repository
