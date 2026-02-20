/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { LoginButton } from './components/LoginButton';
import { EventList } from './components/EventList';
import { Calendar as CalendarIcon, LogOut, Loader2 } from 'lucide-react';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; details?: string; link?: string } | null>(null);

  const [redirectUri, setRedirectUri] = useState<string>('');

  useEffect(() => {
    checkAuthStatus();
    fetch('/api/auth/config')
      .then(res => {
         const contentType = res.headers.get('content-type');
         if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Invalid response');
         }
         return res.json();
      })
      .then(data => setRedirectUri(data.redirectUri))
      .catch(err => console.error('Failed to fetch auth config:', err));
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchEvents();
    }
  }, [isAuthenticated]);

  const checkAuthStatus = async () => {
    try {
      const res = await fetch('/api/auth/status');
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
         throw new Error('Invalid response');
      }
      const data = await res.json();
      setIsAuthenticated(data.isAuthenticated);
    } catch (err) {
      console.error('Failed to check auth status:', err);
      setIsAuthenticated(false);
    }
  };

  const fetchEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/calendar/events');
      if (res.status === 401) {
        setIsAuthenticated(false);
        return;
      }
      
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
         const text = await res.text();
         console.error('Received non-JSON response:', text);
         throw new Error('Received unexpected response from server. Please try again.');
      }
      
      const data = await res.json();

      if (!res.ok) {
         if (data.error && data.details) {
             throw { message: data.error, details: data.details, link: data.link };
         }
         throw new Error(data.error || 'Failed to fetch events');
      }

      setEvents(data);
    } catch (err: any) {
      console.error(err);
      if (err.message && err.details) {
          setError(err);
      } else {
          setError({ message: err.message || 'Failed to load events. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setIsAuthenticated(false);
      setEvents([]);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">My Calendar</h1>
          </div>
          
          {isAuthenticated && (
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-gray-100 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isAuthenticated ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
              <CalendarIcon className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Connect your Google Calendar
            </h2>
            <p className="text-gray-500 max-w-md mb-8">
              Sign in to view your upcoming events, meetings, and schedule in a clean, minimal interface.
            </p>
            <LoginButton onLogin={() => setIsAuthenticated(true)} />
            
            <div className="mt-12 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-left max-w-md text-sm text-yellow-800">
              <p className="font-semibold mb-2">Setup Required:</p>
              <ol className="list-decimal list-inside space-y-2 mb-2">
                <li>Create OAuth credentials in Google Cloud Console.</li>
                <li>Add this <strong>Redirect URI</strong>:
                  <div className="mt-1 p-2 bg-white border border-yellow-300 rounded font-mono text-xs break-all select-all">
                    {redirectUri || 'Loading...'}
                  </div>
                </li>
                <li>Set <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> in AI Studio Secrets.</li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Upcoming Events</h2>
              <button 
                onClick={fetchEvents}
                disabled={loading}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
                <p className="font-semibold">{error.message}</p>
                {error.details && <p className="mt-1">{error.details}</p>}
                {error.link && (
                    <a href={error.link} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-blue-600 hover:underline">
                        Enable API in Google Cloud Console &rarr;
                    </a>
                )}
              </div>
            )}

            {loading && events.length === 0 ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <EventList events={events} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

