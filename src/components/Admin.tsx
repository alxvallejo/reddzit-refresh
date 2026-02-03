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
  id: string;
  redditUsername: string;
  email: string | null;
  isPro: boolean;
  proExpiresAt: string | null;
  isAdmin: boolean;
  createdAt: string;
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

interface CronJob {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  script: string;
  cronExpression: string;
  enabled: boolean;
  lastRunAt: string | null;
  lastRunStatus: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | null;
  lastRunDuration: number | null;
  runtime: {
    status: string;
    pid: number;
    memory: number;
    uptime: number;
    restarts: number;
  } | null;
  runHistory: Array<{
    id: string;
    startedAt: string;
    completedAt: string | null;
    status: string;
    triggeredBy: string;
  }>;
}

interface RedditUsage {
  lastHour: number;
  last24Hours: number;
  limit: number;
  remaining: number;
  percentUsed: number;
  apiStatus: {
    isHealthy: boolean;
    lastCheckedAt: string;
    lastErrorCode: number | null;
    failureCount: number;
  } | null;
}

interface RedditApiLog {
  id: string;
  endpoint: string;
  status: number;
  createdAt: string;
}

interface CacheStats {
  size: number;
  max: number;
  hits: number;
  misses: number;
  hitRate: number;
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
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [redditUsage, setRedditUsage] = useState<RedditUsage | null>(null);
  const [redditLogs, setRedditLogs] = useState<RedditApiLog[]>([]);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [editingCron, setEditingCron] = useState<{name: string; value: string} | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'briefings' | 'jobs'>('stats');

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

  // Fetch Reddit API usage
  const fetchRedditUsage = useCallback(async () => {
    try {
      const response = await axios.get<RedditUsage>(`${API_BASE_URL}/api/admin/reddit-usage`, {
        headers: getAuthHeaders(),
      });
      setRedditUsage(response.data);
    } catch {
      console.error('Failed to fetch Reddit usage');
    }
  }, [getAuthHeaders]);

  // Fetch Reddit API logs
  const fetchRedditLogs = useCallback(async () => {
    try {
      const response = await axios.get<{ logs: RedditApiLog[] }>(`${API_BASE_URL}/api/admin/reddit-usage/logs`, {
        headers: getAuthHeaders(),
      });
      setRedditLogs(response.data.logs);
    } catch {
      console.error('Failed to fetch Reddit logs');
    }
  }, [getAuthHeaders]);

  // Fetch cache stats
  const fetchCacheStats = useCallback(async () => {
    try {
      const response = await axios.get<CacheStats>(`${API_BASE_URL}/api/admin/cache-stats`, {
        headers: getAuthHeaders(),
      });
      setCacheStats(response.data);
    } catch {
      console.error('Failed to fetch cache stats');
    }
  }, [getAuthHeaders]);

  // Delete Reddit API logs
  const deleteRedditLogs = async () => {
    if (!confirm('Delete all API request logs?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/admin/reddit-usage/logs`, {
        headers: getAuthHeaders(),
      });
      setRedditLogs([]);
      fetchRedditUsage();
    } catch {
      setError('Failed to delete logs');
    }
  };

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

  // Fetch jobs
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get<{ jobs: CronJob[] }>(
        `${API_BASE_URL}/api/admin/jobs`,
        { headers: getAuthHeaders() }
      );
      setJobs(response.data.jobs);
    } catch {
      setError('Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  // Toggle job enabled status
  const toggleJobEnabled = async (name: string, currentEnabled: boolean) => {
    try {
      await axios.patch(
        `${API_BASE_URL}/api/admin/jobs/${name}`,
        { enabled: !currentEnabled },
        { headers: getAuthHeaders() }
      );
      fetchJobs();
    } catch {
      setError('Failed to update job');
    }
  };

  // Update cron expression
  const updateCronExpression = async (name: string, cronExpression: string) => {
    try {
      await axios.patch(
        `${API_BASE_URL}/api/admin/jobs/${name}`,
        { cronExpression },
        { headers: getAuthHeaders() }
      );
      setEditingCron(null);
      fetchJobs();
    } catch {
      setError('Failed to update cron expression');
    }
  };

  // Trigger job manually
  const triggerJobManually = async (name: string) => {
    try {
      await axios.post(
        `${API_BASE_URL}/api/admin/jobs/${name}/trigger`,
        {},
        { headers: getAuthHeaders() }
      );
      alert(`Job "${name}" triggered`);
      fetchJobs();
    } catch {
      setError('Failed to trigger job');
    }
  };

  // Toggle Pro status
  const togglePro = async (redditUsername: string, currentPro: boolean) => {
    try {
      await axios.post(
        `${API_BASE_URL}/api/admin/users/${redditUsername}/pro`,
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
      if (activeTab === 'stats') { fetchRedditUsage(); fetchCacheStats(); }
      if (activeTab === 'users') fetchUsers(userSearch);
      if (activeTab === 'briefings') fetchBriefings();
      if (activeTab === 'jobs') fetchJobs();
    }
  }, [authenticated, activeTab, fetchUsers, fetchBriefings, fetchJobs, fetchRedditUsage, fetchCacheStats, userSearch]);

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
          {(['stats', 'users', 'briefings', 'jobs'] as const).map((tab) => (
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
          <div className="space-y-6">
            {/* Reddit API Usage Card */}
            {redditUsage && (
              <div className={`p-6 rounded-xl ${
                themeName === 'light' ? 'bg-white shadow' : 'bg-white/5'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`font-bold text-lg ${
                    themeName === 'light' ? 'text-gray-900' : 'text-white'
                  }`}>
                    Reddit API Usage
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      redditUsage.apiStatus?.isHealthy ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    <span className={`text-sm ${
                      themeName === 'light' ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      {redditUsage.apiStatus?.isHealthy ? 'Healthy' : 'Unhealthy'}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className={themeName === 'light' ? 'text-gray-600' : 'text-gray-300'}>
                      {redditUsage.lastHour} / {redditUsage.limit} requests this hour
                    </span>
                    <span className={`font-medium ${
                      redditUsage.percentUsed >= 80
                        ? 'text-red-500'
                        : redditUsage.percentUsed >= 50
                          ? 'text-yellow-500'
                          : themeName === 'light' ? 'text-green-600' : 'text-green-400'
                    }`}>
                      {redditUsage.remaining} remaining
                    </span>
                  </div>
                  <div className={`h-3 rounded-full overflow-hidden ${
                    themeName === 'light' ? 'bg-gray-200' : 'bg-white/10'
                  }`}>
                    <div
                      className={`h-full rounded-full transition-all ${
                        redditUsage.percentUsed >= 80
                          ? 'bg-red-500'
                          : redditUsage.percentUsed >= 50
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(redditUsage.percentUsed, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-4 text-center mb-4">
                  <div>
                    <p className={`text-2xl font-bold ${
                      themeName === 'light' ? 'text-gray-900' : 'text-white'
                    }`}>
                      {redditUsage.lastHour}
                    </p>
                    <p className={`text-xs ${
                      themeName === 'light' ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      Last Hour
                    </p>
                  </div>
                  <div>
                    <p className={`text-2xl font-bold ${
                      themeName === 'light' ? 'text-gray-900' : 'text-white'
                    }`}>
                      {redditUsage.last24Hours}
                    </p>
                    <p className={`text-xs ${
                      themeName === 'light' ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      Last 24h
                    </p>
                  </div>
                  <div>
                    <p className={`text-2xl font-bold ${
                      redditUsage.percentUsed >= 80
                        ? 'text-red-500'
                        : themeName === 'light' ? 'text-gray-900' : 'text-white'
                    }`}>
                      {redditUsage.percentUsed}%
                    </p>
                    <p className={`text-xs ${
                      themeName === 'light' ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      Used
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowLogs(!showLogs);
                      if (!showLogs) fetchRedditLogs();
                    }}
                    className={`text-sm px-4 py-2 rounded-lg transition ${
                      themeName === 'light'
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }`}
                  >
                    {showLogs ? 'Hide Logs' : 'View Logs'}
                  </button>
                  {redditLogs.length > 0 && (
                    <button
                      onClick={deleteRedditLogs}
                      className="text-sm px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition"
                    >
                      Clear Logs
                    </button>
                  )}
                </div>

                {/* Logs List */}
                {showLogs && (
                  <div className={`mt-4 rounded-lg overflow-hidden ${
                    themeName === 'light' ? 'bg-gray-50' : 'bg-white/5'
                  }`}>
                    {redditLogs.length === 0 ? (
                      <p className={`p-4 text-sm ${
                        themeName === 'light' ? 'text-gray-500' : 'text-gray-400'
                      }`}>
                        No requests in the last hour
                      </p>
                    ) : (
                      <div className="max-h-64 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className={`sticky top-0 ${
                            themeName === 'light' ? 'bg-gray-100' : 'bg-white/10'
                          }`}>
                            <tr>
                              <th className={`text-left p-2 font-medium ${
                                themeName === 'light' ? 'text-gray-600' : 'text-gray-400'
                              }`}>Time</th>
                              <th className={`text-left p-2 font-medium ${
                                themeName === 'light' ? 'text-gray-600' : 'text-gray-400'
                              }`}>Endpoint</th>
                              <th className={`text-center p-2 font-medium ${
                                themeName === 'light' ? 'text-gray-600' : 'text-gray-400'
                              }`}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {redditLogs.map((log) => (
                              <tr key={log.id} className={
                                themeName === 'light' ? 'border-t border-gray-200' : 'border-t border-white/5'
                              }>
                                <td className={`p-2 ${
                                  themeName === 'light' ? 'text-gray-500' : 'text-gray-400'
                                }`}>
                                  {new Date(log.createdAt).toLocaleTimeString()}
                                </td>
                                <td className={`p-2 font-mono text-xs truncate max-w-[200px] ${
                                  themeName === 'light' ? 'text-gray-700' : 'text-gray-300'
                                }`}>
                                  {log.endpoint}
                                </td>
                                <td className="p-2 text-center">
                                  <span className={`text-xs px-2 py-0.5 rounded ${
                                    log.status === 200
                                      ? 'bg-green-500/20 text-green-400'
                                      : log.status >= 400
                                        ? 'bg-red-500/20 text-red-400'
                                        : 'bg-yellow-500/20 text-yellow-400'
                                  }`}>
                                    {log.status || '?'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Share Preview Cache */}
            {cacheStats && (
              <div className={`p-6 rounded-xl ${
                themeName === 'light' ? 'bg-white shadow' : 'bg-white/5'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`font-bold text-lg ${
                    themeName === 'light' ? 'text-gray-900' : 'text-white'
                  }`}>
                    Share Preview Cache
                  </h3>
                  <span className={`text-sm ${
                    themeName === 'light' ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    {cacheStats.size} / {cacheStats.max} entries
                  </span>
                </div>

                {/* Hit Rate Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className={themeName === 'light' ? 'text-gray-600' : 'text-gray-300'}>
                      {cacheStats.hits + cacheStats.misses} total requests
                    </span>
                    <span className={`font-medium ${
                      cacheStats.hitRate >= 70
                        ? themeName === 'light' ? 'text-green-600' : 'text-green-400'
                        : cacheStats.hitRate >= 40
                          ? 'text-yellow-500'
                          : 'text-red-500'
                    }`}>
                      {cacheStats.hitRate}% hit rate
                    </span>
                  </div>
                  <div className={`h-3 rounded-full overflow-hidden ${
                    themeName === 'light' ? 'bg-gray-200' : 'bg-white/10'
                  }`}>
                    <div
                      className={`h-full rounded-full transition-all ${
                        cacheStats.hitRate >= 70
                          ? 'bg-green-500'
                          : cacheStats.hitRate >= 40
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                      }`}
                      style={{ width: `${cacheStats.hitRate}%` }}
                    />
                  </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className={`text-2xl font-bold ${
                      themeName === 'light' ? 'text-green-600' : 'text-green-400'
                    }`}>
                      {cacheStats.hits}
                    </p>
                    <p className={`text-xs ${
                      themeName === 'light' ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      Cache Hits
                    </p>
                  </div>
                  <div>
                    <p className={`text-2xl font-bold ${
                      themeName === 'light' ? 'text-gray-900' : 'text-white'
                    }`}>
                      {cacheStats.misses}
                    </p>
                    <p className={`text-xs ${
                      themeName === 'light' ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      Cache Misses
                    </p>
                  </div>
                  <div>
                    <p className={`text-2xl font-bold ${
                      themeName === 'light' ? 'text-green-600' : 'text-green-400'
                    }`}>
                      {cacheStats.hits}
                    </p>
                    <p className={`text-xs ${
                      themeName === 'light' ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      API Calls Saved
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Existing stat cards */}
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
                            onClick={() => togglePro(u.redditUsername, u.isPro)}
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

        {/* Jobs Tab */}
        {activeTab === 'jobs' && (
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              jobs.map((job) => (
                <div
                  key={job.id}
                  className={`p-6 rounded-xl ${
                    themeName === 'light' ? 'bg-white shadow' : 'bg-white/5'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className={`font-bold text-lg ${
                          themeName === 'light' ? 'text-gray-900' : 'text-white'
                        }`}>
                          {job.displayName}
                        </h3>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          job.enabled
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {job.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                        {job.runtime && (
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            job.runtime.status === 'online'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {job.runtime.status}
                          </span>
                        )}
                      </div>
                      <p className={`text-sm ${
                        themeName === 'light' ? 'text-gray-500' : 'text-gray-400'
                      }`}>
                        {job.description}
                      </p>
                    </div>
                  </div>

                  {/* Cron Expression Editor */}
                  <div className="flex items-center gap-4 mb-4">
                    <span className={`text-sm ${
                      themeName === 'light' ? 'text-gray-600' : 'text-gray-300'
                    }`}>
                      Schedule:
                    </span>
                    {editingCron?.name === job.name ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editingCron.value}
                          onChange={(e) => setEditingCron({ name: job.name, value: e.target.value })}
                          className={`px-3 py-1 rounded border text-sm font-mono ${
                            themeName === 'light'
                              ? 'bg-gray-50 border-gray-200 text-gray-900'
                              : 'bg-white/5 border-white/10 text-white'
                          }`}
                        />
                        <button
                          onClick={() => updateCronExpression(job.name, editingCron.value)}
                          className="text-sm px-3 py-1 rounded bg-green-500/20 text-green-400"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingCron(null)}
                          className="text-sm px-3 py-1 rounded bg-gray-500/20 text-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <code className={`text-sm px-2 py-1 rounded ${
                          themeName === 'light' ? 'bg-gray-100 text-gray-800' : 'bg-white/10 text-gray-200'
                        }`}>
                          {job.cronExpression}
                        </code>
                        <button
                          onClick={() => setEditingCron({ name: job.name, value: job.cronExpression })}
                          className={`text-sm ${
                            themeName === 'light' ? 'text-blue-600' : 'text-blue-400'
                          }`}
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Last Run Info */}
                  {job.lastRunAt && (
                    <p className={`text-sm mb-4 ${
                      themeName === 'light' ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      Last run: {formatDate(job.lastRunAt)}
                      {job.lastRunStatus && (
                        <span className={`ml-2 ${
                          job.lastRunStatus === 'COMPLETED' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          ({job.lastRunStatus})
                        </span>
                      )}
                      {job.lastRunDuration && (
                        <span className="ml-2">
                          in {(job.lastRunDuration / 1000).toFixed(1)}s
                        </span>
                      )}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleJobEnabled(job.name, job.enabled)}
                      className={`text-sm px-4 py-2 rounded-lg transition ${
                        job.enabled
                          ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                          : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                      }`}
                    >
                      {job.enabled ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => triggerJobManually(job.name)}
                      className={`text-sm px-4 py-2 rounded-lg transition ${
                        themeName === 'light'
                          ? 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                          : 'bg-[var(--theme-primary)]/20 text-[var(--theme-primary)] hover:bg-[var(--theme-primary)]/30'
                      }`}
                    >
                      Run Now
                    </button>
                  </div>
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
