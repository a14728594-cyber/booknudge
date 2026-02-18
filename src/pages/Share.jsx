import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Card from '@/components/common/Card';
import { Share2, CheckCircle2 } from 'lucide-react';

export default function Share() {
    const [source, setSource] = useState('tiktok');
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!url.trim()) {
            alert('URLを入力してください');
            return;
        }

        setLoading(true);
        setSuccess(false);

        try {
            const user = await base44.auth.me();

            await base44.entities.SharedLink.create({
                user_id: user.id,
                source,
                url: url.trim()
            });

            await base44.functions.invoke('trackEvent', {
                event_name: 'share_submit',
                event_value: { source, url: url.trim() }
            });

            setSuccess(true);
            setUrl('');
            setTimeout(() => setSuccess(false), 3000);
        } catch (error) {
            console.error('Error sharing link:', error);
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
                        <Share2 className="w-8 h-8 text-indigo-600" />
                    </div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-3">
                        URL共有
                    </h1>
                    <p className="text-lg text-gray-600">
                        TikTokやXで見かけた本のURLを共有してください
                    </p>
                </div>

                <Card>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <Label htmlFor="source" className="text-sm font-medium text-gray-700 mb-2 block">
                                ソース
                            </Label>
                            <Select value={source} onValueChange={setSource}>
                                <SelectTrigger id="source" className="rounded-xl">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="tiktok">TikTok</SelectItem>
                                    <SelectItem value="x">X (Twitter)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="url" className="text-sm font-medium text-gray-700 mb-2 block">
                                URL
                            </Label>
                            <Input
                                id="url"
                                type="url"
                                placeholder="https://..."
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                className="rounded-xl"
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={loading || !url.trim()}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 rounded-xl py-6 text-lg"
                        >
                            {loading ? '送信中...' : '共有する'}
                        </Button>

                        {success && (
                            <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-xl p-4">
                                <CheckCircle2 className="w-5 h-5" />
                                <span>共有しました！</span>
                            </div>
                        )}
                    </form>
                </Card>

                <div className="mt-8 bg-blue-50 rounded-2xl p-6">
                    <h3 className="font-semibold text-blue-900 mb-2">
                        なぜURL共有？
                    </h3>
                    <p className="text-blue-800 text-sm">
                        みんなが注目している本を見つけるため、TikTokやXでシェアされている本のURLを集めています。
                        あなたの共有が、他のユーザーの学びのヒントになります。
                    </p>
                </div>
            </div>
        </div>
    );
}