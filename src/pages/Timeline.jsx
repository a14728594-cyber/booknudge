import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Card from '@/components/common/Card';
import DomainBadge from '@/components/common/DomainBadge';
import { Loader2, User } from 'lucide-react';

export default function Timeline() {
    const [answers, setAnswers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [domainFilter, setDomainFilter] = useState('all');

    useEffect(() => {
        loadAnswers();
    }, [domainFilter]);

    const loadAnswers = async () => {
        setLoading(true);
        try {
            const filter = domainFilter !== 'all' ? { domain: domainFilter } : {};
            const allAnswers = await base44.entities.Answer.filter(filter, '-created_date', 50);
            setAnswers(allAnswers);
        } catch (error) {
            console.error('Error loading answers:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-6">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-6">
                        みんなの回答
                    </h1>
                    
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-gray-700">
                            ジャンルでフィルタ:
                        </span>
                        <Select value={domainFilter} onValueChange={setDomainFilter}>
                            <SelectTrigger className="w-48 rounded-xl">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">全て</SelectItem>
                                <SelectItem value="sales">セールス</SelectItem>
                                <SelectItem value="marketing">マーケティング</SelectItem>
                                <SelectItem value="relationships">人間関係</SelectItem>
                                <SelectItem value="mindset">マインドセット</SelectItem>
                                <SelectItem value="habits">習慣</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                    </div>
                ) : answers.length > 0 ? (
                    <div className="space-y-4">
                        {answers.map(answer => (
                            <Card key={answer.id}>
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <User className="w-5 h-5 text-gray-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <DomainBadge domain={answer.domain} />
                                            <span className="text-sm text-gray-500">
                                                {new Date(answer.created_date).toLocaleDateString('ja-JP')}
                                            </span>
                                        </div>
                                        <p className="text-gray-700 mb-3 line-clamp-2">
                                            {answer.question_text}
                                        </p>
                                        <div className="bg-indigo-50 rounded-xl p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium text-gray-600">
                                                    スライダー値
                                                </span>
                                                <span className="text-2xl font-bold text-indigo-600">
                                                    {answer.slider_value}
                                                </span>
                                            </div>
                                            {answer.reason_text && (
                                                <p className="text-sm text-gray-700">
                                                    {answer.reason_text}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 text-gray-600">
                        回答がまだありません
                    </div>
                )}
            </div>
        </div>
    );
}