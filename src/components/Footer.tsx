import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useReddit } from '../context/RedditContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import API_BASE_URL from '../config/api';

export default function Footer() {
  const { isLight } = useTheme();
  const { signedIn, redirectForAuth } = useReddit();
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || status === 'sending') return;

    setStatus('sending');
    try {
      const res = await fetch(`${API_BASE_URL}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim(), page: window.location.pathname }),
      });
      if (!res.ok) throw new Error();
      setMessage('');
      setStatus('sent');
      setTimeout(() => setStatus('idle'), 3000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <footer className={`border-t mt-16 pb-28 pt-10 px-4 ${
      isLight ? 'border-gray-200' : 'border-white/10'
    }`}>
      <div className="max-w-2xl mx-auto flex flex-col items-center gap-4">
        {/* Sign-in CTA for unauthenticated users */}
        {!signedIn && (
          <div className="flex flex-col items-center gap-4 mb-8">
            <img src="/favicon.png" alt="Reddzit" className="w-12 h-12" />
            <p className={`text-sm text-center max-w-sm ${
              isLight ? 'text-gray-500' : 'text-white/50'
            }`}>
              Sign in to manage your saved Reddit posts in a clean, distraction-free reader.
            </p>
            <button
              onClick={redirectForAuth}
              className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-colors border-none cursor-pointer bg-[var(--theme-primary)] ${
                isLight
                  ? 'text-white hover:bg-orange-700'
                  : 'text-[#262129] hover:opacity-90'
              }`}
            >
              Connect with Reddit
            </button>
          </div>
        )}
        <p className={`text-xs tracking-wide ${
          isLight ? 'text-gray-400' : 'text-white/30'
        }`}>
          Leave a quick feedback comment
        </p>

        <form onSubmit={handleSubmit} className="flex w-full max-w-md gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What's on your mind?"
            maxLength={2000}
            disabled={status === 'sending'}
            className={`flex-1 px-4 py-2 rounded-full text-sm border focus:outline-none focus:ring-1 transition-colors ${
              isLight
                ? 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-gray-300 focus:border-gray-300'
                : 'bg-white/5 border-white/10 text-white placeholder-white/30 focus:ring-white/20 focus:border-white/20'
            }`}
          />
          <button
            type="submit"
            disabled={!message.trim() || status === 'sending'}
            className={`px-4 py-2 rounded-full text-sm font-medium border-none cursor-pointer transition-all disabled:opacity-30 disabled:cursor-default ${
              isLight
                ? 'bg-gray-900 text-white hover:bg-gray-800'
                : 'bg-white/15 text-white hover:bg-white/25'
            }`}
          >
            {status === 'sending' ? (
              <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <FontAwesomeIcon icon={faPaperPlane} />
            )}
          </button>
        </form>

        {status === 'sent' && (
          <p className={`text-xs ${isLight ? 'text-green-600' : 'text-green-400'}`}>
            Thanks for your feedback!
          </p>
        )}
        {status === 'error' && (
          <p className={`text-xs ${isLight ? 'text-red-500' : 'text-red-400'}`}>
            Something went wrong. Try again.
          </p>
        )}

        <p className={`text-[10px] mt-2 ${
          isLight ? 'text-gray-300' : 'text-white/15'
        }`}>
          Reddzit
        </p>
      </div>
    </footer>
  );
}
