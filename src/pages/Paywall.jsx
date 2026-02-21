import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import Card from '@/components/common/Card';
import { Button } from '@/components/ui/button';
import { Check, Loader2, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function Paywall() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);
    const urlParams = new URLSearchParams(window.location.search);
    const nextUrl = urlParams.get('next') || '/home';
    const from = urlParams.get('from') || 'unknown';

    useEffect(() => {
        loadUser();
        trackView();
    }, []);

    const loadUser = async () => {
        try {
            const userData = await base44.auth.me();
            setUser(userData);

            // すでに有料プランの場合はリダイレクト
            if (userData.subscription_status === 'active') {
                navigate(nextUrl);
            }
        } catch (error) {
            console.error('Failed to load user:', error);
        }
    };

    const trackView = async () => {
        try {
            await base44.functions.invoke('trackEvent', {
                event_name: 'paywall_view',
                event_value: { next: nextUrl, from }
            });
        } catch (error) {
            console.error('Failed to track paywall view:', error);
        }
    };

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const canceled = urlParams.get('canceled');
        if (canceled === 'true') {
            trackCancel();
        }
    }, []);

    const trackCancel = async () => {
        try {
            await base44.functions.invoke('trackEvent', {
                event_name: 'checkout_cancel',
                event_value: { next: nextUrl }
            });
        } catch (error) {
            console.error('Failed to track checkout cancel:', error);
        }
    };

    const handleCheckout = () => {
        window.open('https://buy.stripe.com/bJe8wOa1WcqigLI5OV8Ra00', '_self');
    };

    const features = [
        'あなた専用のパーソナライズドクイズ',
        '詳細な回答分析とフィードバック',
        '相性の良いユーザーとのマッチング',
        'ダイレクトメッセージ機能',
        'お気に入り本の管理',
        'プロフィールのカスタマイズ'
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-6">
            <div className="max-w-2xl mx-auto">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full mb-4">
                        <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">
                        プレミアムプランで、<br />もっと深く学ぼう
                    </h1>
                    <p className="text-lg text-gray-600">
                        あなたに最適な学びとつながりを提供します
                    </p>
                </div>

                <Card className="mb-8">
                    <div className="text-center mb-6">
                        <div className="text-5xl font-bold text-indigo-600 mb-2">
                            ¥1,200
                            <span className="text-2xl text-gray-500 font-normal">/月</span>
                        </div>
                        <p className="text-sm text-gray-500">いつでもキャンセル可能</p>
                    </div>

                    <div className="space-y-3 mb-8">
                        {features.map((feature, idx) => (
                            <div key={idx} className="flex items-start gap-3">
                                <div className="mt-0.5 flex-shrink-0">
                                    <Check className="w-5 h-5 text-indigo-600" />
                                </div>
                                <span className="text-gray-700">{feature}</span>
                            </div>
                        ))}
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                    <p className="text-red-800 font-medium mb-1">{error.message}</p>
                                    <p className="text-xs text-red-600">エラーコード: {error.code}</p>
                                    {error.details && (
                                        <p className="text-xs text-red-500 mt-1">詳細: {error.details}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <Button
                        onClick={handleCheckout}
                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-lg py-6"
                    >
                        <Sparkles className="w-5 h-5 mr-2" />
                        プレミアムプランを開始
                    </Button>
                </Card>

                <div className="text-center">
                    <button
                        onClick={() => navigate(createPageUrl('home'))}
                        className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        ホームに戻る
                    </button>
                </div>
            </div>
        </div>
    );
}