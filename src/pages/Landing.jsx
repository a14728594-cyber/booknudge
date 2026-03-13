import React from 'react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import DiagnosisFlow from '@/components/diagnosis/DiagnosisFlow';

export default function Landing() {
  useEffect(() => {
    // 訪問記録（未ログインでも）
    base44.functions.invoke('trackPageView', {
      page: 'landing',
      referrer: document.referrer || ''
    }).catch(() => {});

    const ua = navigator.userAgent || '';
    if (/Twitter|twitterandroid/i.test(ua)) {
      const url = window.location.href;
      if (/iPhone|iPad|iPod/i.test(ua)) {
        window.location.href = url.replace('https://', 'x-safari-https://');
      } else {
        window.location.href = `intent://${url.replace(/https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`;
      }
    }
  }, []);
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