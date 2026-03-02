import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';

export default function QuizPaywall({ type = 'distribution' }) {
    const navigate = useNavigate();

    return (
        <div className="bg-gradient-to-br from-gray-100 to-gray-50 border border-gray-300 rounded-lg p-6 backdrop-blur-sm">
            <div className="text-center space-y-4">
                <div className="flex justify-center mb-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                        <Lock className="w-6 h-6 text-gray-600" />
                    </div>
                </div>

                {type === 'distribution' && (
                    <>
                        <h4 className="text-lg font-semibold text-gray-900">
                            他ユーザーの回答分布は Pro専用
                        </h4>
                        <p className="text-sm text-gray-600 max-w-sm mx-auto">
                            他のユーザーがどう答えているかを見ることで、より深い洞察が得られます。
                        </p>
                    </>
                )}

                {type === 'limit' && (
                    <>
                        <h4 className="text-lg font-semibold text-gray-900">
                            本日の回答上限に達しました
                        </h4>
                        <p className="text-sm text-gray-600 max-w-sm mx-auto">
                            Free プランは1日5問まで。制限なく回答するには Pro にアップグレードしてください。
                        </p>
                    </>
                )}

                <Button
                    onClick={() => navigate(createPageUrl('paywall') + '?from=quiz')}
                    className="bg-indigo-600 hover:bg-indigo-700"
                >
                    Pro にアップグレード（月1,200円）
                </Button>
            </div>
        </div>
    );
}