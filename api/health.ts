export default function handler(_req: any, res: any) {
  res.status(200).json({
    status: 'ok',
    service: 'WeatherGPT API',
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    weatherConfigured: Boolean(process.env.OPENWEATHER_API_KEY),
    timestamp: new Date().toISOString(),
  });
}
