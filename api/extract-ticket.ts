import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageBase64, mimeType } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: 'No image provided' });
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
            content: `You are a ticket data extractor. Extract information from tickets (transport OR events like festivals, concerts, sports).

IMPORTANT: The current year is ${currentYear}. When dates on tickets don't include a year, assume they are for ${currentYear} or ${currentYear + 1} (whichever makes more sense based on the current date). Never use years before ${currentYear}.

For TRANSPORT tickets (flights, trains, buses):
- passenger_name: Full name of the passenger
- ticket_type: "flight", "train", or "bus"
- carrier: Airline or transport company name (e.g., "KLM", "Ryanair", "NS")
- flight_number: Flight/train number (e.g., "KL1234", "BA567", "IC621")
- departure_location: City, airport code, or station name
- arrival_location: City, airport code, or station name
- departure_time: ISO 8601 format (YYYY-MM-DDTHH:mm:ss)
- arrival_time: ISO 8601 format if available
- seat_number: Seat assignment if visible
- gate: Gate or platform number if visible
- booking_reference: Booking/confirmation/PNR code
- terminal: Terminal number if visible

For EVENT tickets (festivals, concerts, sports, exhibitions):
- passenger_name: Attendee name if visible
- ticket_type: "event"
- carrier: Event organizer, festival name, or venue (e.g., "Tomorrowland", "Live Nation")
- event_name: Name of the event/festival/concert
- venue: Location/venue name
- arrival_location: City or venue address
- departure_time: Event start date/time in ISO 8601 format
- arrival_time: Event end date/time if available
- seat_number: Seat, zone, or area if applicable
- booking_reference: Order/ticket number
- gate: Entry gate if visible

Use "other" for ticket_type if unclear. Return ONLY valid JSON with these fields. Use null for missing values.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract ticket information from this image:'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
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
      const ticketData = JSON.parse(content.replace(/```json\n?|\n?```/g, ''));
      return res.status(200).json(ticketData);
    } catch {
      // If JSON parsing fails, return raw content
      return res.status(200).json({ raw: content });
    }
  } catch (error) {
    console.error('Error extracting ticket:', error);
    return res.status(500).json({ error: 'Failed to extract ticket data' });
  }
}
