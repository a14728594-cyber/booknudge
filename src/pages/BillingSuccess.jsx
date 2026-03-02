import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import Card from '@/components/common/Card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';

export default function BillingSuccess() {
    const navigate = useNavigate();
    const [checking, setChecking] = useState(true);
    const [subscriptionActive, setSubscriptionActive] = useState(false);
    const [timeoutReached, setTimeoutReached] = useState(false);
    const urlParams = new URLSearchParams(window.location.search);
    const nextUrl = urlParams.get('next') || '/home';

    useEffect(() => {
        checkSubscriptionStatus();
        trackSuccess();
    }, []);

    const trackSuccess = async () => {
        try {
            await base44.functions.invoke('trackEvent', {
                event_name: 'checkout_success',
                event_value: { next: nextUrl }
            });
        } catch (error) {
            console.error('Failed to track checkout success:', error);
        }
    };

    const checkSubscriptionStatus = async () => {
        let attempts = 0;
        const maxAttempts = 20; // 60秒間（3秒おきに20回）

        const checkInterval = setInterval(async () => {
            attempts++;

            try {
                const user = await base44.auth.me();
                
                if (user.subscription_status === 'active') {
                    setSubscriptionActive(true);
                    setChecking(false);
                    clearInterval(checkInterval);
                    
                    setTimeout(() => {
                        navigate(nextUrl);
                    }, 1500);
                } else if (attempts >= maxAttempts) {
                    setTimeoutReached(true);
                    setChecking(false);
                    clearInterval(checkInterval);
                }
            } catch (error) {
                console.error('Failed to check subscription:', error);
                if (attempts >= maxAttempts) {
                    setTimeoutReached(true);
                    setChecking(false);
                    clearInterval(checkInterval);
                }
            }
        }, 3000);

        return () => clearInterval(checkInterval);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center px-6">
            <div className="max-w-md w-full">
                <Card className="text-center">
                    {checking ? (
                        <>
                            <Loader2 className="w-16 h-16 text-indigo-600 mx-auto mb-4 animate-spin" />
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                決済を確認中...
                            </h2>
                            <p className="text-gray-600">
                                少々お待ちください
                            </p>
                        </>
                    ) : subscriptionActive ? (
                        <>
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-10 h-10 text-green-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                ご購入ありがとうございます！
                            </h2>
                            <p className="text-gray-600 mb-4">
                                プレミアムプランが有効になりました
                            </p>
                            <p className="text-sm text-gray-500">
                                自動的にページに戻ります...
                            </p>
                        </>
                    ) : timeoutReached ? (
                        <>
                            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Loader2 className="w-10 h-10 text-yellow-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                決済を処理中です
                            </h2>
                            <p className="text-gray-600 mb-6">
                                反映に少し時間がかかっています。<br />
                                数分後に再度お試しください。
                            </p>
                            <Button
                                onClick={() => navigate(createPageUrl('home'))}
                                className="w-full"
                            >
                                ホームに戻る
                            </Button>
                        </>
                    ) : null}
                </Card>
            </div>
        </div>
    );
}