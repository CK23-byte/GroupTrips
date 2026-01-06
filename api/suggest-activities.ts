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
            content: `You are a travel activity planner. Suggest fun and interesting activities for group trips.
Return a JSON array with 5 activities. Each activity should have:
- title: Activity name
- description: Brief description (1-2 sentences)
- type: "activity", "meal", "travel", "accommodation", "free_time", or "meeting"
- duration_hours: Estimated duration in hours
- estimated_cost: Cost per person in EUR (number)
- best_time: Best time of day (morning, afternoon, evening, night)

Be creative and consider the local culture and attractions.`
          },
          {
            role: 'user',
            content: `Suggest activities for:
- Location: ${location || 'Unknown'}
- Group size: ${groupSize || 'Unknown'} people
- Date: ${date || 'Unknown'}
- Preferences: ${preferences || 'None specified'}

Return ONLY valid JSON array.`
          }
        ],
        max_tokens: 1500,
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
