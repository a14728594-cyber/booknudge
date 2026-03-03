import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, RefreshCw, ExternalLink, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

function InfoRow({ label, value, mono = false, badge = null }) {
    return (
        <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
            <span className="text-sm text-gray-500 font-medium">{label}</span>
            <div className="flex items-center gap-2">
                {badge}
                <span className={`text-sm font-semibold text-gray-900 ${mono ? 'font-mono' : ''}`}>
                    {value ?? '—'}
                </span>
            </div>
        </div>
    );
}

export default function AdminBillingStatus() {
    const navigate = useNavigate();
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [verifyLoading, setVerifyLoading] = useState(false);
    const [verifySessionId, setVerifySessionId] = useState('');
    const [verifyResult, setVerifyResult] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        checkAdminAndLoad();
    }, []);

    const checkAdminAndLoad = async () => {
        try {
            const user = await base44.auth.me();
            if (!user || user.role !== 'admin') {
                navigate(createPageUrl('home'));
                return;
            }
            await loadStatus();
        } catch {
            navigate(createPageUrl('home'));
        }
    };

    const loadStatus = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data } = await base44.functions.invoke('adminBillingStatus', {});
            if (data.error) throw new Error(data.error);
            setStatus(data);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCheckout = async () => {
        setCheckoutLoading(true);
        try {
            const origin = window.location.origin;
            const { data } = await base44.functions.invoke('createCheckoutSession', {
                success_url: `${origin}/?page=AdminBillingStatus&checkout=success`,
                cancel_url: `${origin}/?page=AdminBillingStatus`,
                next: 'AdminBillingStatus'
            });
            if (data?.url) {
                window.location.href = data.url;
            } else {
                alert('Checkout URL not returned: ' + JSON.stringify(data));
            }
        } catch (e) {
            alert('Error: ' + e.message);
        } finally {
            setCheckoutLoading(false);
        }
    };

    const handleVerifySession = async () => {
        const sid = verifySessionId.trim();
        if (!sid) { alert('session_idを入力してください'); return; }
        setVerifyLoading(true);
        setVerifyResult(null);
        try {
            const { data } = await base44.functions.invoke('verifyCheckoutSession', { session_id: sid });
            setVerifyResult(data);
        } catch (e) {
            setVerifyResult({ ok: false, message: e.message });
        } finally {
            setVerifyLoading(false);
        }
    };

    const fmtDate = (d) => d ? new Date(d).toLocaleString('ja-JP') : '—';

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Billing Status</h1>
                        <p className="text-sm text-gray-500 mt-1">Stripe設定・決済フロー診断（管理者専用）</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={loadStatus} className="gap-2">
                        <RefreshCw className="w-4 h-4" />
                        更新
                    </Button>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-2 text-red-700">
                        <XCircle className="w-5 h-5 flex-shrink-0" />
                        {error}
                    </div>
                )}

                {status && (
                    <>
                        {/* Stripe設定 */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <span>⚙️</span> Stripe設定
                            </h2>
                            <div>
                                <InfoRow
                                    label="STRIPE_MODE"
                                    value={status.stripe_mode}
                                    badge={
                                        <Badge className={status.stripe_mode === 'live'
                                            ? 'bg-green-100 text-green-800 border-green-200'
                                            : 'bg-amber-100 text-amber-800 border-amber-200'}>
                                            {status.stripe_mode === 'live' ? 'LIVE' : 'TEST'}
                                        </Badge>
                                    }
                                />
                                <InfoRow label="Secret Key" value={status.secret_key_prefix} mono />
                                <InfoRow label="Webhook Secret" value={status.webhook_secret_prefix} mono />
                                <InfoRow label="Price ID" value={status.price_id} mono />
                                <InfoRow label="有料ユーザー数（DB）" value={`${status.active_subscriptions_count}人`} />
                            </div>
                        </div>

                        {/* 最新決済情報 */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <span>💳</span> 最新決済情報
                            </h2>
                            <div>
                                <InfoRow
                                    label="最新 checkout_session_id"
                                    value={status.last_checkout_session_id
                                        ? status.last_checkout_session_id.substring(0, 30) + '...'
                                        : 'なし'}
                                    mono
                                />
                                <InfoRow label="最新チェックアウト日時" value={fmtDate(status.last_checkout_at)} />
                                <InfoRow
                                    label="最新 verify 結果"
                                    value={status.last_verify.reason}
                                    badge={
                                        status.last_verify.ok
                                            ? <CheckCircle className="w-4 h-4 text-green-500" />
                                            : <XCircle className="w-4 h-4 text-red-500" />
                                    }
                                />
                                <InfoRow label="最新 verify 日時" value={fmtDate(status.last_verify.timestamp)} />
                            </div>
                        </div>

                        {/* Webhook受信履歴 */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <span>📡</span> Webhook受信履歴（直近10件）
                            </h2>
                            {status.webhook_history.length === 0 ? (
                                <p className="text-sm text-gray-400">記録なし</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-left text-gray-400 text-xs border-b">
                                                <th className="pb-2 pr-4">Event Type</th>
                                                <th className="pb-2 pr-4">Stripe Event ID</th>
                                                <th className="pb-2 pr-4">Status</th>
                                                <th className="pb-2">受信日時</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {status.webhook_history.map((wh, i) => (
                                                <tr key={wh.id || i} className="border-b border-gray-50 last:border-0">
                                                    <td className="py-2 pr-4 font-mono text-xs text-indigo-700">{wh.event_type}</td>
                                                    <td className="py-2 pr-4 font-mono text-xs text-gray-500">
                                                        {wh.stripe_event_id
                                                            ? wh.stripe_event_id.substring(0, 20) + '...'
                                                            : '—'}
                                                    </td>
                                                    <td className="py-2 pr-4">
                                                        {wh.status === 'success'
                                                            ? <Badge className="bg-green-100 text-green-700 text-xs">success</Badge>
                                                            : <Badge className="bg-red-100 text-red-700 text-xs">failed</Badge>
                                                        }
                                                        {wh.error_message && (
                                                            <span className="ml-2 text-xs text-red-500">{wh.error_message.substring(0, 40)}</span>
                                                        )}
                                                    </td>
                                                    <td className="py-2 text-xs text-gray-500">{fmtDate(wh.timestamp)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* アクション */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
                    <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                        <span>🧪</span> テスト操作
                    </h2>

                    {/* Checkout作成 */}
                    <div>
                        <p className="text-sm text-gray-600 mb-3">Checkoutセッションを作成して新しいタブで開きます</p>
                        <Button
                            onClick={handleCreateCheckout}
                            disabled={checkoutLoading}
                            className="gap-2 bg-indigo-600 hover:bg-indigo-700"
                        >
                            {checkoutLoading
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <ExternalLink className="w-4 h-4" />
                            }
                            Checkoutを作成して開く
                        </Button>
                    </div>

                    <div className="border-t pt-5">
                        <p className="text-sm text-gray-600 mb-3">session_idを指定してverify実行</p>
                        <div className="flex gap-2">
                            <Input
                                placeholder="cs_test_..."
                                value={verifySessionId}
                                onChange={e => setVerifySessionId(e.target.value)}
                                className="font-mono text-sm flex-1"
                            />
                            <Button
                                onClick={handleVerifySession}
                                disabled={verifyLoading}
                                variant="outline"
                                className="gap-2 whitespace-nowrap"
                            >
                                {verifyLoading
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : <CheckCircle className="w-4 h-4" />
                                }
                                Verify実行
                            </Button>
                        </div>

                        {verifyResult && (
                            <div className={`mt-3 p-4 rounded-lg border text-sm ${
                                verifyResult.ok
                                    ? 'bg-green-50 border-green-200 text-green-800'
                                    : 'bg-red-50 border-red-200 text-red-800'
                            }`}>
                                <div className="flex items-center gap-2 font-bold mb-1">
                                    {verifyResult.ok
                                        ? <CheckCircle className="w-4 h-4" />
                                        : <XCircle className="w-4 h-4" />
                                    }
                                    {verifyResult.ok ? 'Verify成功' : 'Verify失敗'}
                                </div>
                                <pre className="text-xs overflow-auto whitespace-pre-wrap">
                                    {JSON.stringify(verifyResult, null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}