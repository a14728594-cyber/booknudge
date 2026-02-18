import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Card from '@/components/common/Card';
import { Mail, CheckCircle2 } from 'lucide-react';

export default function Support() {
    const [category, setCategory] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!category || !email || !message.trim()) {
            alert('全ての項目を入力してください');
            return;
        }

        setLoading(true);
        setSuccess(false);

        try {
            const isAuthenticated = await base44.auth.isAuthenticated();
            let userId = null;

            if (isAuthenticated) {
                const user = await base44.auth.me();
                userId = user.id;
            }

            await base44.entities.Inquiry.create({
                user_id: userId,
                email,
                category,
                message: message.trim()
            });

            if (isAuthenticated) {
                await base44.functions.invoke('trackEvent', {
                    event_name: 'inquiry_submit',
                    event_value: { category }
                });
            }

            setSuccess(true);
            setCategory('');
            setMessage('');
            
            setTimeout(() => setSuccess(false), 5000);
        } catch (error) {
            console.error('Error submitting inquiry:', error);
            alert('エラーが発生しました');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-6">
            <div className="max-w-2xl mx-auto">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-2xl mb-4">
                        <Mail className="w-8 h-8 text-indigo-600" />
                    </div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-3">
                        お問い合わせ
                    </h1>
                    <p className="text-lg text-gray-600">
                        ご意見・ご要望をお聞かせください
                    </p>
                </div>

                <Card>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <Label htmlFor="category" className="text-sm font-medium text-gray-700 mb-2 block">
                                カテゴリ
                            </Label>
                            <Select value={category} onValueChange={setCategory}>
                                <SelectTrigger id="category" className="rounded-xl">
                                    <SelectValue placeholder="選択してください" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="bug">バグ報告</SelectItem>
                                    <SelectItem value="idea">機能リクエスト</SelectItem>
                                    <SelectItem value="payment">お支払いについて</SelectItem>
                                    <SelectItem value="other">その他</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="email" className="text-sm font-medium text-gray-700 mb-2 block">
                                メールアドレス
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="your@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="rounded-xl"
                            />
                        </div>

                        <div>
                            <Label htmlFor="message" className="text-sm font-medium text-gray-700 mb-2 block">
                                メッセージ
                            </Label>
                            <Textarea
                                id="message"
                                placeholder="詳しく教えてください..."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                className="min-h-[200px] rounded-xl"
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={loading || !category || !email || !message.trim()}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 rounded-xl py-6 text-lg"
                        >
                            {loading ? '送信中...' : '送信する'}
                        </Button>

                        {success && (
                            <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-xl p-4">
                                <CheckCircle2 className="w-5 h-5" />
                                <span>お問い合わせを受け付けました。ご連絡ありがとうございます。</span>
                            </div>
                        )}
                    </form>
                </Card>
            </div>
        </div>
    );
}