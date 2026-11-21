'use client';

import { useCallback, useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

interface AdminStats {
  totalUsers: number;
  totalVideos: number;
  totalSchedules: number;
  pendingSchedules: number;
  failedPublishes: number;
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at?: string;
}

interface PublishLogEntry {
  id: string;
  video_id: string;
  platform: string;
  status: string;
  publish_url: string | null;
  error_message: string | null;
  retry_count: number;
  video_title: string;
  user_email: string;
  user_name: string;
  created_at: string;
}

type Tab = 'overview' | 'users' | 'logs';
const PAGE_SIZE = 20;

function errorMessage(error: any, fallback: string): string {
  return error?.response?.data?.error || fallback;
}

export default function AdminPage() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [logs, setLogs] = useState<PublishLogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [usersPage, setUsersPage] = useState(1);
  const [logsPage, setLogsPage] = useState(1);
  const [usersTotal, setUsersTotal] = useState(0);
  const [logsTotal, setLogsTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await apiClient.getAdminStats();
      setStats(res.data);
    } catch (fetchError) {
      setError(errorMessage(fetchError, 'Failed to load admin stats'));
    }
  }, []);

  const fetchUsers = useCallback(async (page: number) => {
    try {
      const res = await apiClient.getAdminUsers(page, PAGE_SIZE);
      setUsers(res.data.users);
      setUsersTotal(res.data.total);
    } catch (fetchError) {
      setError(errorMessage(fetchError, 'Failed to load users'));
    }
  }, []);

  const fetchLogs = useCallback(async (page: number) => {
    try {
      const res = await apiClient.getAdminPublishLogs(page, PAGE_SIZE);
      setLogs(res.data.logs);
      setLogsTotal(res.data.total);
    } catch (fetchError) {
      setError(errorMessage(fetchError, 'Failed to load publish logs'));
    }
  }, []);

  useEffect(() => {
    if (!token || !user || user.role !== 'admin') return;

    const load = async () => {
      setIsLoading(true);
      await Promise.all([fetchStats(), fetchUsers(1), fetchLogs(1)]);
      setIsLoading(false);
    };

    load();
  }, [token, user, fetchStats, fetchUsers, fetchLogs]);

  if (!token) return null;

  if (!user || user.role !== 'admin') {
    return (
      <Layout>
        <div className="p-8">
          <div className="bg-white rounded-lg shadow p-8 max-w-xl">
            <h1 className="text-2xl font-bold mb-4">Admin access required</h1>
            <p className="text-slate-600">
              You do not have permission to view this page.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  const handleSuspend = async (userId: string) => {
    if (!confirm('Suspend this user? They will lose access immediately.')) return;

    setActionId(userId);
    setError('');
    try {
      await apiClient.suspendUser(userId);
      await fetchUsers(usersPage);
      await fetchStats();
    } catch (actionError) {
      setError(errorMessage(actionError, 'Failed to suspend user'));
    } finally {
      setActionId(null);
    }
  };

  const handleUnsuspend = async (userId: string) => {
    setActionId(userId);
    setError('');
    try {
      await apiClient.unsuspendUser(userId);
      await fetchUsers(usersPage);
      await fetchStats();
    } catch (actionError) {
      setError(errorMessage(actionError, 'Failed to unsuspend user'));
    } finally {
      setActionId(null);
    }
  };

  const handleRetry = async (logId: string) => {
    setActionId(logId);
    setError('');
    try {
      const res = await apiClient.retryPublish(logId);
      if (res.data?.success === false) {
        setError(res.data.error || 'Publish retry failed');
      }
      await Promise.all([fetchLogs(logsPage), fetchStats()]);
    } catch (actionError) {
      setError(errorMessage(actionError, 'Failed to retry publish'));
    } finally {
      setActionId(null);
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'users', label: 'Users' },
    { key: 'logs', label: 'Publish Logs' },
  ];

  return (
    <Layout>
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

        <div className="flex gap-4 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded ${
                activeTab === tab.key ? 'bg-blue-600 text-white' : 'bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-red-700">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12 text-slate-600">Loading...</div>
        ) : (
          <>
            {activeTab === 'overview' && stats && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-slate-600 text-sm font-medium mb-2">Total Users</div>
                  <div className="text-4xl font-bold">{stats.totalUsers}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-slate-600 text-sm font-medium mb-2">Total Videos</div>
                  <div className="text-4xl font-bold">{stats.totalVideos}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-slate-600 text-sm font-medium mb-2">Schedules</div>
                  <div className="text-4xl font-bold">{stats.totalSchedules}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-slate-600 text-sm font-medium mb-2">Pending</div>
                  <div className="text-4xl font-bold text-blue-600">{stats.pendingSchedules}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-slate-600 text-sm font-medium mb-2">Failed</div>
                  <div className="text-4xl font-bold text-red-600">{stats.failedPublishes}</div>
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Name</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Email</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Role</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                          No users found
                        </td>
                      </tr>
                    )}
                    {users.map((entry) => (
                      <tr key={entry.id} className="border-t">
                        <td className="px-6 py-4">{entry.name}</td>
                        <td className="px-6 py-4 text-slate-600">{entry.email}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 rounded text-sm ${
                              entry.role === 'admin'
                                ? 'bg-purple-100 text-purple-800'
                                : entry.role === 'suspended'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {entry.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {entry.role === 'suspended' ? (
                            <Button
                              size="sm"
                              onClick={() => handleUnsuspend(entry.id)}
                              isLoading={actionId === entry.id}
                            >
                              Unsuspend
                            </Button>
                          ) : entry.role !== 'admin' ? (
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleSuspend(entry.id)}
                              isLoading={actionId === entry.id}
                            >
                              Suspend
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex justify-between items-center px-6 py-4 border-t">
                  <span className="text-sm text-slate-600">
                    Page {usersPage} of {Math.max(1, Math.ceil(usersTotal / PAGE_SIZE))}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={usersPage <= 1}
                      onClick={() => {
                        const next = usersPage - 1;
                        setUsersPage(next);
                        fetchUsers(next);
                      }}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={usersPage * PAGE_SIZE >= usersTotal}
                      onClick={() => {
                        const next = usersPage + 1;
                        setUsersPage(next);
                        fetchUsers(next);
                      }}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'logs' && (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Video</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">User</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Platform</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Retries</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                          No publish logs found
                        </td>
                      </tr>
                    )}
                    {logs.map((log) => (
                      <tr key={log.id} className="border-t">
                        <td className="px-6 py-4">
                          {log.video_title}
                          {log.error_message && (
                            <p className="text-xs text-red-600 mt-1" title={log.error_message}>
                              {log.error_message.slice(0, 60)}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-600">{log.user_email}</td>
                        <td className="px-6 py-4 capitalize">{log.platform}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 rounded text-sm ${
                              log.status === 'success'
                                ? 'bg-green-100 text-green-800'
                                : log.status === 'failed'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">{log.retry_count}</td>
                        <td className="px-6 py-4 text-right">
                          {log.status === 'failed' && log.retry_count < 3 && (
                            <Button
                              size="sm"
                              onClick={() => handleRetry(log.id)}
                              isLoading={actionId === log.id}
                            >
                              Retry
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex justify-between items-center px-6 py-4 border-t">
                  <span className="text-sm text-slate-600">
                    Page {logsPage} of {Math.max(1, Math.ceil(logsTotal / PAGE_SIZE))}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={logsPage <= 1}
                      onClick={() => {
                        const next = logsPage - 1;
                        setLogsPage(next);
                        fetchLogs(next);
                      }}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={logsPage * PAGE_SIZE >= logsTotal}
                      onClick={() => {
                        const next = logsPage + 1;
                        setLogsPage(next);
                        fetchLogs(next);
                      }}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
