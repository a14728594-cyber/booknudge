import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Loader2, Sparkles } from 'lucide-react';
import SubscriptionGuard from '@/components/common/SubscriptionGuard';
import Card from '@/components/common/Card';

export default function PersonalizedQuiz() {
    return (
        <SubscriptionGuard pagePath="/PersonalizedQuiz">
            <PersonalizedQuizContent />
        </SubscriptionGuard>
    );
}

function PersonalizedQuizContent() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    useEffect(() => {
        base44.auth.me().then(setUser).catch(() => {});
    }, []);

    return (
        <div className="max-w-2xl mx-auto px-6 py-12">
            <div className="flex items-center gap-3 mb-6">
                <button onClick={() => navigate(createPageUrl('quiz'))} className="text-sm text-gray-500 hover:text-gray-700">← クイズトップ</button>
            </div>

            <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">パーソナライズクイズ</h1>
                    <p className="text-sm text-purple-600 font-medium">PRO限定</p>
                </div>
            </div>

            <Card>
                <div className="text-center py-16">
                    <Sparkles className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-800 mb-3">
                        パーソナライズクイズは準備中です
                    </h2>
                    <p className="text-gray-500 text-sm">
                        あなた専用のクイズをまもなく提供予定です。<br />お楽しみに！
                    </p>
                </div>
            </Card>
        </div>
    );
}