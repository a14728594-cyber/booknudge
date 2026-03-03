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
    const [debugInfo, setDebugInfo] = useState({
        userId: null,
        currentStatus: null,
        currentPlan: null,
        verifyResult: null,
        lastStripeEventId: null
    });
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
        
        // ユーザー情報取得
        try {
            const user = await base44.auth.me();
            setDebugInfo(prev => ({
                ...prev,
                userId: user.id,
                currentStatus: user.subscription_status,
                currentPlan: user.plan
            }));
        } catch (error) {
            console.error('[BillingSuccess] Failed to load user:', error);
        }
        
        if (!sessionId) {
            console.warn('[BillingSuccess] No session_id provided, falling back to polling');
            setMessage('支払いを確認中...');
            setDebugInfo(prev => ({
                ...prev,
                verifyResult: { success: false, reason: 'session_idなし' }
            }));
            await checkSubscriptionStatusPolling();
            return;
        }

        try {
            // 即座にセッションを検証してアクティベート
            console.log('[BillingSuccess] Verifying checkout session immediately...');
            setMessage('支払いを確認中...');
            
            const response = await base44.functions.invoke('verifyCheckoutSession', {
                session_id: sessionId
            });

            console.log('[BillingSuccess] Immediate verification response:', response.data);
            
            setDebugInfo(prev => ({
                ...prev,
                verifyResult: {
                    success: response.data?.ok,
                    active: response.data?.subscription_active,
                    message: response.data?.message,
                    timestamp: new Date().toISOString()
                }
            }));

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
                await checkSubscriptionStatusPolling();
            }
        } catch (error) {
            console.error('[BillingSuccess] Immediate verification failed:', error);
            setDebugInfo(prev => ({
                ...prev,
                verifyResult: {
                    success: false,
                    reason: error.message,
                    timestamp: new Date().toISOString()
                }
            }));
            // エラーの場合もポーリングにフォールバック
            await checkSubscriptionStatusPolling();
        }
    };

    const checkSubscriptionStatusPolling = async () => {
        let attempts = 0;
        const maxAttempts = 10;

        setMessage('支払いを確認中...');

        const checkInterval = setInterval(async () => {
            attempts++;

            try {
                const user = await base44.auth.me();
                console.log(`[BillingSuccess] Polling attempt ${attempts}/${maxAttempts}: subscription_status=${user.subscription_status}, plan=${user.plan}`);
                
                setDebugInfo(prev => ({
                    ...prev,
                    currentStatus: user.subscription_status,
                    currentPlan: user.plan
                }));
                
                if (user.subscription_status === 'active') {
                    console.log('[BillingSuccess] Subscription activated via polling');
                    setSubscriptionActive(true);
                    setChecking(false);
                    setMessage('プレミアムプランが有効になりました');
                    clearInterval(checkInterval);
                    
                    setTimeout(() => {
                        navigate(nextUrl);
                    }, 1500);
                } else if (attempts >= maxAttempts) {
                    console.warn('[BillingSuccess] Max polling attempts reached');
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
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center px-6 py-12">
            <div className="max-w-2xl w-full space-y-4">
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