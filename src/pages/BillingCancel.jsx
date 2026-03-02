import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import Card from '@/components/common/Card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2, CheckCircle } from 'lucide-react';

export default function BillingCancel() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        const userData = await base44.auth.me();
        setUser(userData);
        if (userData.subscription_status !== 'active') {
            navigate(createPageUrl('profile'));
        }
    };

    const handleCancel = async () => {
        setLoading(true);
        setError(null);
        const res = await base44.functions.invoke('cancelSubscription', {});
        if (res.data?.ok) {
            setDone(true);
        } else {
            setError(res.data?.message || 'エラーが発生しました');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
            <div className="max-w-md w-full">
                <Card className="text-center">
                    {done ? (
                        <>
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-10 h-10 text-green-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">解約手続き完了</h2>
                            <p className="text-gray-600 mb-6">
                                現在の契約期間終了まで引き続きご利用いただけます。
                            </p>
                            <Button onClick={() => navigate(createPageUrl('home'))} className="w-full">
                                ホームに戻る
                            </Button>
                        </>
                    ) : (
                        <>
                            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="w-10 h-10 text-yellow-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">サブスクを解約しますか？</h2>
                            <p className="text-gray-600 mb-2">
                                解約すると、現在の契約期間終了後にプレミアム機能が利用できなくなります。
                            </p>
                            <p className="text-sm text-gray-500 mb-8">
                                クイズ・マッチング・DMなどの機能が使えなくなります。
                            </p>

                            {error && (
                                <p className="text-red-600 text-sm mb-4">{error}</p>
                            )}

                            <div className="flex flex-col gap-3">
                                <Button
                                    variant="destructive"
                                    onClick={handleCancel}
                                    disabled={loading}
                                    className="w-full"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                    解約する
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => navigate(-1)}
                                    disabled={loading}
                                    className="w-full"
                                >
                                    キャンセル
                                </Button>
                            </div>
                        </>
                    )}
                </Card>
            </div>
        </div>
    );
}