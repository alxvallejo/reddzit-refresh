import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useReddit } from '../context/RedditContext';
import axios from 'axios';
import API_BASE_URL from '../config/api';

interface Stats {
  users: {
    total: number;
    pro: number;
    free: number;
    newThisWeek: number;
  };
  content: {
    globalBriefings: number;
    discoverReports: number;
  };
}

interface User {
  id: number;
  redditId: string;
  redditUsername: string;
  isPro: boolean;
  proExpiresAt: string | null;
  isAdmin: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  _count: {
    categorySelections: number;
    subredditToggles: number;
    discoverReports: number;
  };
}

interface Briefing {
  id: number;
  briefingTime: string;
  status: string;
  title: string;
  executiveSummary: string;
  generatedAt: string;
  publishedAt: string | null;
  _count: {
    stories: number;
  };
}

const Admin = () => {
  const { themeName } = useTheme();
  const { user } = useReddit();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'briefings'>('stats');

  // Auth header
  const getAuthHeaders = useCallback(() => ({
    'X-Admin-Password': password,
    'X-Reddit-Username': user?.name || '',
  }), [password, user?.name]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await axios.get<Stats>(`${API_BASE_URL}/api/admin/stats`, {
        headers: getAuthHeaders(),
      });
      setStats(response.data);
      setAuthenticated(true);
      setError(null);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        setAuthenticated(false);
        setError('Invalid credentials');
      } else {
        setError('Failed to fetch stats');
      }
    }
  }, [getAuthHeaders]);

  // Fetch users
  const fetchUsers = useCallback(async (search = '') => {
    setLoading(true);
    try {
      const response = await axios.get<{ users: User[] }>(
        `${API_BASE_URL}/api/admin/users?search=${encodeURIComponent(search)}`,
        { headers: getAuthHeaders() }
      );
      setUsers(response.data.users);
    } catch {
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  // Fetch briefings
  const fetchBriefings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get<{ briefings: Briefing[] }>(
        `${API_BASE_URL}/api/admin/briefings`,
        { headers: getAuthHeaders() }
      );
      setBriefings(response.data.briefings);
    } catch {
      setError('Failed to fetch briefings');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  // Toggle Pro status
  const togglePro = async (redditId: string, currentPro: boolean) => {
    try {
      await axios.post(
        `${API_BASE_URL}/api/admin/users/${redditId}/pro`,
        { isPro: !currentPro },
        { headers: getAuthHeaders() }
      );
      fetchUsers(userSearch);
    } catch {
      setError('Failed to update Pro status');
    }
  };

  // Regenerate briefing
  const regenerateBriefing = async (id: number) => {
    try {
      await axios.post(
        `${API_BASE_URL}/api/admin/briefings/${id}/regenerate`,
        {},
        { headers: getAuthHeaders() }
      );
      alert('Briefing regeneration started');
      fetchBriefings();
    } catch {
      setError('Failed to regenerate briefing');
    }
  };

  // Auth attempt
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetchStats();
  };

  // Load data when authenticated
  useEffect(() => {
    if (authenticated) {
      if (activeTab === 'users') fetchUsers(userSearch);
      if (activeTab === 'briefings') fetchBriefings();
    }
  }, [authenticated, activeTab, fetchUsers, fetchBriefings, userSearch]);

  // Format date
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleString();
  };

  // Login form
  if (!authenticated) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${
        themeName === 'light' ? 'bg-gray-100' : 'bg-[var(--theme-bg)]'
      }`}>
        <form onSubmit={handleLogin} className={`p-8 rounded-2xl shadow-lg max-w-sm w-full ${
          themeName === 'light' ? 'bg-white' : 'bg-[var(--theme-cardBg)]'
        }`}>
          <h1 className={`text-2xl font-bold mb-6 ${
            themeName === 'light' ? 'text-gray-900' : 'text-white'
          }`}>Admin Login</h1>
          
          {error && (
            <div className="mb-4 p-3 rounded bg-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}
          
          <input
            type="password"
            placeholder="Admin Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`w-full p-3 rounded-lg mb-4 border ${
              themeName === 'light'
                ? 'bg-gray-50 border-gray-200 text-gray-900'
                : 'bg-white/5 border-white/10 text-white'
            }`}
          />
          
          <button
            type="submit"
            className={`w-full py-3 rounded-lg font-semibold transition ${
              themeName === 'light'
                ? 'bg-orange-600 text-white hover:bg-orange-700'
                : 'bg-[var(--theme-primary)] text-[#262129] hover:opacity-90'
            }`}
          >
            Login
          </button>
          
          <button
            type="button"
            onClick={() => navigate('/')}
            className={`w-full mt-4 py-2 text-sm ${
              themeName === 'light' ? 'text-gray-500' : 'text-gray-400'
            }`}
          >
            ← Back to Home
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-4 md:p-8 ${
      themeName === 'light' ? 'bg-gray-100' : 'bg-[var(--theme-bg)]'
    }`}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className={`text-3xl font-bold ${
            themeName === 'light' ? 'text-gray-900' : 'text-white'
          }`}>Admin Dashboard</h1>
          <button
            onClick={() => navigate('/')}
            className={`text-sm px-4 py-2 rounded-lg ${
              themeName === 'light'
                ? 'text-gray-600 hover:bg-gray-200'
                : 'text-gray-300 hover:bg-white/10'
            }`}
          >
            ← Back
          </button>
        </div>

        {/* Tabs */}
        <div className={`flex gap-1 p-1 rounded-xl mb-8 ${
          themeName === 'light' ? 'bg-gray-200' : 'bg-white/5'
        }`}>
          {(['stats', 'users', 'briefings'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                activeTab === tab
                  ? themeName === 'light'
                    ? 'bg-white text-orange-600 shadow'
                    : 'bg-[var(--theme-primary)] text-[#262129]'
                  : themeName === 'light'
                    ? 'text-gray-600 hover:text-gray-900'
                    : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/20 text-red-400">
            {error}
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && stats && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Users"
              value={stats.users.total}
              themeName={themeName}
            />
            <StatCard
              title="Pro Users"
              value={stats.users.pro}
              themeName={themeName}
              highlight
            />
            <StatCard
              title="New This Week"
              value={stats.users.newThisWeek}
              themeName={themeName}
            />
            <StatCard
              title="Global Briefings"
              value={stats.content.globalBriefings}
              themeName={themeName}
            />
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search users..."
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  fetchUsers(e.target.value);
                }}
                className={`w-full md:w-64 p-3 rounded-lg border ${
                  themeName === 'light'
                    ? 'bg-white border-gray-200 text-gray-900'
                    : 'bg-white/5 border-white/10 text-white'
                }`}
              />
            </div>
            
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <div className={`rounded-xl overflow-hidden ${
                themeName === 'light' ? 'bg-white shadow' : 'bg-white/5'
              }`}>
                <table className="w-full">
                  <thead>
                    <tr className={
                      themeName === 'light' ? 'bg-gray-50 text-gray-600' : 'bg-white/5 text-gray-400'
                    }>
                      <th className="text-left p-4 font-semibold">Username</th>
                      <th className="text-left p-4 font-semibold hidden md:table-cell">Joined</th>
                      <th className="text-center p-4 font-semibold">Reports</th>
                      <th className="text-center p-4 font-semibold">Pro</th>
                      <th className="text-right p-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className={
                        themeName === 'light' ? 'border-t border-gray-100' : 'border-t border-white/5'
                      }>
                        <td className={`p-4 font-medium ${
                          themeName === 'light' ? 'text-gray-900' : 'text-white'
                        }`}>
                          u/{u.redditUsername}
                          {u.isAdmin && (
                            <span className="ml-2 text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">
                              Admin
                            </span>
                          )}
                        </td>
                        <td className={`p-4 text-sm hidden md:table-cell ${
                          themeName === 'light' ? 'text-gray-500' : 'text-gray-400'
                        }`}>
                          {formatDate(u.createdAt)}
                        </td>
                        <td className={`p-4 text-center ${
                          themeName === 'light' ? 'text-gray-700' : 'text-gray-300'
                        }`}>
                          {u._count.discoverReports}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            u.isPro
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {u.isPro ? 'Pro' : 'Free'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => togglePro(u.redditId, u.isPro)}
                            className={`text-sm px-3 py-1 rounded-lg transition ${
                              u.isPro
                                ? 'text-red-400 hover:bg-red-500/20'
                                : themeName === 'light'
                                  ? 'text-green-600 hover:bg-green-50'
                                  : 'text-green-400 hover:bg-green-500/20'
                            }`}
                          >
                            {u.isPro ? 'Remove Pro' : 'Grant Pro'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Briefings Tab */}
        {activeTab === 'briefings' && (
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              briefings.map((b) => (
                <div
                  key={b.id}
                  className={`p-6 rounded-xl ${
                    themeName === 'light' ? 'bg-white shadow' : 'bg-white/5'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className={`font-bold text-lg ${
                        themeName === 'light' ? 'text-gray-900' : 'text-white'
                      }`}>
                        {b.title}
                      </h3>
                      <p className={`text-sm ${
                        themeName === 'light' ? 'text-gray-500' : 'text-gray-400'
                      }`}>
                        {formatDate(b.briefingTime)} · {b._count.stories} stories
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        b.status === 'PUBLISHED'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {b.status}
                      </span>
                      <button
                        onClick={() => regenerateBriefing(b.id)}
                        className={`text-sm px-3 py-1 rounded-lg transition ${
                          themeName === 'light'
                            ? 'text-orange-600 hover:bg-orange-50'
                            : 'text-[var(--theme-primary)] hover:bg-white/10'
                        }`}
                      >
                        ↻ Regenerate
                      </button>
                    </div>
                  </div>
                  {b.executiveSummary && (
                    <p className={`text-sm line-clamp-2 ${
                      themeName === 'light' ? 'text-gray-600' : 'text-gray-400'
                    }`}>
                      {b.executiveSummary.slice(0, 200)}...
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Stat Card component
const StatCard = ({ title, value, themeName, highlight = false }: {
  title: string;
  value: number;
  themeName: string;
  highlight?: boolean;
}) => (
  <div className={`p-6 rounded-xl ${
    themeName === 'light' ? 'bg-white shadow' : 'bg-white/5'
  }`}>
    <h3 className={`text-sm font-medium mb-1 ${
      themeName === 'light' ? 'text-gray-500' : 'text-gray-400'
    }`}>
      {title}
    </h3>
    <p className={`text-3xl font-bold ${
      highlight
        ? themeName === 'light' ? 'text-orange-600' : 'text-[var(--theme-primary)]'
        : themeName === 'light' ? 'text-gray-900' : 'text-white'
    }`}>
      {value.toLocaleString()}
    </p>
  </div>
);

export default Admin;
