import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import Card from '@/components/common/Card';
import { AlertCircle, Loader2, CheckCircle } from 'lucide-react';

export default function DebugSentry() {
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState(null);

    const handleSendTestError = async () => {
        setLoading(true);
        setError(null);
        setSent(false);

        try {
            console.log('[DebugSentry] Sending test error to Sentry...');
            const response = await base44.functions.invoke('sentryTest', {});
            console.log('[DebugSentry] Response:', response.data);
            setSent(true);
        } catch (err) {
            console.error('[DebugSentry] Error:', err);
            setError(err.message || 'テストエラーの送信に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 px-6 py-12">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">🔍 Sentry デバッグ</h1>
                <p className="text-gray-600 mb-8">テストエラーを送信して Sentry が正常に機能しているか確認します</p>

                <Card className="text-center py-8">
                    <div className="space-y-6">
                        {sent ? (
                            <>
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                                    <CheckCircle className="w-10 h-10 text-green-600" />
                                </div>
                                <h2 className="text-2xl font-bold text-green-600">送信しました！</h2>
                                <p className="text-gray-600">
                                    テストエラーが Sentry に送信されました。<br />
                                    <a href="https://sentry.io" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline font-semibold">
                                        Sentry ダッシュボード
                                    </a>
                                    で確認できます。
                                </p>
                                <Button
                                    onClick={() => setSent(false)}
                                    variant="outline"
                                    className="mx-auto"
                                >
                                    別のテストを送信
                                </Button>
                            </>
                        ) : error ? (
                            <>
                                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                                    <AlertCircle className="w-10 h-10 text-red-600" />
                                </div>
                                <h2 className="text-2xl font-bold text-red-600">エラーが発生しました</h2>
                                <p className="text-gray-600 font-mono text-sm bg-red-50 p-3 rounded">{error}</p>
                                <Button
                                    onClick={() => setError(null)}
                                    variant="outline"
                                    className="mx-auto"
                                >
                                    再試行
                                </Button>
                            </>
                        ) : (
                            <>
                                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto">
                                    <AlertCircle className="w-10 h-10 text-indigo-600" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">テストエラーを送信</h2>
                                <p className="text-gray-600">
                                    ボタンをクリックするとテストエラーが Sentry に送信されます
                                </p>
                                <Button
                                    onClick={handleSendTestError}
                                    disabled={loading}
                                    variant="destructive"
                                    size="lg"
                                    className="mx-auto gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            送信中...
                                        </>
                                    ) : (
                                        <>
                                            <AlertCircle className="w-5 h-5" />
                                            Sentryにテストエラー送信
                                        </>
                                    )}
                                </Button>
                            </>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}