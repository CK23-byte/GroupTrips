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
            content: `You are a ticket data extractor. Extract the following information from flight/train tickets:
- passenger_name: Full name of the passenger
- ticket_type: "flight", "train", "bus", or "other"
- carrier: Airline or train company name
- departure_location: City or station name
- arrival_location: City or station name
- departure_time: ISO 8601 format (YYYY-MM-DDTHH:mm:ss)
- arrival_time: ISO 8601 format if available
- seat_number: Seat assignment if visible
- gate: Gate number if visible
- booking_reference: Booking/confirmation code

Return ONLY valid JSON with these fields. Use null for missing values.`
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
