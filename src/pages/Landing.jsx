import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import DiagnosisFlow from '@/components/diagnosis/DiagnosisFlow';

export default function Landing() {
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // 訪問記録（未ログインでも）
    base44.functions.invoke('trackPageView', {
      page: 'landing',
      referrer: document.referrer || ''
    }).catch(() => {});

    const ua = navigator.userAgent || '';
    const inApp = /Twitter|twitterandroid/i.test(ua);
    const ios = /iPhone|iPad|iPod/i.test(ua);
    if (inApp) {
      setIsInAppBrowser(true);
      setIsIOS(ios);
    }
  }, []);

  const currentUrl = window.location.href;

  if (isInAppBrowser) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mb-6">
          <span className="text-3xl">📚</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">BookNudge</h1>
        <p className="text-gray-500 text-sm mb-8 leading-relaxed">
          このままだと正しく動作しません。<br />
          Safariまたはブラウザで開いてください。
        </p>
        <a
          href={isIOS ? `x-safari-${currentUrl}` : currentUrl}
          className="w-full max-w-xs bg-indigo-600 text-white font-bold py-4 rounded-2xl text-base mb-4 block"
        >
          {isIOS ? 'Safariで開く' : 'ブラウザで開く'}
        </a>
        <p className="text-xs text-gray-400 leading-relaxed">
          上のボタンが動作しない場合は、<br />
          右下の「…」メニューから「ブラウザで開く」を選択してください。
        </p>
      </div>
    );
  }

  return (
    <>
      <DiagnosisFlow onClose={() => {}} hideClose={true} />
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 py-2 z-[60]">
        <div className="flex flex-wrap justify-center gap-4 text-xs text-gray-400">
          <Link to={createPageUrl('terms')} className="hover:text-indigo-600 transition-colors">利用規約</Link>
          <span className="text-gray-200">|</span>
          <Link to={createPageUrl('privacy')} className="hover:text-indigo-600 transition-colors">プライバシーポリシー</Link>
          <span className="text-gray-200">|</span>
          <Link to={createPageUrl('tokushoho')} className="hover:text-indigo-600 transition-colors">特定商取引法</Link>
          <span className="text-gray-200">|</span>
          <Link to={createPageUrl('refund')} className="hover:text-indigo-600 transition-colors">返金・解約</Link>
        </div>
      </footer>
    </>
  );
}