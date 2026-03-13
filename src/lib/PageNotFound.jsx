import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function PageNotFound() {
    const [isInAppBrowser, setIsInAppBrowser] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        const ua = navigator.userAgent || '';
        if (/Twitter|twitterandroid|Instagram|FBAV|FBAN|Line|Snapchat/i.test(ua)) {
            setIsInAppBrowser(true);
        }
        setIsIOS(/iPhone|iPad|iPod/i.test(ua));
    }, []);

    const openInBrowser = () => {
        window.open(window.location.href, '_blank');
    };

    if (isInAppBrowser) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
                <div className="text-center max-w-sm">
                    <div className="text-5xl mb-6">📱</div>
                    <h1 className="text-xl font-bold text-gray-900 mb-3">
                        ブラウザで開いてください
                    </h1>
                    <p className="text-gray-600 mb-6 leading-relaxed text-sm">
                        アプリ内のブラウザではログインできません。
                        {isIOS ? 'Safari' : 'Chrome'}などのブラウザで開いてからお試しください。
                    </p>
                    <button
                        onClick={openInBrowser}
                        className="w-full bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors font-semibold"
                    >
                        {isIOS ? 'Safariで開く' : 'ブラウザで開く'}
                    </button>
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