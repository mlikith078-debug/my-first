# WeatherGPT system architecture

## 1. What exists today

WeatherGPT is a Vite + React web application deployed as a static frontend on Vercel. Its backend is made of Vercel serverless functions. There is no database, login system, or always-running server in the current version.

Main layers:

    Browser UI
        |
        | HTTPS fetch requests
        v
    Vercel serverless API functions
        |
        +--> OpenWeather API
        |
        +--> Gemini API
        |
        v
    Normalized forecast, AI advice, and in-app alerts

The browser never receives either API key. OPENWEATHER_API_KEY and GEMINI_API_KEY are read only by server-side Vercel functions.

## 2. Beginning-to-end weather flow

1. A user opens the deployed Vercel URL.
2. Vercel serves the Vite build from the dist directory.
3. App.tsx starts with Mumbai as the default location.
4. The browser calls:

       GET /api/weather?lat=19.076&lon=72.8777&name=Mumbai

5. Vercel runs api/weather.ts.
6. api/weather.ts validates latitude and longitude.
7. It calls lib/weather.ts.
8. lib/weather.ts reads OPENWEATHER_API_KEY from the Vercel environment.
9. It requests two OpenWeather endpoints in parallel:

       /data/2.5/weather
       /data/2.5/forecast

10. The service converts OpenWeather's response into a stable WeatherPayload used by the frontend.
11. It converts wind from metres per second to km/h, rounds temperatures, groups forecast points by day, and formats India time.
12. It derives a rain signal from the next eight 3-hour forecast points, approximately the next 24 hours.
13. The API returns JSON to the browser.
14. App.tsx stores the response in React state and renders the current weather, hourly forecast, forecast cards, and alerts.

## 3. Location search flow

1. The user types a city or village.
2. App.tsx waits briefly so it does not call the API for every keystroke.
3. The browser calls:

       GET /api/geocode?q=Nashik

4. api/geocode.ts validates the query.
5. lib/weather.ts calls the OpenWeather geocoding endpoint.
6. The server returns location name, state, country, latitude, and longitude.
7. The user selects a result.
8. App.tsx calls /api/weather again using the selected coordinates.

## 4. Rain-alert process

The current application creates in-app alerts when weather data is requested. There is no background notification worker yet.

The current rules are:

- Rain watch: total forecast rain in the next 24 hours is at least 25 mm, or any forecast point has at least an 80 percent precipitation probability.
- Wind advisory: current wind is at least 35 km/h.
- Informational status: neither condition is present.

The alert is returned as part of the weather response:

    weather.alerts[]

The dashboard shows a warning badge on Rain alerts and renders the alert card. These are forecast-derived decision aids, not official emergency warnings.

Important limitation: because the current app has no scheduler, it only recalculates alerts when the user opens the app, changes location, refreshes weather, or requests a crop plan.

## 5. WeatherGPT chat flow

1. The user types a question such as: Will it rain before 6pm?
2. App.tsx sends a POST request to /api/chat with:

       {
         message,
         weather,
         location
       }

3. api/chat.ts validates the message.
4. It builds a controlled prompt containing the current location and live weather JSON.
5. It calls lib/gemini.ts.
6. lib/gemini.ts reads GEMINI_API_KEY server-side and calls the Gemini generateContent endpoint.
7. Gemini receives instructions to use only the supplied weather context, avoid invented measurements, keep the answer short, and recommend official warnings when appropriate.
8. The server returns the answer text.
9. App.tsx displays it in the WeatherGPT answer panel.

## 6. Crop-decision flow

1. The user opens Crop decisions and selects a crop.
2. The browser sends:

       POST /api/agriculture

       {
         crop,
         location,
         lat,
         lon
       }

3. api/agriculture.ts fetches a fresh forecast using lib/weather.ts. This prevents crop advice from relying only on stale browser state.
4. It builds an agronomy prompt containing the crop and normalized weather forecast.
5. Gemini is asked for structured JSON with:

   - headline
   - irrigation
   - spraying
   - fieldWork
   - risk
   - checklist

6. The server parses the response.
7. If Gemini's response is unavailable or malformed, the endpoint returns deterministic fallback advice based on forecast rain.
8. App.tsx renders the field plan.

The crop feature is weather decision support. It does not predict guaranteed yield and does not replace a local agronomist, soil test, or official agricultural advisory.

## 7. Deployment and runtime process

1. GitHub stores the source code.
2. Vercel imports the repository and installs dependencies.
3. Vercel runs npm run build.
4. Vite compiles the React frontend into dist.
5. Vercel serves the static frontend globally.
6. Files in api/ become serverless API functions.
7. Each API request starts or reuses a short-lived Vercel function.
8. The function reads server-side environment variables and calls external providers.
9. The function returns JSON to the frontend.
10. Vercel logs function errors and request output for debugging.

Required Vercel environment variables:

    OPENWEATHER_API_KEY=your_key
    GEMINI_API_KEY=your_key

Do not use the VITE_ prefix. A VITE_ variable is intended for browser-exposed frontend configuration and would be unsafe for private API keys.

## 8. Current API contract

GET /api/weather

Query parameters: lat, lon, name
Returns: location, current, hourly, daily, alerts, fetchedAt

GET /api/geocode

Query parameter: q
Returns: an array of matching places

POST /api/chat

Body: message, weather, location
Returns: content

POST /api/agriculture

Body: crop, location, lat, lon
Returns: crop, headline, irrigation, spraying, fieldWork, risk, checklist

## 9. Error handling

- Missing coordinates return HTTP 400.
- Missing API keys produce a server error rather than exposing the key.
- OpenWeather failures are caught by the API functions and returned as a user-safe error.
- Gemini failures show a clear configuration message.
- Crop advice has a deterministic fallback when Gemini output cannot be parsed.
- The frontend displays a retry action for weather errors.

## 10. What is not implemented yet

The current system does not yet include:

- User accounts
- Saved locations
- A database
- Alert subscriptions
- Cron or scheduled forecast checks
- SMS, WhatsApp, email, or mobile push delivery
- Official IMD alert ingestion
- Per-user alert thresholds
- Alert history or audit logs
- Rate limiting and abuse protection
- Automated tests and observability dashboards

## 11. Architecture for automatic rain notifications

To send alerts even when the user is not looking at the website, the next production layer should be:

    User account and alert settings
             |
             v
    Database: locations, subscriptions, alert history
             |
             v
    Scheduled job every 15 to 60 minutes
             |
             v
    OpenWeather forecast check
             |
             v
    Alert rules + duplicate suppression
             |
             v
    Notification provider
       |          |          |
      Email      SMS       Push

Recommended process:

1. User signs in and saves a location.
2. User chooses a threshold, for example rain probability above 70 percent or rain above 10 mm.
3. A scheduled job loads active subscriptions.
4. It fetches the latest forecast for each location.
5. It compares the forecast to each user's threshold.
6. It creates an alert event only when the condition changes or a cooldown has expired.
7. It sends the message through email, SMS, WhatsApp, or web push.
8. It records delivery status and prevents duplicate notifications.
9. The dashboard reads alert history from the database.

This is the difference between the current in-app alert and a true automatic rain-alert system.

## 12. Recommended next build phase

For the next version, add these in order:

1. PostgreSQL database for users, saved locations, subscriptions, and alert history.
2. Authentication so alert settings belong to a user.
3. Scheduled job for periodic forecast checks.
4. Email or SMS provider for notifications.
5. Official severe-weather feed for authoritative warnings.
6. Rate limiting, request validation, and provider retry policies.
7. Automated tests for weather normalization and alert rules.
8. Monitoring for API latency, provider failures, and notification delivery.

The current Vercel serverless design is a good first release because it stays simple and inexpensive. The database and scheduler should be introduced when automatic notifications and multiple users become necessary.
