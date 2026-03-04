import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Card from '@/components/common/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';

export default function AdminUsers() {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [planFilter, setPlanFilter] = useState('all');

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
            loadUsers();
        } catch (error) {
            navigate(createPageUrl('landing'));
        }
    };

    const updatePlan = async (userId, newStatus) => {
        await base44.functions.invoke('adminUpdateUserPlan', { user_id: userId, subscription_status: newStatus });
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, subscription_status: newStatus } : u));
    };

    const loadUsers = async () => {
        try {
            const allUsers = await base44.entities.User.list('-created_date', 1000);
            
            // 各ユーザーの回答数を取得
            const usersWithData = await Promise.all(
                allUsers.map(async (user) => {
                    const answers = await base44.entities.Answer.filter({ user_id: user.id });
                    return {
                        ...user,
                        answers_count: answers.length
                    };
                })
            );
            
            setUsers(usersWithData);
        } catch (error) {
            console.error('Error loading users:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = !searchQuery || 
            user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesPlan = planFilter === 'all' || user.plan_status === planFilter;
        
        return matchesSearch && matchesPlan;
    });

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
                    ユーザー管理
                </h1>

                <Card className="mb-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <Input
                                placeholder="メールアドレスまたは名前で検索..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 rounded-xl"
                            />
                        </div>
                        <Select value={planFilter} onValueChange={setPlanFilter}>
                            <SelectTrigger className="w-48 rounded-xl">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">全てのプラン</SelectItem>
                                <SelectItem value="free">無料</SelectItem>
                                <SelectItem value="paid">有料</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </Card>

                <Card>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>メール</TableHead>
                                    <TableHead>名前</TableHead>
                                    <TableHead>登録日</TableHead>
                                    <TableHead>最終アクティブ</TableHead>
                                    <TableHead>回答数</TableHead>
                                    <TableHead>プラン</TableHead>
                                    <TableHead>ロール</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers.map(user => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">
                                            {user.email}
                                        </TableCell>
                                        <TableCell>
                                            {user.full_name || '-'}
                                        </TableCell>
                                        <TableCell className="text-sm text-gray-600">
                                            {new Date(user.created_date).toLocaleDateString('ja-JP')}
                                        </TableCell>
                                        <TableCell className="text-sm text-gray-600">
                                            {user.last_active_at 
                                                ? new Date(user.last_active_at).toLocaleDateString('ja-JP')
                                                : '-'
                                            }
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">
                                                {user.answers_count}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Select
                                                value={user.subscription_status === 'active' ? 'active' : 'free'}
                                                onValueChange={(val) => updatePlan(user.id, val === 'active' ? 'active' : null)}
                                            >
                                                <SelectTrigger className="w-24 h-7 text-xs rounded-lg">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="free">無料</SelectItem>
                                                    <SelectItem value="active">有料</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={user.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-700'}>
                                                {user.role === 'admin' ? '管理者' : 'ユーザー'}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        
                        {filteredUsers.length === 0 && (
                            <div className="text-center py-12 text-gray-600">
                                ユーザーが見つかりませんでした
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}