import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import Card from '@/components/common/Card';
import { Button } from '@/components/ui/button';
import SubscriptionGuard from '@/components/common/SubscriptionGuard';
import { MessageSquare, Loader2 } from 'lucide-react';
import PullToRefresh from '@/components/common/PullToRefresh';

export default function DM() {
    return (
        <SubscriptionGuard pagePath="/dm">
            <DMContent />
        </SubscriptionGuard>
    );
}

function DMContent() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const userData = await base44.auth.me();
            setUser(userData);

            // 自分が参加している会話を取得
            const allConversations = await base44.entities.Conversation.filter({});
            const myConversations = allConversations.filter(c =>
                c.user1_id === userData.id || c.user2_id === userData.id
            );

            // 相手のユーザー情報と最新メッセージを取得
            const conversationsWithData = await Promise.all(
                myConversations.map(async (conv) => {
                    const otherId = conv.user1_id === userData.id ? conv.user2_id : conv.user1_id;
                    const otherUsers = await base44.entities.User.filter({ id: otherId });
                    const otherUser = otherUsers[0];

                    const messages = await base44.entities.Message.filter({ conversation_id: conv.id });
                    const lastMessage = messages.sort((a, b) =>
                        new Date(b.created_date) - new Date(a.created_date)
                    )[0];

                    return {
                        ...conv,
                        otherUser,
                        lastMessage
                    };
                })
            );

            // last_message_at で降順ソート
            conversationsWithData.sort((a, b) =>
                new Date(b.last_message_at || b.created_date) - new Date(a.last_message_at || a.created_date)
            );

            setConversations(conversationsWithData);

            await base44.functions.invoke('trackEvent', {
                event_name: 'dm_open',
                event_value: {}
            });
        } catch (error) {
            console.error('Failed to load DM:', error);
        }
        setLoading(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-6 py-8">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                    <MessageSquare className="w-8 h-8" />
                    ダイレクトメッセージ
                </h1>
            </div>

            <Card>
                {conversations.length > 0 ? (
                    <div className="divide-y">
                        {conversations.map(conv => (
                            <button
                                key={conv.id}
                                onClick={() => navigate(createPageUrl('dmchat') + '?id=' + conv.id)}
                                className="w-full p-4 hover:bg-gray-50 transition-colors text-left"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-900 mb-1">
                                            {conv.otherUser?.display_name || conv.otherUser?.full_name || '不明なユーザー'}
                                        </h3>
                                        {conv.lastMessage && (
                                            <p className="text-sm text-gray-600 line-clamp-1">
                                                {conv.lastMessage.sender_id === user.id && 'あなた: '}
                                                {conv.lastMessage.content}
                                            </p>
                                        )}
                                    </div>
                                    <span className="text-xs text-gray-500 whitespace-nowrap ml-4">
                                        {new Date(conv.last_message_at || conv.created_date).toLocaleDateString('ja-JP', {
                                            month: 'short',
                                            day: 'numeric'
                                        })}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600 mb-2">まだメッセージがありません</p>
                        <p className="text-sm text-gray-500">
                            相互フォローしているユーザーとメッセージできます
                        </p>
                    </div>
                )}
            </Card>
        </div>
    );
}