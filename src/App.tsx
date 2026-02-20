/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { LoginButton } from './components/LoginButton';
import { EventList } from './components/EventList';
import { Calendar as CalendarIcon, LogOut, Loader2, Scissors } from 'lucide-react';

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
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
            <Scissors className="w-5 h-5 text-stone-900" />
          </div>
          <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans selection:bg-stone-200">
      <header className="bg-white/80 backdrop-blur-md border-b border-stone-100 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-stone-900 rounded-xl flex items-center justify-center text-white shadow-lg shadow-stone-900/10">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight leading-none">Melody Coiffure</h1>
              <p className="text-xs text-stone-500 font-medium tracking-wide uppercase mt-0.5">Agenda</p>
            </div>
          </div>
          
          {isAuthenticated && (
            <button
              onClick={handleLogout}
              className="text-sm font-medium text-stone-500 hover:text-stone-900 flex items-center gap-2 px-4 py-2 rounded-full hover:bg-stone-100 transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {!isAuthenticated ? (
          <div className="flex flex-col items-center justify-center py-12 sm:py-24 text-center max-w-2xl mx-auto">
            <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mb-8 shadow-xl shadow-stone-200/50 rotate-3 transform transition-transform hover:rotate-0 duration-500">
              <CalendarIcon className="w-10 h-10 text-stone-900" />
            </div>
            <h2 className="text-4xl sm:text-5xl font-semibold text-stone-900 mb-6 tracking-tight">
              Gérez vos rendez-vous <br/> en toute simplicité
            </h2>
            <p className="text-lg text-stone-500 max-w-lg mb-10 leading-relaxed">
              Connectez votre Google Agenda pour visualiser vos prochains rendez-vous et envoyer des confirmations SMS en un clic.
            </p>
            <div className="transform hover:scale-105 transition-transform duration-300">
              <LoginButton onLogin={() => setIsAuthenticated(true)} />
            </div>
            
            <div className="mt-16 p-6 bg-white border border-stone-100 rounded-2xl text-left w-full max-w-lg shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                <p className="font-medium text-sm text-stone-900 uppercase tracking-wide">Configuration Requise</p>
              </div>
              <ol className="list-decimal list-inside space-y-3 text-sm text-stone-600">
                <li>Créez vos identifiants OAuth dans Google Cloud Console.</li>
                <li>Ajoutez cette <strong>URI de redirection</strong> :
                  <div className="mt-2 p-3 bg-stone-50 border border-stone-200 rounded-lg font-mono text-xs break-all select-all text-stone-800">
                    {redirectUri || 'Chargement...'}
                  </div>
                </li>
                <li>Configurez <code>GOOGLE_CLIENT_ID</code> et <code>GOOGLE_CLIENT_SECRET</code> dans AI Studio.</li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-stone-900">Prochains Rendez-vous</h2>
                <p className="text-stone-500 mt-1">Gérez vos clients et confirmations</p>
              </div>
              <button 
                onClick={fetchEvents}
                disabled={loading}
                className="text-sm font-medium text-stone-900 bg-white border border-stone-200 hover:bg-stone-50 hover:border-stone-300 px-5 py-2.5 rounded-full transition-all disabled:opacity-50 shadow-sm"
              >
                {loading ? 'Actualisation...' : 'Actualiser'}
              </button>
            </div>

            {error && (
              <div className="p-5 bg-red-50 text-red-900 rounded-2xl text-sm border border-red-100 flex flex-col gap-2">
                <p className="font-semibold text-base">{error.message}</p>
                {error.details && <p className="opacity-90">{error.details}</p>}
                {error.link && (
                    <a href={error.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium hover:underline mt-1">
                        Activer l'API <ExternalLink className="w-3 h-3" />
                    </a>
                )}
              </div>
            )}

            {loading && events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-stone-400">
                <Loader2 className="w-10 h-10 animate-spin mb-4" />
                <p className="text-sm font-medium">Chargement de votre agenda...</p>
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

// Helper component for error link
function ExternalLink({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
      <polyline points="15 3 21 3 21 9"></polyline>
      <line x1="10" y1="14" x2="21" y2="3"></line>
    </svg>
  )
}


