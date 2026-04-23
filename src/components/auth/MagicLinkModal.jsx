import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Mail, ArrowRight, Loader2, CheckCircle2, RotateCcw } from 'lucide-react';

const STEP = { EMAIL: 'email', OTP: 'otp', DONE: 'done' };

function generateTempPassword() {
    return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2).toUpperCase() + '!9';
}

export default function MagicLinkModal({ onClose, onSuccess, redirectAfter }) {
    const [step, setStep] = useState(STEP.EMAIL);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [tempPassword, setTempPassword] = useState('');

    const handleSendCode = async (e) => {
        e.preventDefault();
        if (!email.trim()) return;
        setLoading(true);
        setError('');

        const normalizedEmail = email.trim().toLowerCase();

        // まず新規登録を試みる（新規ユーザー）
        try {
            const pw = generateTempPassword();
            setTempPassword(pw);
            await base44.auth.register({ email: normalizedEmail, password: pw });
            setStep(STEP.OTP);
            setLoading(false);
            return;
        } catch (regErr) {
            // "already exists" → 既存ユーザー
        }

        // 既存ユーザー → メッセージ表示後にログインページへリダイレクト
        setLoading(false);
        setError('すでに登録済みのメールアドレスです。ログインページへ移動します...');
        setTimeout(() => {
            base44.auth.redirectToLogin(window.location.href);
        }, 2000);
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (otp.length < 4) return;
        setLoading(true);
        setError('');

        try {
            await base44.auth.verifyOtp({ email: email.trim().toLowerCase(), otpCode: otp.trim() });
            setStep(STEP.DONE);
            setTimeout(() => {
                if (onSuccess) onSuccess();
                else if (redirectAfter) window.location.href = redirectAfter;
                else window.location.href = '/home';
            }, 1500);
        } catch {
            setError('コードが正しくないか、有効期限が切れています。もう一度お試しください。');
        }
        setLoading(false);
    };

    const handleResend = async () => {
        setLoading(true);
        setError('');
        try {
            await base44.auth.resendOtp(email.trim().toLowerCase());
        } catch {
            setError('再送信に失敗しました。');
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 pb-8 sm:p-8">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {step === STEP.DONE ? (
                    <div className="text-center py-4">
                        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-gray-900 mb-2">ログイン完了！</h2>
                        <p className="text-gray-500 text-sm">結果ページに移動しています...</p>
                    </div>
                ) : step === STEP.OTP ? (
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                                <Mail className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">メールを確認してください</h2>
                                <p className="text-xs text-gray-400">確認コードを送信しました</p>
                            </div>
                        </div>

                        <div className="bg-indigo-50 rounded-2xl p-4 mb-5 text-center">
                            <p className="text-sm text-indigo-700 font-medium">{email}</p>
                            <p className="text-xs text-indigo-500 mt-1">に確認コードを送りました</p>
                        </div>

                        <form onSubmit={handleVerifyOtp} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    確認コード（メールに記載の数字）
                                </label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={otp}
                                    onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    placeholder="123456"
                                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                                    autoFocus
                                />
                            </div>

                            {error && (
                                <p className="text-sm text-red-500 text-center">{error}</p>
                            )}

                            <button
                                type="submit"
                                disabled={loading || otp.length < 4}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>
                                    <span>ログインする</span>
                                    <ArrowRight className="w-5 h-5" />
                                </>}
                            </button>
                        </form>

                        <div className="mt-4 text-center space-y-2">
                            <button
                                onClick={handleResend}
                                disabled={loading}
                                className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 mx-auto transition-colors"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                コードを再送する
                            </button>
                            <button
                                onClick={() => { setStep(STEP.EMAIL); setOtp(''); setError(''); }}
                                className="text-xs text-gray-400 hover:text-gray-600 transition-colors block mx-auto"
                            >
                                メールアドレスを変更する
                            </button>
                        </div>

                        <p className="text-center text-xs text-gray-400 mt-4">
                            迷惑メールフォルダも確認してください
                        </p>
                    </div>
                ) : (
                    <div>
                        {/* Icon + title */}
                        <div className="text-center mb-6">
                            <div className="text-4xl mb-3">📩</div>
                            <h2 className="text-xl font-bold text-gray-900 mb-1">
                                メールアドレスを入力するだけ
                            </h2>
                            <p className="text-sm text-gray-500">パスワードは不要です</p>
                        </div>

                        <form onSubmit={handleSendCode} className="space-y-4">
                            <div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="メールアドレスを入力"
                                    className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                                    autoFocus
                                    autoComplete="email"
                                />
                            </div>

                            {error && (
                                <p className="text-sm text-red-500 text-center">{error}</p>
                            )}

                            <button
                                type="submit"
                                disabled={loading || !email.trim()}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-100"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>
                                    <span>確認コードを送る</span>
                                    <ArrowRight className="w-5 h-5" />
                                </>}
                            </button>
                        </form>

                        {/* Trust signals */}
                        <div className="mt-5 grid grid-cols-3 gap-2">
                            {[
                                { icon: '⚡', text: '10秒で完了' },
                                { icon: '🔒', text: 'パスワード不要' },
                                { icon: '🚪', text: 'いつでも退会可' },
                            ].map(item => (
                                <div key={item.text} className="bg-gray-50 rounded-xl p-2.5 text-center">
                                    <div className="text-lg mb-0.5">{item.icon}</div>
                                    <div className="text-xs text-gray-500 font-medium leading-tight">{item.text}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}