import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ArrowRight, Loader2, RotateCcw, Mail } from 'lucide-react';
import { trackAnonymousEvent, getAnonymousId } from '@/lib/analytics';

const STEP = { EMAIL: 'email', OTP: 'otp', DONE: 'done' };

function generateTempPassword() {
    return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2).toUpperCase() + '!9';
}

export default function InlineRegistrationWall({ mainTypeInfo, sameTypeCount, onRegistered }) {
    const [step, setStep] = useState(STEP.EMAIL);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSendCode = async (e) => {
        e.preventDefault();
        if (!email.trim()) return;
        setLoading(true);
        setError('');
        trackAnonymousEvent('email_input_start', { event_value: { email_domain: email.split('@')[1] } });

        const normalizedEmail = email.trim().toLowerCase();

        // 新規・既存ユーザーどちらも register を呼ぶ
        // 既存ユーザーにも新しい OTP が発行・送信される
        try {
            const pw = generateTempPassword();
            await base44.auth.register({ email: normalizedEmail, password: pw });
            setStep(STEP.OTP);
            trackAnonymousEvent('magic_link_sent', { event_value: {} });
        } catch (regErr) {
            console.error('[Auth] register failed:', regErr?.message);
            setError('メールの送信に失敗しました。しばらく後に再試行してください。');
        }
        setLoading(false);
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (otp.length < 4) return;
        setLoading(true);
        setError('');

        try {
            await base44.auth.verifyOtp({ email: email.trim().toLowerCase(), otpCode: otp.trim() });
            setStep(STEP.DONE);
            trackAnonymousEvent('registration_complete', { event_value: { anonymous_id: getAnonymousId() } });
            setTimeout(() => {
                if (onRegistered) onRegistered();
            }, 1000);
        } catch {
            setError('コードが正しくないか、有効期限が切れています。');
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setLoading(true);
        try {
            await base44.auth.resendOtp(email.trim().toLowerCase());
            setError('');
        } catch {
            setError('再送信に失敗しました。');
        }
        setLoading(false);
    };

    if (step === STEP.DONE) {
        return (
            <div className="text-center py-8">
                <div className="text-5xl mb-3">🎉</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">あなた専用の診断レポートが完成しました</h3>
                <p className="text-sm text-gray-500">ぼかしが外れています...</p>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-6 text-white shadow-xl shadow-indigo-200">
            {/* ロック解除アイコン */}
            <div className="text-center mb-5">
                <div className="text-4xl mb-2">🔓</div>
                <h3 className="text-xl font-bold mb-1">続きを見るにはメールアドレスだけ</h3>
                <p className="text-indigo-200 text-sm">パスワード不要・10秒で完了</p>
            </div>

            {/* 続きに何があるか */}
            <div className="bg-white/15 rounded-2xl p-4 mb-5 space-y-2">
                {[
                    'あなたの悩みの本質（なぜそうなるのか）',
                    '明日からできる具体的な一歩',
                    'あなたに合う本3冊',
                    'ビジネスストーリーゲーム',
                ].map(item => (
                    <div key={item} className="flex items-center gap-2.5 text-sm">
                        <span className="text-green-300 font-bold flex-shrink-0">✓</span>
                        <span className="text-indigo-100">{item}</span>
                    </div>
                ))}
            </div>

            {/* ソーシャルプルーフ */}
            {sameTypeCount > 5 && (
                <div className="text-center text-xs text-indigo-200 mb-4">
                    同じタイプと診断された <span className="text-white font-bold">{sameTypeCount}人</span> が結果を保存しています
                </div>
            )}

            {/* フォーム */}
            {step === STEP.EMAIL ? (
                <form onSubmit={handleSendCode} className="space-y-3">
                    <input
                        type="email"
                        value={email}
                        onChange={e => { setEmail(e.target.value); setError(''); }}
                        placeholder="your@email.com"
                        autoComplete="email"
                        className="w-full bg-white text-gray-900 placeholder-gray-400 border-0 rounded-2xl px-4 py-4 text-base focus:outline-none focus:ring-2 focus:ring-white/50"
                    />
                    <button
                        type="submit"
                        disabled={loading || !email.trim()}
                        className="w-full bg-white text-indigo-700 font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed text-base shadow-lg"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>
                            <span>続きを見る</span>
                            <ArrowRight className="w-5 h-5" />
                        </>}
                    </button>
                    {error && <p className="text-red-300 text-xs text-center">{error}</p>}
                    {/* 損失回避ナッジ（ソフトに） */}
                    <p className="text-center text-xs text-indigo-300/70">
                        💡 診断結果はブラウザを閉じると消える場合があります
                    </p>
                </form>
            ) : (
                <div>
                    <div className="bg-white/15 rounded-2xl p-3 mb-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                            <Mail className="w-4 h-4 text-indigo-200" />
                            <p className="text-sm text-indigo-100">{email} に確認コードを送りました</p>
                        </div>
                    </div>
                    <form onSubmit={handleVerifyOtp} className="space-y-3">
                        <input
                            type="text"
                            inputMode="numeric"
                            value={otp}
                            onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="確認コード（6桁）"
                            className="w-full bg-white text-gray-900 placeholder-gray-400 border-0 rounded-2xl px-4 py-4 text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-white/50"
                            autoFocus
                        />
                        {error && <p className="text-red-300 text-sm text-center">{error}</p>}
                        <button
                            type="submit"
                            disabled={loading || otp.length < 4}
                            className="w-full bg-white text-indigo-700 font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>
                                <span>続きを見る</span>
                                <ArrowRight className="w-5 h-5" />
                            </>}
                        </button>
                    </form>
                    <div className="flex justify-center gap-4 mt-3">
                        <button onClick={handleResend} disabled={loading} className="text-xs text-indigo-200 hover:text-white flex items-center gap-1">
                            <RotateCcw className="w-3 h-3" /> 再送信
                        </button>
                        <button onClick={() => { setStep(STEP.EMAIL); setOtp(''); setError(''); }} className="text-xs text-indigo-200 hover:text-white">
                            メール変更
                        </button>
                    </div>
                    <p className="text-center text-xs text-indigo-300 mt-3">迷惑メールフォルダも確認してください</p>
                </div>
            )}
        </div>
    );
}