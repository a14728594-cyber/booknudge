import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowRight, BookOpen, TrendingUp, Users, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Landing() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
            {/* Hero */}
            <div className="max-w-5xl mx-auto px-6 py-20 text-center">
                <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
                    <Sparkles className="w-4 h-4" />
                    <span>ビジネス特化の学習体験</span>
                </div>
                
                <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                    あなた専用の<br />
                    ビジネス学習サービス
                </h1>
                
                <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
                    診断からスタートして、あなたに最適な本を見つけ、<br />
                    Duolingo的に楽しくアウトプットしながら学べる
                </p>
                
                <Link to={createPageUrl('onboarding')}>
                    <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-lg px-8 py-6 rounded-2xl">
                        無料で診断を始める
                        <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                </Link>
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
                    <Link to={createPageUrl('onboarding')}>
                        <Button size="lg" variant="secondary" className="text-lg px-8 py-6 rounded-2xl">
                            無料で診断を始める
                            <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}