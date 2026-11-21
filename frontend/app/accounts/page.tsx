'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import type { ConnectedAccount } from '@/types';

export default function AccountsPage() {
  const token = useAuthStore((state) => state.token);
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    const fetchAccounts = async () => {
      try {
        const response = await apiClient.getConnectedAccounts();
        setAccounts(response.data.accounts);
      } catch (error) {
        console.error('Failed to fetch accounts', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAccounts();
  }, [token]);

  const handleDisconnect = async (accountId: string) => {
    if (!confirm('Are you sure you want to disconnect this account?')) return;

    try {
      await apiClient.disconnectAccount(accountId);
      setAccounts((prev) => prev.filter((a) => a.id !== accountId));
    } catch (error) {
      console.error('Failed to disconnect account', error);
      alert('Failed to disconnect account');
    }
  };

  if (!token) return null;

  return (
    <Layout>
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-8">Connected Accounts</h1>

        <div className="bg-white rounded-lg shadow p-8">
          {isLoading ? (
            <div className="text-center py-12">Loading...</div>
          ) : accounts.length > 0 ? (
            <div className="space-y-4">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex justify-between items-center p-4 border border-slate-200 rounded-lg"
                >
                  <div>
                    <h3 className="font-semibold capitalize">{account.platform}</h3>
                    <p className="text-sm text-slate-600">
                      {(account.account_details || account.accountDetails)?.name ||
                        (account.account_details || account.accountDetails)?.email ||
                        'Connected'}
                    </p>
                  </div>
                  <Button
                    variant="danger"
                    onClick={() => handleDisconnect(account.id)}
                  >
                    Disconnect
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-slate-600 mb-4">No connected accounts yet</p>
              <Button>Connect YouTube</Button>
              <Button className="ml-4">Connect Instagram</Button>
            </div>
          )}

          <div className="mt-8 pt-8 border-t">
            <h2 className="text-lg font-semibold mb-4">Connect New Account</h2>
            <div className="flex gap-4">
              <Button>Connect YouTube Channel</Button>
              <Button>Connect Instagram Account</Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
