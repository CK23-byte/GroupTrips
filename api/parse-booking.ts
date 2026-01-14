import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, tripStartDate, tripEndDate } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'No text provided' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OpenAI API key not configured' });
  }

  try {
    // Get current year for date context
    const currentYear = new Date().getFullYear();

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a booking confirmation parser. Extract schedule items from booking confirmations, reservation emails, or trip-related text.

IMPORTANT: The current year is ${currentYear}. When dates don't include a year, assume they are for ${currentYear} or ${currentYear + 1} (whichever makes more sense). Never use years before ${currentYear}.

The trip dates are: ${tripStartDate || 'unknown'} to ${tripEndDate || 'unknown'}

Extract ALL bookings/reservations from the text and return a JSON array of schedule items.

For each item, extract:
- title: Short descriptive title (e.g., "Hotel Berchielli", "Flight KL1234 to Paris", "Dinner at Restaurant X")
- type: One of "accommodation", "travel", "activity", "meal", "meeting"
- description: Relevant details (room type, booking reference, special notes)
- location: Full address or location name
- location_url: Google Maps URL if you can construct one from the address
- start_time: Check-in/departure/start time in ISO 8601 format (YYYY-MM-DDTHH:mm:ss)
- end_time: Check-out/arrival/end time in ISO 8601 format (can be null)
- estimated_cost: Total price as a number (without currency symbol)
- reservation_code: Booking reference/confirmation number
- contact_info: Phone number or email if available

Type mapping:
- Hotels, hostels, apartments, B&Bs → "accommodation"
- Flights, trains, buses, ferries, transfers → "travel"
- Tours, attractions, museums, experiences → "activity"
- Restaurants, cafes, food experiences → "meal"
- Meeting points, pickup locations → "meeting"

Important:
- Parse ALL reservations found in the text (there may be multiple)
- Convert all dates to ISO 8601 format
- If year is not specified, assume the trip year based on trip dates
- For accommodations, start_time = check-in datetime, end_time = check-out datetime
- For flights/travel, start_time = departure, end_time = arrival
- Return ONLY a valid JSON array, no additional text

Example output:
[
  {
    "title": "Hotel Berchielli",
    "type": "accommodation",
    "description": "2 kamers, 2 volwassenen. Booking.com referentie.",
    "location": "Lungarno Acciaiuoli, 14, Tornabuoni, 50123 Florence, Italië",
    "location_url": "https://www.google.com/maps/search/?api=1&query=Lungarno+Acciaiuoli+14+Florence+Italy",
    "start_time": "2026-01-15T14:00:00",
    "end_time": "2026-01-16T11:00:00",
    "estimated_cost": 272.98,
    "reservation_code": "ABC123456",
    "contact_info": "+39 055 264061"
  }
]`
          },
          {
            role: 'user',
            content: `Parse this booking confirmation and extract schedule items:\n\n${text}`
          }
        ],
        max_tokens: 2000,
        temperature: 0.1,
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

    // Parse the JSON response
    try {
      // Clean up the response - remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      const items = JSON.parse(cleanContent);

      // Ensure it's an array
      const itemsArray = Array.isArray(items) ? items : [items];

      return res.status(200).json({ items: itemsArray });
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Content:', content);
      // Return raw content for debugging
      return res.status(200).json({ raw: content, parseError: 'Failed to parse AI response as JSON' });
    }
  } catch (error) {
    console.error('Error parsing booking:', error);
    return res.status(500).json({ error: 'Failed to parse booking confirmation' });
  }
}
