import type { VercelRequest, VercelResponse } from '@vercel/node';

// Interface for Google Places API response
interface GooglePlace {
  displayName?: { text: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  googleMapsUri?: string;
  regularOpeningHours?: {
    weekdayDescriptions?: string[];
  };
  priceLevel?: string;
  types?: string[];
  editorialSummary?: { text: string };
}

// Search Google Places for real activities at a location
async function searchGooglePlaces(
  location: string,
  activityTypes: string[],
  googleApiKey: string
): Promise<GooglePlace[]> {
  const allPlaces: GooglePlace[] = [];

  // Search for different types of activities
  const searchQueries = [
    `things to do in ${location}`,
    `tourist attractions ${location}`,
    `popular restaurants ${location}`,
    `tours ${location}`,
  ];

  for (const query of searchQueries.slice(0, 2)) { // Limit to 2 queries to save API calls
    try {
      const response = await fetch(
        'https://places.googleapis.com/v1/places:searchText',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': googleApiKey,
            'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.websiteUri,places.googleMapsUri,places.regularOpeningHours,places.priceLevel,places.types,places.editorialSummary',
          },
          body: JSON.stringify({
            textQuery: query,
            maxResultCount: 10,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.places) {
          allPlaces.push(...data.places);
        }
      }
    } catch (error) {
      console.error('[suggest-activities] Google Places search error:', error);
    }
  }

  // Deduplicate by name
  const uniquePlaces = allPlaces.filter((place, index, self) =>
    index === self.findIndex(p => p.displayName?.text === place.displayName?.text)
  );

  return uniquePlaces;
}

// Format places for AI curation
function formatPlacesForAI(places: GooglePlace[]): string {
  return places.map((place, i) => {
    const name = place.displayName?.text || 'Unknown';
    const address = place.formattedAddress || '';
    const rating = place.rating ? `${place.rating}/5 (${place.userRatingCount} reviews)` : 'No rating';
    const website = place.websiteUri || place.googleMapsUri || '';
    const summary = place.editorialSummary?.text || '';

    return `${i + 1}. ${name}
   Address: ${address}
   Rating: ${rating}
   Website: ${website}
   ${summary ? `Description: ${summary}` : ''}`;
  }).join('\n\n');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { location, groupSize, date, preferences } = req.body;

  const openaiKey = process.env.OPENAI_API_KEY;
  const googleApiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!openaiKey) {
    return res.status(500).json({ error: 'OpenAI API key not configured' });
  }

  try {
    // Step 1: Try to get real places from Google Places API
    let realPlacesContext = '';
    let sourcedFromGoogle = false;

    if (googleApiKey && location) {
      console.log('[suggest-activities] Fetching real places from Google Places API...');
      const places = await searchGooglePlaces(location, [], googleApiKey);

      if (places.length > 0) {
        realPlacesContext = formatPlacesForAI(places);
        sourcedFromGoogle = true;
        console.log(`[suggest-activities] Found ${places.length} real places`);
      }
    }

    // Step 2: Use AI to curate and format the suggestions
    const systemPrompt = sourcedFromGoogle
      ? `You are a travel activity planner. You have been provided with REAL places and activities from Google Places.

Your task is to SELECT and FORMAT the best 5 activities from the provided list for a group trip.

IMPORTANT RULES:
- ONLY suggest places from the provided list - do not make up new places
- Use the exact names and addresses provided
- Keep the real booking URLs/Google Maps links
- Add estimated duration and cost based on the type of activity
- Organize activities by best time of day

For each activity, return:
- title: The exact name from the list
- description: Brief description (1-2 sentences) - can enhance from the provided info
- type: "activity", "meal", "travel", "accommodation", "free_time", or "meeting"
- duration_hours: Estimated duration in hours
- estimated_cost: Realistic cost per person in EUR (number)
- best_time: Best time of day (morning, afternoon, evening, night)
- address: Use the exact address from the list
- booking_url: Use the website or Google Maps URL from the list
- rating: Use the rating from the list (or null if not available)
- tips: One practical tip for visiting

Return ONLY a valid JSON array.`
      : `You are a travel activity planner with expert local knowledge. Suggest REAL, EXISTING activities and venues that can actually be booked or visited.

IMPORTANT: Only suggest places and activities that ACTUALLY EXIST. Include:
- Real business/venue names (restaurants, tours, attractions)
- Actual addresses when possible
- Real booking websites (GetYourGuide, Viator, TripAdvisor, official venue websites)
- If unsure about a specific URL, use a Google Search URL like: https://www.google.com/search?q=ACTIVITY+NAME+LOCATION+booking

Return a JSON array with 5 activities. Each activity MUST have:
- title: The REAL name of the venue/activity (e.g., "Sagrada Familia" not "City Cathedral")
- description: Brief description (1-2 sentences) of what makes it special
- type: "activity", "meal", "travel", "accommodation", "free_time", or "meeting"
- duration_hours: Estimated duration in hours
- estimated_cost: Realistic cost per person in EUR (number)
- best_time: Best time of day (morning, afternoon, evening, night)
- address: Real street address if applicable
- booking_url: Real URL or Google Search URL as fallback
- rating: Typical rating out of 5 (or null)
- tips: One insider tip for this activity

Focus on highly-rated, popular activities that groups typically enjoy. Only suggest well-known, verifiable places.`;

    const userPrompt = sourcedFromGoogle
      ? `Here are REAL places and activities in ${location}:

${realPlacesContext}

Please select and format the best 5 activities from this list for:
- Group size: ${groupSize || 'Unknown'} people
- Date: ${date || 'Unknown'}
- Preferences: ${preferences || 'None specified'}

Return ONLY a valid JSON array with the selected activities.`
      : `Suggest REAL, VERIFIABLE activities for:
- Location: ${location || 'Unknown'}
- Group size: ${groupSize || 'Unknown'} people
- Date: ${date || 'Unknown'}
- Preferences: ${preferences || 'None specified'}

Return ONLY valid JSON array with real venues. If you're not 100% sure about a booking URL, use a Google Search URL.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 2000,
        temperature: 0.7, // Lower temperature for more consistent results
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error('[suggest-activities] OpenAI error:', data.error);
      return res.status(500).json({ error: data.error.message });
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return res.status(500).json({ error: 'No response from AI' });
    }

    try {
      const activities = JSON.parse(content.replace(/```json\n?|\n?```/g, ''));

      // Add source indicator
      return res.status(200).json({
        activities,
        source: sourcedFromGoogle ? 'google_places' : 'ai_generated',
        disclaimer: sourcedFromGoogle
          ? 'Activities sourced from Google Places and curated by AI.'
          : 'Activities suggested by AI. Please verify booking details before booking.'
      });
    } catch {
      console.error('[suggest-activities] Failed to parse AI response:', content);
      return res.status(200).json({ raw: content });
    }
  } catch (error) {
    console.error('[suggest-activities] Error:', error);
    return res.status(500).json({ error: 'Failed to suggest activities' });
  }
}
