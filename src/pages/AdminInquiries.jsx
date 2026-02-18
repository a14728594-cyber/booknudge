import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import Card from '@/components/common/Card';
import { Badge } from '@/components/ui/badge';
import { Mail, Clock, CheckCircle2, Loader2 } from 'lucide-react';

export default function AdminInquiries() {
    const navigate = useNavigate();
    const [inquiries, setInquiries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedInquiry, setSelectedInquiry] = useState(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const [adminNote, setAdminNote] = useState('');
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        checkAdmin();
    }, []);

    const checkAdmin = async () => {
        try {
            const user = await base44.auth.me();
            if (user.role !== 'admin') {
                navigate(createPageUrl('home'));
                return;
            }
            loadInquiries();
        } catch (error) {
            navigate(createPageUrl('landing'));
        }
    };

    const loadInquiries = async () => {
        try {
            const allInquiries = await base44.entities.Inquiry.list('-created_date', 200);
            setInquiries(allInquiries);
        } catch (error) {
            console.error('Error loading inquiries:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (inquiryId, newStatus) => {
        setUpdating(true);
        try {
            await base44.entities.Inquiry.update(inquiryId, { status: newStatus });
            setInquiries(prev => prev.map(inq => 
                inq.id === inquiryId ? { ...inq, status: newStatus } : inq
            ));
            if (selectedInquiry?.id === inquiryId) {
                setSelectedInquiry(prev => ({ ...prev, status: newStatus }));
            }
        } catch (error) {
            console.error('Error updating status:', error);
            alert('ステータスの更新に失敗しました');
        } finally {
            setUpdating(false);
        }
    };

    const handleSaveNote = async () => {
        if (!selectedInquiry) return;
        
        setUpdating(true);
        try {
            await base44.entities.Inquiry.update(selectedInquiry.id, { 
                admin_note: adminNote 
            });
            setInquiries(prev => prev.map(inq => 
                inq.id === selectedInquiry.id ? { ...inq, admin_note: adminNote } : inq
            ));
            setSelectedInquiry(prev => ({ ...prev, admin_note: adminNote }));
            alert('メモを保存しました');
        } catch (error) {
            console.error('Error saving note:', error);
            alert('メモの保存に失敗しました');
        } finally {
            setUpdating(false);
        }
    };

    const filteredInquiries = statusFilter === 'all' 
        ? inquiries 
        : inquiries.filter(inq => inq.status === statusFilter);

    const statusColors = {
        open: 'bg-red-100 text-red-700',
        doing: 'bg-yellow-100 text-yellow-700',
        done: 'bg-green-100 text-green-700'
    };

    const statusLabels = {
        open: '未対応',
        doing: '対応中',
        done: '完了'
    };

    const categoryLabels = {
        bug: 'バグ報告',
        idea: '機能リクエスト',
        payment: 'お支払い',
        other: 'その他'
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <p className="text-gray-600">読み込み中...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-6">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">
                    問い合わせ管理
                </h1>

                <div className="grid lg:grid-cols-2 gap-6">
                    {/* List */}
                    <div className="space-y-4">
                        <Card>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="rounded-xl">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">全てのステータス</SelectItem>
                                    <SelectItem value="open">未対応</SelectItem>
                                    <SelectItem value="doing">対応中</SelectItem>
                                    <SelectItem value="done">完了</SelectItem>
                                </SelectContent>
                            </Select>
                        </Card>

                        <div className="space-y-3">
                            {filteredInquiries.map(inquiry => (
                                <Card
                                    key={inquiry.id}
                                    className={`cursor-pointer hover:shadow-md transition-shadow ${
                                        selectedInquiry?.id === inquiry.id ? 'ring-2 ring-indigo-500' : ''
                                    }`}
                                    onClick={() => {
                                        setSelectedInquiry(inquiry);
                                        setAdminNote(inquiry.admin_note || '');
                                    }}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <Mail className="w-4 h-4 text-gray-400" />
                                            <span className="font-medium text-sm">{inquiry.email}</span>
                                        </div>
                                        <Badge className={statusColors[inquiry.status]}>
                                            {statusLabels[inquiry.status]}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge variant="outline" className="text-xs">
                                            {categoryLabels[inquiry.category]}
                                        </Badge>
                                        <span className="text-xs text-gray-500">
                                            {new Date(inquiry.created_date).toLocaleDateString('ja-JP')}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-700 line-clamp-2">
                                        {inquiry.message}
                                    </p>
                                </Card>
                            ))}
                            
                            {filteredInquiries.length === 0 && (
                                <div className="text-center py-12 text-gray-600">
                                    問い合わせがありません
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Detail */}
                    <div className="lg:sticky lg:top-8 h-fit">
                        {selectedInquiry ? (
                            <Card>
                                <div className="mb-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-xl font-bold text-gray-900">
                                            問い合わせ詳細
                                        </h3>
                                        <Badge className={statusColors[selectedInquiry.status]}>
                                            {statusLabels[selectedInquiry.status]}
                                        </Badge>
                                    </div>
                                    
                                    <div className="space-y-3 mb-6">
                                        <div>
                                            <span className="text-sm text-gray-600">メール:</span>
                                            <p className="font-medium">{selectedInquiry.email}</p>
                                        </div>
                                        <div>
                                            <span className="text-sm text-gray-600">カテゴリ:</span>
                                            <p className="font-medium">{categoryLabels[selectedInquiry.category]}</p>
                                        </div>
                                        <div>
                                            <span className="text-sm text-gray-600">受信日:</span>
                                            <p className="font-medium">
                                                {new Date(selectedInquiry.created_date).toLocaleString('ja-JP')}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 rounded-xl p-4 mb-6">
                                        <p className="text-sm text-gray-600 mb-2">メッセージ:</p>
                                        <p className="text-gray-900 whitespace-pre-wrap">
                                            {selectedInquiry.message}
                                        </p>
                                    </div>

                                    <div className="mb-4">
                                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                                            ステータス更新
                                        </label>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant={selectedInquiry.status === 'open' ? 'default' : 'outline'}
                                                onClick={() => handleUpdateStatus(selectedInquiry.id, 'open')}
                                                disabled={updating}
                                                className="flex-1 rounded-xl"
                                            >
                                                <Clock className="w-4 h-4 mr-1" />
                                                未対応
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant={selectedInquiry.status === 'doing' ? 'default' : 'outline'}
                                                onClick={() => handleUpdateStatus(selectedInquiry.id, 'doing')}
                                                disabled={updating}
                                                className="flex-1 rounded-xl"
                                            >
                                                <Loader2 className="w-4 h-4 mr-1" />
                                                対応中
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant={selectedInquiry.status === 'done' ? 'default' : 'outline'}
                                                onClick={() => handleUpdateStatus(selectedInquiry.id, 'done')}
                                                disabled={updating}
                                                className="flex-1 rounded-xl"
                                            >
                                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                                完了
                                            </Button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                                            管理者メモ
                                        </label>
                                        <Textarea
                                            value={adminNote}
                                            onChange={(e) => setAdminNote(e.target.value)}
                                            placeholder="内部メモを記入..."
                                            className="min-h-[100px] rounded-xl mb-3"
                                        />
                                        <Button
                                            onClick={handleSaveNote}
                                            disabled={updating}
                                            className="w-full bg-indigo-600 hover:bg-indigo-700 rounded-xl"
                                        >
                                            メモを保存
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ) : (
                            <Card>
                                <div className="text-center py-12 text-gray-600">
                                    問い合わせを選択してください
                                </div>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}