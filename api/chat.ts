import { askGemini } from '../lib/gemini.js';

export default async function handler(req: any, res: any) {
  try {
    const { message, weather, location } = req.body || {};
    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const prompt = [
      'You are WeatherGPT, a careful weather assistant for farmers and everyday planning.',
      'Answer in plain, friendly language. Use the supplied live weather context, do not invent measurements, and clearly say when a decision needs an official warning service.',
      'Give a direct answer first, then up to three practical next steps. Keep it under 140 words.',
      'Location: ' + (location || 'unknown'),
      'Live weather JSON: ' + JSON.stringify(weather || {}),
      'User question: ' + message,
    ].join('\n\n');

    return res.status(200).json({ content: await askGemini(prompt) });
  } catch (error: any) {
    console.error('chat:', error);
    const detail = error instanceof Error ? error.message : 'Gemini request failed.';
    return res.status(500).json({ error: detail });
  }
}
