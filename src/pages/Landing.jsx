import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowRight, BookOpen, TrendingUp, Users, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function Landing() {
    const navigate = useNavigate();

    const handleStartDiagnosis = async () => {
        const isAuth = await base44.auth.isAuthenticated();
        if (isAuth) {
            navigate(createPageUrl('onboarding'));
        } else {
            base44.auth.redirectToLogin(window.location.origin + '/' + createPageUrl('onboarding'));
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 overflow-hidden">
            {/* Hero */}
            <div className="max-w-7xl mx-auto px-6 py-20 lg:py-28">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    {/* Left: Content */}
                    <div className="text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 bg-white border border-indigo-200 px-5 py-2.5 rounded-full text-sm font-medium mb-8 shadow-sm">
                            <Sparkles className="w-4 h-4 text-indigo-600" />
                            <span className="text-gray-700">ビジネス特化の学習体験</span>
                        </div>
                        
                        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-8 leading-tight">
                            あなた専用の<br />
                            ビジネス学習<br className="hidden lg:block" />サービス
                        </h1>
                        
                        <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                            診断からスタートして、あなたに最適な本を見つけ、毎日ちょっとずつ、楽しく実践しながら学べる
                        </p>
                        
                        <Button size="lg" onClick={handleStartDiagnosis} className="bg-indigo-600 hover:bg-indigo-700 text-lg px-10 py-7 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
                            無料で診断を始める
                            <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>
                    </div>

                    {/* Right: Illustration */}
                    <div className="hidden lg:flex items-center justify-center relative">
                        <div className="relative w-full max-w-lg">
                            {/* Background decoration */}
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-200 to-purple-200 rounded-full blur-3xl opacity-30" />
                            
                            {/* SVG Illustration */}
                            <svg viewBox="0 0 400 400" className="relative z-10 drop-shadow-xl">
                                {/* Book */}
                                <rect x="120" y="150" width="160" height="200" rx="12" fill="#6366f1" opacity="0.9" />
                                <rect x="130" y="160" width="140" height="180" rx="8" fill="white" />
                                <line x1="200" y1="160" x2="200" y2="340" stroke="#e5e7eb" strokeWidth="2" />
                                <rect x="145" y="180" width="45" height="6" rx="3" fill="#e5e7eb" />
                                <rect x="145" y="200" width="35" height="6" rx="3" fill="#e5e7eb" />
                                <rect x="145" y="220" width="40" height="6" rx="3" fill="#e5e7eb" />
                                <rect x="210" y="180" width="45" height="6" rx="3" fill="#e5e7eb" />
                                <rect x="210" y="200" width="35" height="6" rx="3" fill="#e5e7eb" />
                                
                                {/* Slider icon */}
                                <circle cx="80" cy="100" r="40" fill="#a855f7" opacity="0.2" />
                                <rect x="50" y="95" width="60" height="10" rx="5" fill="#a855f7" />
                                <circle cx="90" cy="100" r="15" fill="white" stroke="#a855f7" strokeWidth="3" />
                                
                                {/* Chart icon */}
                                <circle cx="320" cy="280" r="45" fill="#ec4899" opacity="0.2" />
                                <rect x="295" y="290" width="10" height="30" rx="5" fill="#ec4899" />
                                <rect x="310" y="275" width="10" height="45" rx="5" fill="#ec4899" />
                                <rect x="325" y="285" width="10" height="35" rx="5" fill="#ec4899" />
                                
                                {/* Sparkles */}
                                <circle cx="60" cy="250" r="3" fill="#fbbf24" />
                                <circle cx="340" cy="120" r="3" fill="#fbbf24" />
                                <circle cx="180" cy="90" r="2" fill="#fbbf24" />
                                <circle cx="320" cy="350" r="2" fill="#fbbf24" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Features */}
            <div className="max-w-6xl mx-auto px-6 py-16">
                <div className="grid md:grid-cols-3 gap-8">
                    <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                            <BookOpen className="w-6 h-6 text-blue-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-3">
                            あなた専用の本レコメンド
                        </h3>
                        <p className="text-gray-600">
                            診断結果とあなたの目標から、最適な本を10冊厳選してお届けします
                        </p>
                    </div>
                    
                    <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                            <TrendingUp className="w-6 h-6 text-purple-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-3">
                            スライダー式アウトプット
                        </h3>
                        <p className="text-gray-600">
                            正解のないビジネス問題にスライダーで答え、型と次の一手を獲得
                        </p>
                    </div>
                    
                    <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                        <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center mb-4">
                            <Users className="w-6 h-6 text-pink-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-3">
                            他人の回答が見れる
                        </h3>
                        <p className="text-gray-600">
                            同じ問題に対する他のユーザーの回答と理由を見て、視野を広げる
                        </p>
                    </div>
                </div>
            </div>
            
            {/* CTA */}
            <div className="max-w-4xl mx-auto px-6 py-20 text-center">
                <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl p-12 text-white">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">
                        今すぐ始めよう
                    </h2>
                    <p className="text-indigo-100 text-lg mb-8">
                        5分の診断で、あなた専用の学習体験がスタート
                    </p>
                    <Button size="lg" variant="secondary" onClick={handleStartDiagnosis} className="text-lg px-8 py-6 rounded-2xl">
                        無料で診断を始める
                        <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                </div>
            </div>

            {/* Footer */}
            <footer className="bg-gray-50 border-t border-gray-200 py-8 mt-16">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600">
                        <Link to={createPageUrl('terms')} className="hover:text-indigo-600 transition-colors">
                            利用規約
                        </Link>
                        <span className="text-gray-300">|</span>
                        <Link to={createPageUrl('privacy')} className="hover:text-indigo-600 transition-colors">
                            プライバシーポリシー
                        </Link>
                        <span className="text-gray-300">|</span>
                        <Link to={createPageUrl('tokushoho')} className="hover:text-indigo-600 transition-colors">
                            特定商取引法
                        </Link>
                        <span className="text-gray-300">|</span>
                        <Link to={createPageUrl('refund')} className="hover:text-indigo-600 transition-colors">
                            返金・解約
                        </Link>
                    </div>
                    <p className="text-center text-xs text-gray-500 mt-4">
                        © 2026 BookNudge. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}