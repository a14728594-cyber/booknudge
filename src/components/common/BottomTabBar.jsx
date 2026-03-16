import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, Sparkles, User, Mail } from 'lucide-react';

const TABS = [
  { label: 'ホーム', path: 'home', icon: Home },
  { label: '診断', path: 'DeepDiagnosis', icon: Sparkles },
  { label: 'プロフィール', path: 'profile', icon: User },
  { label: 'サポート', path: 'support', icon: Mail },
];

export default function BottomTabBar({ currentPageName }) {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 flex"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {TABS.map(tab => {
        const active = currentPageName === tab.path;
        return (
          <Link
            key={tab.path}
            to={createPageUrl(tab.path)}
            onClick={(e) => { if (active) e.preventDefault(); }}
            className={`flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors select-none ${
              active ? 'text-indigo-600' : 'text-gray-400'
            }`}
          >
            <tab.icon className={`w-5 h-5 ${active ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px] font-medium">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}