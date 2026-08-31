# WeatherGPT deployment

## 1. Add the secrets in Vercel

In Vercel, import this GitHub repository and add these Environment Variables for Production, Preview, and Development:

- OPENWEATHER_API_KEY — your OpenWeather API key
- GEMINI_API_KEY — your Google Gemini API key

Do not add the VITE_ prefix. These keys are used only by the Vercel API functions and are never sent to the browser.

## 2. Disable deployment protection for a public app

For a public website, open Vercel Project Settings → Deployment Protection and turn off Vercel Authentication/Deployment Protection. If it remains enabled, browser requests to /api/* are redirected to a Vercel login HTML page instead of receiving JSON.

## 3. Build settings

Vercel should detect Vite automatically. If it asks:

- Framework Preset: Vite
- Build Command: npm run build
- Output Directory: dist
- Install Command: npm install

Then click Deploy.

## 4. Test the deployed app

First open /api/health on the deployment URL. It must return JSON with status: ok.

Then check:

1. Mumbai weather loads on the home screen.
2. Searching another city shows OpenWeather locations.
3. Ask WeatherGPT works after GEMINI_API_KEY is added.
4. Crop decisions returns a field plan after selecting a crop.
5. Rain alerts show the next 24-hour rain signal.

For local development, use npm run dev for the frontend. To test Vercel API functions locally, use npx vercel dev after installing the Vercel CLI.

Weather guidance is decision support, not an official emergency warning. Verify severe-weather notices with your local meteorological authority.
