import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function PageNotFound() {
    const [isInAppBrowser, setIsInAppBrowser] = useState(false);
    const [copied, setCopied] = useState(false);
    const url = 'https://booknudge.base44.app';

    useEffect(() => {
        const ua = navigator.userAgent || '';
        if (/Twitter|twitterandroid|Instagram|FBAV|FBAN|Line|Snapchat/i.test(ua)) {
            setIsInAppBrowser(true);
        }
    }, []);

    const copyUrl = () => {
        navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
        }).catch(() => {
            // fallback: select text
        });
    };

    if (isInAppBrowser) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
                <div className="text-center max-w-sm w-full">
                    <div className="text-5xl mb-6">📱</div>
                    <h1 className="text-xl font-bold text-gray-900 mb-3">
                        ブラウザで開いてください
                    </h1>
                    <p className="text-gray-600 mb-6 leading-relaxed text-sm">
                        アプリ内のブラウザではログインできません。
                        URLをコピーして、SafariやChromeで開いてください。
                    </p>
                    <div className="bg-white border border-gray-200 rounded-xl p-3 mb-4 flex items-center gap-2">
                        <span className="text-sm text-gray-600 flex-1 truncate">{url}</span>
                    </div>
                    <button
                        onClick={copyUrl}
                        className="w-full bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors font-semibold"
                    >
                        {copied ? '✅ コピーしました！' : 'URLをコピーする'}
                    </button>
                    {copied && (
                        <p className="text-sm text-indigo-600 mt-3 font-medium">
                            SafariまたはChromeのアドレスバーに貼り付けてください
                        </p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
                <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
                <p className="text-xl text-gray-600 mb-8">ページが見つかりません</p>
                <Link
                    to={createPageUrl('home')}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors"
                >
                    ホームへ戻る
                </Link>
            </div>
        </div>
    );
}