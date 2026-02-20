import express from 'express';
import { createServer as createViteServer } from 'vite';
import cookieParser from 'cookie-parser';
import { google } from 'googleapis';

const app = express();
const PORT = 3000;

// Middleware
app.use(cookieParser());
app.use(express.json());

// Request Logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// OAuth Configuration
const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];

function getOAuthClient() {
  const appUrl = process.env.APP_URL?.replace(/\/$/, '') || '';
  const redirectUri = `${appUrl}/auth/callback`;
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
}

// API Routes

// 1. Get Auth URL
app.get('/api/auth/google/url', (req, res) => {
  try {
    const oauth2Client = getOAuthClient();
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Request refresh token
      scope: SCOPES,
      prompt: 'consent', // Force consent to ensure refresh token is returned
    });
    res.json({ url });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ error: 'Failed to generate auth URL' });
  }
});

// 2. Auth Callback (Handled by server, but triggered by popup redirect)
// This route exchanges code for tokens and sets a cookie
app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  
  if (!code || typeof code !== 'string') {
    return res.status(400).send('Missing code');
  }

  try {
    const oauth2Client = getOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    
    // Store tokens in a secure HTTP-only cookie
    // In a real production app, store refresh token in DB and access token in cookie/memory
    // For this demo, we'll store the access token in a cookie.
    // We are setting it on the response that renders the popup closer.
    
    // Note: 'SameSite=None; Secure' is REQUIRED for the iframe environment
    res.cookie('google_access_token', tokens.access_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 3600 * 1000, // 1 hour
    });

    if (tokens.refresh_token) {
       res.cookie('google_refresh_token', tokens.refresh_token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 30 * 24 * 3600 * 1000, // 30 days
      });
    }

    // Send success message to opener and close popup
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. You can close this window.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error exchanging token:', error);
    res.status(500).send('Authentication failed');
  }
});

// 3. Get Calendar Events (Proxy)
app.get('/api/calendar/events', async (req, res) => {
  const accessToken = req.cookies.google_access_token;
  const refreshToken = req.cookies.google_refresh_token;

  if (!accessToken && !refreshToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    // If access token is missing but we have refresh token, refresh it
    // The googleapis library handles this automatically if credentials are set,
    // but we might need to manually refresh if the access token cookie is expired/missing
    // but the refresh token cookie is present.
    // However, googleapis `getToken` earlier returned both.
    // Let's rely on the client instance.
    
    // Manually handling refresh if needed is safer
    if (!accessToken && refreshToken) {
        const { credentials } = await oauth2Client.refreshAccessToken();
        // Update cookie
        res.cookie('google_access_token', credentials.access_token, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 3600 * 1000,
        });
    }

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults: 20,
      singleEvents: true,
      orderBy: 'startTime',
    });

    res.json(response.data.items);
  } catch (error: any) {
    console.error('Error fetching events:', error);

    // Check for API not enabled error
    if (error.message && (error.message.includes('API has not been used') || error.message.includes('is disabled'))) {
       // Use 409 Conflict to avoid potential proxy interception of 403 responses
       return res.status(409).json({ 
         error: 'Google Calendar API is not enabled',
         details: 'Please enable the Google Calendar API in your Google Cloud Console project.',
         link: 'https://console.developers.google.com/apis/api/calendar-json.googleapis.com/overview'
       });
    }

    if (error.code === 401 || error.response?.status === 401) {
        res.clearCookie('google_access_token', { sameSite: 'none', secure: true });
        res.clearCookie('google_refresh_token', { sameSite: 'none', secure: true });
        return res.status(401).json({ error: 'Authentication expired' });
    }

    // Handle other 403 errors (e.g. insufficient permissions)
    if (error.code === 403 || error.response?.status === 403) {
        return res.status(409).json({
            error: 'Access Denied',
            details: error.message || 'You do not have permission to access this calendar.',
        });
    }

    res.status(500).json({ 
        error: 'Failed to fetch events',
        details: error.message 
    });
  }
});

// 4. Check Auth Status
app.get('/api/auth/status', (req, res) => {
  const isAuthenticated = !!req.cookies.google_access_token || !!req.cookies.google_refresh_token;
  res.json({ isAuthenticated });
});

// 5. Logout
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('google_access_token', { sameSite: 'none', secure: true });
  res.clearCookie('google_refresh_token', { sameSite: 'none', secure: true });
  res.json({ success: true });
});


// 6. Get OAuth Config (for UI instructions)
app.get('/api/auth/config', (req, res) => {
  const appUrl = process.env.APP_URL?.replace(/\/$/, '') || '';
  const redirectUri = `${appUrl}/auth/callback`;
  res.json({ redirectUri });
});

// API 404 Handler
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Global Error Handler (Must be before Vite middleware)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// Vite Middleware (Must be last)
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve static files from dist
    // (This part is handled by the container usually, but good to have for completeness if we were building)
    // For this environment, we rely on Vite middleware in dev, 
    // but if we were to build, we'd serve static.
    // Since we are in "dev" mode mostly here:
    // app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
