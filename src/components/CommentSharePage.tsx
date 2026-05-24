// src/components/CommentSharePage.tsx
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import CommentService, { PublicCommentBundle } from '../helpers/CommentService';

export default function CommentSharePage() {
  const { fullname } = useParams<{ fullname: string }>();
  const { isLight } = useTheme();
  const [bundle, setBundle] = useState<PublicCommentBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!fullname) return;
    CommentService.getPublicComment(fullname)
      .then(setBundle)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [fullname]);

  return (
    <div className={`min-h-screen flex flex-col ${isLight ? 'bg-white' : 'bg-[var(--theme-bg)]'}`}>
      <header className={`px-6 py-4 border-b ${isLight ? 'border-gray-200' : 'border-white/10'}`}>
        <Link
          to="/"
          className={`text-lg font-bold no-underline ${
            isLight ? 'text-orange-600' : 'text-[var(--theme-primary)]'
          }`}
        >
          reddzit
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12 transition-colors duration-300">
        {loading ? (
          <div className="w-8 h-8 border-4 border-current border-t-transparent rounded-full animate-spin opacity-50" />
        ) : error || !bundle ? (
          <div className="text-center">
            <p className={`text-lg mb-4 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
              Comment not found
            </p>
            <Link
              to="/"
              className={`text-sm font-medium no-underline ${
                isLight ? 'text-orange-600 hover:text-orange-700' : 'text-[var(--theme-primary)] hover:opacity-80'
              }`}
            >
              Go to Reddzit
            </Link>
          </div>
        ) : (
          <div className="max-w-2xl w-full">
            {/* Success view added in Task 3 */}
            <pre className="text-xs opacity-60">{JSON.stringify(bundle, null, 2)}</pre>
          </div>
        )}
      </main>
    </div>
  );
}
