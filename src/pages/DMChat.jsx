import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import SubscriptionGuard from '@/components/common/SubscriptionGuard';
import { ArrowLeft, Send, Loader2, AlertTriangle, Ban } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export default function DMChat() {
    const urlParams = new URLSearchParams(window.location.search);
    const conversationId = urlParams.get('id');
    
    return (
        <SubscriptionGuard pagePath={`/dmchat?id=${conversationId}`}>
            <DMChatContent />
        </SubscriptionGuard>
    );
}

function DMChatContent() {
    const navigate = useNavigate();
    const messagesEndRef = useRef(null);
    const [user, setUser] = useState(null);
    const [conversation, setConversation] = useState(null);
    const [otherUser, setOtherUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [messageText, setMessageText] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [lastSentAt, setLastSentAt] = useState(0);
    const [showBlockDialog, setShowBlockDialog] = useState(false);
    const [showReportDialog, setShowReportDialog] = useState(false);
    const [reportReason, setReportReason] = useState('');

    const urlParams = new URLSearchParams(window.location.search);
    const conversationId = urlParams.get('id');

    useEffect(() => {
        loadData();
        const interval = setInterval(loadMessages, 3000);
        return () => clearInterval(interval);
    }, [conversationId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const loadData = async () => {
        try {
            const userData = await base44.auth.me();
            setUser(userData);

            const conversations = await base44.entities.Conversation.filter({ id: conversationId });
            if (conversations.length === 0) {
                navigate(createPageUrl('dm'));
                return;
            }

            const conv = conversations[0];
            setConversation(conv);

            const otherId = conv.user1_id === userData.id ? conv.user2_id : conv.user1_id;
            const otherUsers = await base44.entities.User.filter({ id: otherId });
            setOtherUser(otherUsers[0]);

            await loadMessages();
        } catch (error) {
            console.error('Failed to load chat:', error);
        }
        setLoading(false);
    };

    const loadMessages = async () => {
        try {
            const msgs = await base44.entities.Message.filter({ conversation_id: conversationId });
            msgs.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
            setMessages(msgs);
        } catch (error) {
            console.error('Failed to load messages:', error);
        }
    };

    const handleSend = async () => {
        if (!messageText.trim() || messageText.length > 300) {
            return;
        }

        // クールダウンチェック（3秒）
        const now = Date.now();
        if (now - lastSentAt < 3000) {
            alert('メッセージの送信は3秒に1回までです');
            return;
        }

        setSending(true);
        try {
            const response = await base44.functions.invoke('sendMessage', {
                conversation_id: conversationId,
                content: messageText.trim()
            });

            if (response.data.error) {
                alert(response.data.error);
            } else {
                setMessageText('');
                setLastSentAt(now);
                await loadMessages();
            }
        } catch (error) {
            console.error('Failed to send message:', error);
            alert('メッセージの送信に失敗しました');
        }
        setSending(false);
    };

    const handleBlock = async () => {
        try {
            await base44.entities.Block.create({
                blocker_user_id: user.id,
                blocked_user_id: otherUser.id
            });

            await base44.functions.invoke('trackEvent', {
                event_name: 'block_user',
                event_value: { blocked_user_id: otherUser.id }
            });

            alert('ユーザーをブロックしました');
            navigate(createPageUrl('dm'));
        } catch (error) {
            console.error('Failed to block user:', error);
            alert('ブロックに失敗しました');
        }
        setShowBlockDialog(false);
    };

    const handleReport = async () => {
        if (!reportReason.trim()) {
            alert('通報理由を入力してください');
            return;
        }

        try {
            await base44.entities.Report.create({
                reporter_user_id: user.id,
                target_user_id: otherUser.id,
                reason: reportReason.trim()
            });

            await base44.functions.invoke('trackEvent', {
                event_name: 'report_user',
                event_value: { target_user_id: otherUser.id }
            });

            alert('通報を受け付けました');
            setReportReason('');
        } catch (error) {
            console.error('Failed to report user:', error);
            alert('通報に失敗しました');
        }
        setShowReportDialog(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto h-[calc(100vh-80px)] flex flex-col">
            {/* ヘッダー */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(createPageUrl('dm'))}
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <button
                        onClick={() => navigate(createPageUrl('profile') + '?userId=' + otherUser.id)}
                        className="font-semibold text-gray-900 hover:text-indigo-600 transition-colors"
                    >
                        {otherUser?.display_name || otherUser?.full_name || '不明なユーザー'}
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowReportDialog(true)}
                    >
                        <AlertTriangle className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowBlockDialog(true)}
                    >
                        <Ban className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* メッセージ一覧 */}
            <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50">
                <div className="space-y-4">
                    {messages.map(msg => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                                    msg.sender_id === user.id
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-white text-gray-900 border border-gray-200'
                                }`}
                            >
                                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                <p
                                    className={`text-xs mt-1 ${
                                        msg.sender_id === user.id ? 'text-indigo-200' : 'text-gray-500'
                                    }`}
                                >
                                    {new Date(msg.created_date).toLocaleTimeString('ja-JP', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </p>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* 入力エリア */}
            <div className="bg-white border-t border-gray-200 px-6 py-4">
                <div className="flex gap-2">
                    <Textarea
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        placeholder="メッセージを入力..."
                        maxLength={300}
                        rows={2}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                    />
                    <Button
                        onClick={handleSend}
                        disabled={!messageText.trim() || messageText.length > 300 || sending}
                        className="self-end"
                    >
                        {sending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                    </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                    {messageText.length} / 300
                </p>
            </div>

            {/* ブロック確認ダイアログ */}
            <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>ユーザーをブロック</DialogTitle>
                        <DialogDescription>
                            このユーザーをブロックしますか？ブロック後はメッセージのやり取りができなくなります。
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowBlockDialog(false)}>
                            キャンセル
                        </Button>
                        <Button variant="destructive" onClick={handleBlock}>
                            ブロック
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 通報ダイアログ */}
            <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>ユーザーを通報</DialogTitle>
                        <DialogDescription>
                            通報理由を入力してください
                        </DialogDescription>
                    </DialogHeader>
                    <Textarea
                        value={reportReason}
                        onChange={(e) => setReportReason(e.target.value)}
                        placeholder="通報理由を入力..."
                        rows={4}
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowReportDialog(false)}>
                            キャンセル
                        </Button>
                        <Button onClick={handleReport}>
                            通報する
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}