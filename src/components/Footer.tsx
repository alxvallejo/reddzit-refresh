import { Link } from 'react-router-dom';
import { useReddit } from '../context/RedditContext';

export default function Footer() {
  const { signedIn, redirectForAuth } = useReddit();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--theme-border)] mt-16 pb-28 pt-12 px-4">
      <div className="max-w-3xl mx-auto flex flex-col items-center gap-6 text-center">
        <div className="flex flex-col items-center gap-2">
          <img src="/favicon.png" alt="Reddzit" className="w-10 h-10 drop-shadow-sm" />
          <span className="text-lg font-serif font-bold text-[var(--theme-text)]">
            Reddzit
          </span>
          <span className="text-xs text-[var(--theme-textMuted)] opacity-70 max-w-xs">
            A distraction-free reader for Reddit.
          </span>
        </div>

        {!signedIn && (
          <button
            onClick={redirectForAuth}
            className="px-6 py-2.5 rounded-full text-sm font-semibold transition-colors border-none cursor-pointer bg-[var(--theme-primary)] text-[#262129] hover:opacity-90"
          >
            Connect with Reddit
          </button>
        )}

        <nav className="flex items-center gap-3 text-xs text-[var(--theme-textMuted)]">
          <Link
            to="/about"
            className="no-underline text-inherit hover:text-[var(--theme-primary)] transition-colors"
          >
            About
          </Link>
          <span className="opacity-30">·</span>
          <Link
            to="/privacy"
            className="no-underline text-inherit hover:text-[var(--theme-primary)] transition-colors"
          >
            Privacy
          </Link>
          <span className="opacity-30">·</span>
          <Link
            to="/about#feedback"
            className="no-underline text-inherit hover:text-[var(--theme-primary)] transition-colors"
          >
            Feedback
          </Link>
        </nav>

        <p className="text-[10px] text-[var(--theme-textMuted)] opacity-50">
          © {year} Reddzit
        </p>
      </div>
    </footer>
  );
}
