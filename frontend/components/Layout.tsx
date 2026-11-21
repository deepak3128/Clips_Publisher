'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="flex h-screen">
      {user && (
        <aside className="w-64 bg-slate-900 text-white p-6">
          <div className="mb-8">
            <h1 className="text-2xl font-bold">AutoShorts</h1>
            <p className="text-slate-400">Publisher</p>
          </div>

          <nav className="space-y-4">
            <Link
              href="/clips"
              className="block px-4 py-2 rounded bg-blue-900 hover:bg-slate-800 transition font-medium"
            >
              Clip Publisher
            </Link>
            <Link
              href="/dashboard"
              className="block px-4 py-2 rounded hover:bg-slate-800 transition"
            >
              Dashboard
            </Link>
            <Link
              href="/upload"
              className="block px-4 py-2 rounded hover:bg-slate-800 transition"
            >
              Upload Videos
            </Link>
            <Link
              href="/library"
              className="block px-4 py-2 rounded hover:bg-slate-800 transition"
            >
              Library
            </Link>
            <Link
              href="/schedule"
              className="block px-4 py-2 rounded hover:bg-slate-800 transition"
            >
              Schedule
            </Link>
            <Link
              href="/accounts"
              className="block px-4 py-2 rounded hover:bg-slate-800 transition"
            >
              Accounts
            </Link>
            <Link
              href="/settings"
              className="block px-4 py-2 rounded hover:bg-slate-800 transition"
            >
              Settings
            </Link>
            {user.role === 'admin' && (
              <Link
                href="/admin"
                className="block px-4 py-2 rounded hover:bg-slate-800 transition text-purple-400"
              >
                Admin
              </Link>
            )}
          </nav>

          <div className="mt-auto pt-6 border-t border-slate-700">
            <div className="mb-4">
              <p className="text-sm text-slate-400">Logged in as</p>
              <p className="font-medium">{user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition"
            >
              Logout
            </button>
          </div>
        </aside>
      )}

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
