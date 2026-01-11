// OpenAI API helpers

export async function extractTicketData(imageFile: File): Promise<{
  passenger_name: string | null;
  ticket_type: 'flight' | 'train' | 'bus' | 'other';
  carrier: string | null;
  flight_number: string | null;
  departure_location: string | null;
  arrival_location: string | null;
  departure_time: string | null;
  arrival_time: string | null;
  seat_number: string | null;
  gate: string | null;
  booking_reference: string | null;
  terminal: string | null;
}> {
  const base64 = await fileToBase64(imageFile);

  const response = await fetch('/api/extract-ticket', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageBase64: base64,
      mimeType: imageFile.type,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to extract ticket data');
  }

  return response.json();
}

export async function suggestActivities(params: {
  location: string;
  groupSize: number;
  date: string;
  preferences?: string;
}): Promise<{
  title: string;
  description: string;
  type: string;
  duration_hours: number;
  estimated_cost: number;
  best_time: string;
}[]> {
  const response = await fetch('/api/suggest-activities', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get suggestions');
  }

  const data = await response.json();
  return data.activities || [];
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
  });
}

export function matchPassengerToMember(
  passengerName: string,
  members: { user_id: string; user?: { name?: string; email?: string } }[]
): { user_id: string; confidence: number } | null {
  if (!passengerName) return null;

  const normalizedPassenger = passengerName.toLowerCase().trim();
  let bestMatch: { user_id: string; confidence: number } | null = null;

  for (const member of members) {
    const memberName = member.user?.name?.toLowerCase().trim() || '';

    if (!memberName) continue;

    // Exact match
    if (normalizedPassenger === memberName) {
      return { user_id: member.user_id, confidence: 1.0 };
    }

    // Contains match
    if (normalizedPassenger.includes(memberName) || memberName.includes(normalizedPassenger)) {
      const confidence = 0.8;
      if (!bestMatch || confidence > bestMatch.confidence) {
        bestMatch = { user_id: member.user_id, confidence };
      }
    }

    // Partial word match
    const passengerWords = normalizedPassenger.split(/\s+/);
    const memberWords = memberName.split(/\s+/);
    const matchingWords = passengerWords.filter(w => memberWords.some(mw => mw.includes(w) || w.includes(mw)));

    if (matchingWords.length > 0) {
      const confidence = matchingWords.length / Math.max(passengerWords.length, memberWords.length) * 0.7;
      if (!bestMatch || confidence > bestMatch.confidence) {
        bestMatch = { user_id: member.user_id, confidence };
      }
    }
  }

  return bestMatch && bestMatch.confidence >= 0.5 ? bestMatch : null;
}
