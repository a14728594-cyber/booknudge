import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertCircle, Zap, Loader2 } from 'lucide-react';

export default function AdminDebug() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const handleSentryTest = async () => {
        setLoading(true);
        setResult(null);
        setError(null);

        try {
            console.log('[AdminDebug] Sending test error to Sentry...');
            const response = await base44.functions.invoke('sentryTest', {});
            
            console.log('[AdminDebug] Sentry test response:', response.data);
            
            setResult({
                ok: response.data.ok,
                message: response.data.message,
                dsn_configured: response.data.dsn_configured,
                timestamp: new Date().toLocaleTimeString('ja-JP')
            });
        } catch (err) {
            console.error('[AdminDebug] Error sending test to Sentry:', err);
            setError(err.message || 'Failed to send test error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 px-6 py-12">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">🔧 デバッグ＆監視</h1>

                {/* Sentry テスト */}
                <Card className="mb-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                <Zap className="w-5 h-5 text-yellow-600" />
                                Sentry テスト
                            </h2>
                            <p className="text-sm text-gray-600 mb-4">
                                テストエラーを Sentry に送信して、監視が正常に機能しているか確認します。
                            </p>
                            <Button
                                onClick={handleSentryTest}
                                disabled={loading}
                                variant="destructive"
                                className="gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        送信中...
                                    </>
                                ) : (
                                    <>
                                        <AlertCircle className="w-4 h-4" />
                                        テストエラー送信
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* 結果 */}
                    {result && (
                        <div className="mt-6 pt-6 border-t border-gray-200">
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <h3 className="text-sm font-semibold text-green-900 mb-3">✓ 送信成功</h3>
                                <div className="space-y-2 text-sm text-green-800 font-mono">
                                    <div className="flex justify-between py-1">
                                        <span>ステータス:</span>
                                        <span className="font-semibold">{result.ok ? '成功' : '失敗'}</span>
                                    </div>
                                    <div className="flex justify-between py-1">
                                        <span>メッセージ:</span>
                                        <span className="font-semibold">{result.message}</span>
                                    </div>
                                    <div className="flex justify-between py-1">
                                        <span>DSN 設定:</span>
                                        <span className={`font-semibold ${result.dsn_configured ? 'text-green-600' : 'text-red-600'}`}>
                                            {result.dsn_configured ? '✓ あり' : '✗ なし'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between py-1 border-t border-green-200 mt-2 pt-2">
                                        <span>送信時刻:</span>
                                        <span className="font-semibold">{result.timestamp}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* エラー */}
                    {error && (
                        <div className="mt-6 pt-6 border-t border-gray-200">
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <h3 className="text-sm font-semibold text-red-900 mb-2">✗ エラー</h3>
                                <p className="text-sm text-red-800 font-mono">{error}</p>
                            </div>
                        </div>
                    )}
                </Card>

                {/* 使用方法 */}
                <Card className="bg-blue-50 border-blue-200">
                    <h3 className="text-sm font-semibold text-blue-900 mb-3">📖 使用方法</h3>
                    <ul className="text-sm text-blue-800 space-y-2">
                        <li>1. 上の「テストエラー送信」ボタンを押す</li>
                        <li>2. Sentry にテストエラーが届く（DSN が設定されている場合）</li>
                        <li>3. <a href="https://sentry.io" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Sentry ダッシュボード</a> でエラーを確認</li>
                        <li>4. 問題があれば SENTRY_DSN を確認</li>
                    </ul>
                </Card>
            </div>
        </div>
    );
}