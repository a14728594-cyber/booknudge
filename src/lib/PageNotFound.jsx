import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function PageNotFound() {
    const [isInAppBrowser, setIsInAppBrowser] = useState(false);
    const url = 'booknudge.base44.app';

    useEffect(() => {
        const ua = navigator.userAgent || '';
        if (/Twitter|twitterandroid|Instagram|FBAV|FBAN|Line|Snapchat/i.test(ua)) {
            setIsInAppBrowser(true);
        }
    }, []);

    if (isInAppBrowser) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
                <div className="text-center max-w-sm w-full">
                    <div className="text-5xl mb-6">📱</div>
                    <h1 className="text-xl font-bold text-gray-900 mb-3">
                        ブラウザで開いてください
                    </h1>
                    <p className="text-gray-600 mb-5 leading-relaxed text-sm">
                        アプリ内のブラウザではログインできません。<br />
                        下のURLを長押しでコピーして、SafariやChromeのアドレスバーに貼り付けてください。
                    </p>
                    <div className="bg-white border-2 border-indigo-300 rounded-xl p-4 mb-3">
                        <p className="text-indigo-700 font-bold text-base select-all">{url}</p>
                    </div>
                    <p className="text-xs text-gray-400">↑ 長押しして「コピー」を選んでください</p>
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