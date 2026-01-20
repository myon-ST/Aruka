'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calendar, FolderOpen, Clock, Settings, BarChart3 } from 'lucide-react';

const navigationItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/calendar', label: 'カレンダー', icon: Calendar },
  { href: '/management', label: '管理', icon: BarChart3 },
  { href: '/project', label: 'プロジェクト', icon: FolderOpen },
  { href: '/schedule', label: '日程', icon: Clock },
  { href: '/settings', label: '設定', icon: Settings },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="bg-white shadow-lg border-b">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <div className="text-xl font-bold text-gray-800">Aruka</div>
            <div className="flex space-x-6">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
