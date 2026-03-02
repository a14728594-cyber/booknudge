import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import Card from '@/components/common/Card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, AlertCircle, RefreshCw } from 'lucide-react';

export default function BillingSuccess() {
    const navigate = useNavigate();
    const [checking, setChecking] = useState(true);
    const [subscriptionActive, setSubscriptionActive] = useState(false);
    const [timeoutReached, setTimeoutReached] = useState(false);
    const [message, setMessage] = useState('決済を確認中...');
    const urlParams = new URLSearchParams(window.location.search);
    const nextUrl = urlParams.get('next') || '/home';
    const sessionId = urlParams.get('session_id');

    useEffect(() => {
        verifyAndActivate();
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

    const verifyAndActivate = async () => {
        console.log('[BillingSuccess] Starting verification - session_id:', sessionId);
        
        if (!sessionId) {
            console.warn('[BillingSuccess] No session_id provided, falling back to polling');
            setMessage('決済情報を確認中...');
            await checkSubscriptionStatusPolling();
            return;
        }

        try {
            // 即座にセッションを検証してアクティベート
            console.log('[BillingSuccess] Verifying checkout session...');
            setMessage('決済を確認しています...');
            
            const response = await base44.functions.invoke('verifyCheckoutSession', {
                session_id: sessionId
            });

            console.log('[BillingSuccess] Verification response:', response.data);

            if (response.data?.ok && response.data?.subscription_active) {
                console.log('[BillingSuccess] Subscription activated immediately');
                setSubscriptionActive(true);
                setChecking(false);
                setMessage('プレミアムプランが有効になりました');
                
                setTimeout(() => {
                    navigate(nextUrl);
                }, 1500);
            } else {
                // 検証APIが成功したが、まだアクティブでない場合はポーリング
                console.log('[BillingSuccess] Verification successful but not active yet, starting polling');
                setMessage('決済処理を待機中...');
                await checkSubscriptionStatusPolling();
            }
        } catch (error) {
            console.error('[BillingSuccess] Verification failed:', error);
            setMessage('決済状態を確認中...');
            // エラーの場合もポーリングにフォールバック
            await checkSubscriptionStatusPolling();
        }
    };

    const checkSubscriptionStatusPolling = async () => {
        let attempts = 0;
        const maxAttempts = 10; // 30秒間（3秒おきに10回）

        const checkInterval = setInterval(async () => {
            attempts++;

            try {
                const user = await base44.auth.me();
                console.log(`[BillingSuccess] Polling attempt ${attempts}/${maxAttempts}: subscription_status=${user.subscription_status}, plan=${user.plan}`);
                
                if (user.subscription_status === 'active') {
                    setSubscriptionActive(true);
                    setChecking(false);
                    setMessage('プレミアムプランが有効になりました');
                    clearInterval(checkInterval);
                    
                    setTimeout(() => {
                        navigate(nextUrl);
                    }, 1500);
                } else if (attempts >= maxAttempts) {
                    console.warn('[BillingSuccess] Timeout reached after polling');
                    setTimeoutReached(true);
                    setChecking(false);
                    clearInterval(checkInterval);
                }
            } catch (error) {
                console.error('[BillingSuccess] Polling error:', error);
                if (attempts >= maxAttempts) {
                    setTimeoutReached(true);
                    setChecking(false);
                    clearInterval(checkInterval);
                }
            }
        }, 3000);

        return () => clearInterval(checkInterval);
    };

    const handleRetry = async () => {
        setChecking(true);
        setTimeoutReached(false);
        setMessage('再確認中...');
        await verifyAndActivate();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center px-6">
            <div className="max-w-md w-full">
                <Card className="text-center">
                    {checking ? (
                        <>
                            <Loader2 className="w-16 h-16 text-indigo-600 mx-auto mb-4 animate-spin" />
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                {message}
                            </h2>
                            <p className="text-gray-600 text-sm">
                                少々お待ちください（最大30秒）
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
                                <AlertCircle className="w-10 h-10 text-yellow-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                決済完了しました
                            </h2>
                            <p className="text-gray-600 mb-6">
                                反映に時間がかかっています。<br />
                                数分待ってから再読み込みしてください。
                            </p>
                            <div className="space-y-3">
                                <Button
                                    onClick={handleRetry}
                                    variant="outline"
                                    className="w-full gap-2"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    再確認する
                                </Button>
                                <Button
                                    onClick={() => navigate(createPageUrl('home'))}
                                    className="w-full"
                                >
                                    ホームに戻る
                                </Button>
                            </div>
                        </>
                    ) : null}
                </Card>
            </div>
        </div>
    );
}