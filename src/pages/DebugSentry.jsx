import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertCircle, CheckCircle } from 'lucide-react';

export default function DebugSentry() {
    const [sent, setSent] = useState(false);
    const [error, setError] = useState(null);

    const [data, setData] = useState(null);

    useEffect(() => {
        const sendTestError = async () => {
            try {
                console.log('[DebugSentry] Sending test error to Sentry...');
                const response = await base44.functions.invoke('sentryTest', {});
                console.log('[DebugSentry] Response:', response.data);
                if (response.data.ok) {
                    setData(response.data);
                    setSent(true);
                } else {
                    setError(response.data.error);
                }
            } catch (err) {
                console.error('[DebugSentry] Error:', err);
                setError(err.message || 'テストエラーの送信に失敗しました');
            }
        };
        sendTestError();
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-6">
            <div className="max-w-2xl mx-auto text-center">
                {sent && data ? (
                    <div className="space-y-4">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle className="w-10 h-10 text-green-600" />
                        </div>
                        <h1 className="text-4xl font-bold text-gray-900">sent (eventId: {data.eventId})</h1>
                        <div className="bg-white rounded-lg p-6 space-y-2 text-left">
                            <p className="text-gray-700"><span className="font-semibold">DSN:</span> {data.dsnPresent ? 'Present ✓' : 'Not present ✗'}</p>
                            <p className="text-gray-700"><span className="font-semibold">Environment:</span> {data.environment}</p>
                            <p className="text-gray-700"><span className="font-semibold">Timestamp:</span> {data.timestamp}</p>
                        </div>
                    </div>
                ) : error ? (
                    <div className="space-y-4">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                            <AlertCircle className="w-10 h-10 text-red-600" />
                        </div>
                        <h1 className="text-3xl font-bold text-red-600">failed: {error}</h1>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                        <h1 className="text-2xl font-bold text-gray-900">送信中...</h1>
                    </div>
                )}
            </div>
        </div>
    );
}