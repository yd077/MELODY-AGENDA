import { useState } from 'react';
import { LogIn } from 'lucide-react';

interface LoginButtonProps {
  onLogin: () => void;
}

export function LoginButton({ onLogin }: LoginButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/google/url');
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
         const text = await response.text();
         console.error('Received non-JSON response:', text);
         throw new Error('Received unexpected response from server. Please try again.');
      }

      const { url } = await response.json();
      
      // Open popup
      const width = 500;
      const height = 600;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const popup = window.open(
        url,
        'google_oauth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        alert('Please allow popups for this site');
        setLoading(false);
        return;
      }

      // Listen for message from popup
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
          window.removeEventListener('message', handleMessage);
          popup.close();
          onLogin();
        }
      };
      
      window.addEventListener('message', handleMessage);
      
      // Poll to check if popup closed manually
      const timer = setInterval(() => {
        if (popup.closed) {
          clearInterval(timer);
          setLoading(false);
          window.removeEventListener('message', handleMessage);
        }
      }, 1000);

    } catch (error) {
      console.error('Login failed:', error);
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogin}
      disabled={loading}
      className="flex items-center gap-3 px-8 py-4 bg-stone-900 text-white rounded-full hover:bg-stone-800 hover:shadow-lg hover:shadow-stone-900/20 transition-all disabled:opacity-50 disabled:shadow-none font-medium text-base tracking-wide"
    >
      <LogIn className="w-5 h-5" />
      {loading ? 'Connexion en cours...' : 'Connexion Google Agenda'}
    </button>
  );
}
