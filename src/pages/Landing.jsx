import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import DiagnosisFlow from '@/components/diagnosis/DiagnosisFlow';
import { ArrowRight, X } from 'lucide-react';

export default function Landing() {
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [prevDiagnosis, setPrevDiagnosis] = useState(null);
  const [showPrevBanner, setShowPrevBanner] = useState(false);
  const [diagnosisKey, setDiagnosisKey] = useState(0); // DiagnosisFlowをリセットするキー

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

    // 前回の診断結果をlocalStorageから確認
    try {
      const saved = localStorage.getItem('lastDiagnosisResult');
      if (saved) {
        const parsed = JSON.parse(saved);
        // 7日以内のものだけ表示
        if (parsed.savedAt && Date.now() - parsed.savedAt < 7 * 24 * 60 * 60 * 1000 && parsed.mainType) {
          setPrevDiagnosis(parsed);
          setShowPrevBanner(true);
        }
      }
    } catch {}
  }, []);

  const currentUrl = window.location.href;

  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(currentUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  if (isInAppBrowser) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mb-6">
          <span className="text-3xl">📚</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">BookNudge</h1>
        <p className="text-gray-600 text-sm mb-8 leading-relaxed">
          X（Twitter）アプリ内では正しく動作しません。<br />
          <span className="font-semibold text-gray-800">画面下部の「base44.app」をタップして<br />ブラウザで開いてください。</span>
        </p>


      </div>
    );
  }

  return (
    <>
      {/* 前回の診断結果バナー */}
      {showPrevBanner && (
        <div className="fixed top-0 left-0 right-0 z-[200] bg-indigo-600 text-white px-4 py-3 flex items-center justify-between gap-3 shadow-lg" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight">前回の診断結果がまだ残っています</p>
            <p className="text-xs text-indigo-200 mt-0.5">今すぐ確認しますか？</p>
          </div>
          <button
            onClick={() => {
              setShowPrevBanner(false);
              // DiagnosisFlowに結果を復元させる（sessionStorageに保存済みなら自動復元）
            }}
            className="bg-white text-indigo-600 font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1 flex-shrink-0"
          >
            結果を見る <ArrowRight className="w-3 h-3" />
          </button>
          <button
            onClick={() => {
              setShowPrevBanner(false);
              try { localStorage.removeItem('lastDiagnosisResult'); } catch {}
            }}
            className="p-1 text-indigo-200 hover:text-white transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <div style={{ paddingTop: showPrevBanner ? '72px' : '0' }}>
        <DiagnosisFlow key={diagnosisKey} onClose={() => {}} hideClose={true} />
      </div>
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