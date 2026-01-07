import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { location, groupSize, date, preferences } = req.body;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OpenAI API key not configured' });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a travel activity planner with expert local knowledge. Suggest REAL, EXISTING activities and venues that can actually be booked or visited.

IMPORTANT: Only suggest places and activities that ACTUALLY EXIST. Include:
- Real business/venue names (restaurants, tours, attractions)
- Actual addresses when possible
- Real booking websites (GetYourGuide, Viator, TripAdvisor, official venue websites)
- Current opening hours if relevant

Return a JSON array with 5 activities. Each activity MUST have:
- title: The REAL name of the venue/activity (e.g., "Sagrada Familia Tour" not "City Cathedral Tour")
- description: Brief description (1-2 sentences) of what makes it special
- type: "activity", "meal", "travel", "accommodation", "free_time", or "meeting"
- duration_hours: Estimated duration in hours
- estimated_cost: Realistic cost per person in EUR (number)
- best_time: Best time of day (morning, afternoon, evening, night)
- address: Real street address if applicable
- booking_url: Real URL where this can be booked (GetYourGuide, Viator, TripAdvisor, official site, or Google Maps search URL)
- rating: Typical rating out of 5 (based on your knowledge)
- tips: One insider tip for this activity

Focus on highly-rated, popular activities that groups typically enjoy.`
          },
          {
            role: 'user',
            content: `Suggest REAL, BOOKABLE activities for:
- Location: ${location || 'Unknown'}
- Group size: ${groupSize || 'Unknown'} people
- Date: ${date || 'Unknown'}
- Preferences: ${preferences || 'None specified'}

Return ONLY valid JSON array with real venues and booking links.`
          }
        ],
        max_tokens: 2000,
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error('OpenAI error:', data.error);
      return res.status(500).json({ error: data.error.message });
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return res.status(500).json({ error: 'No response from AI' });
    }

    try {
      const activities = JSON.parse(content.replace(/```json\n?|\n?```/g, ''));
      return res.status(200).json({ activities });
    } catch {
      return res.status(200).json({ raw: content });
    }
  } catch (error) {
    console.error('Error suggesting activities:', error);
    return res.status(500).json({ error: 'Failed to suggest activities' });
  }
}
