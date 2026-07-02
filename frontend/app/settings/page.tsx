'use client';

import Layout from '@/components/Layout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';

export default function SettingsPage() {
  const { user } = useAuth();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [telegramNotifications, setTelegramNotifications] = useState(false);
  const [telegramBot, setTelegramBot] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save settings
      await new Promise((resolve) => setTimeout(resolve, 1000));
      alert('Settings saved successfully!');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  return (
    <Layout>
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>

        <div className="space-y-8 max-w-2xl">
          {/* Profile Settings */}
          <div className="bg-white rounded-lg shadow p-8">
            <h2 className="text-xl font-semibold mb-6">Profile Settings</h2>
            <div className="space-y-4">
              <Input label="Email" type="email" value={user.email} disabled />
              <Input label="Name" type="text" value={user.name} disabled />
            </div>
          </div>

          {/* Notification Settings */}
          <div className="bg-white rounded-lg shadow p-8">
            <h2 className="text-xl font-semibold mb-6">Notifications</h2>
            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={emailNotifications}
                  onChange={(e) => setEmailNotifications(e.target.checked)}
                  className="mr-3"
                />
                <span>Email Notifications</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={telegramNotifications}
                  onChange={(e) => setTelegramNotifications(e.target.checked)}
                  className="mr-3"
                />
                <span>Telegram Notifications</span>
              </label>
              {telegramNotifications && (
                <Input
                  label="Telegram Bot Token"
                  placeholder="Your bot token"
                  value={telegramBot}
                  onChange={(e) => setTelegramBot(e.target.value)}
                />
              )}
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-white rounded-lg shadow p-8 border-l-4 border-red-600">
            <h2 className="text-xl font-semibold mb-6 text-red-600">Danger Zone</h2>
            <p className="text-slate-600 mb-4">
              Permanently delete your account and all associated data.
            </p>
            <Button variant="danger">Delete Account</Button>
          </div>

          <Button onClick={handleSave} isLoading={isSaving} className="w-full">
            Save Settings
          </Button>
        </div>
      </div>
    </Layout>
  );
}
