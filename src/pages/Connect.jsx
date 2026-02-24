import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import Card from '@/components/common/Card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SubscriptionGuard from '@/components/common/SubscriptionGuard';
import { Users, Send, Plus, Loader2, RefreshCw, UserPlus, UserCheck, Search, Filter } from 'lucide-react';

export default function Connect() {
    return (
        <SubscriptionGuard pagePath="/connect">
            <ConnectContent />
        </SubscriptionGuard>
    );
}

function ConnectContent() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [matches, setMatches] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [displayMode, setDisplayMode] = useState('recommended'); // 'recommended' or 'search'
    const [searchQuery, setSearchQuery] = useState('');
    const [interestFilter, setInterestFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [followingIds, setFollowingIds] = useState([]);
    const [mutualFollowIds, setMutualFollowIds] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const userData = await base44.auth.me();
            setUser(userData);

            // フォロー状態を取得
            const follows = await base44.entities.Follow.filter({ follower_user_id: userData.id });
            const followingIdsList = follows.map(f => f.following_user_id);
            setFollowingIds(followingIdsList);

            // 相互フォローを取得
            const reverseFollows = await base44.entities.Follow.filter({ following_user_id: userData.id });
            const followersIds = reverseFollows.map(f => f.follower_user_id);
            const mutualIds = followingIdsList.filter(id => followersIds.includes(id));
            setMutualFollowIds(mutualIds);

            // 全ユーザーを取得（検索用）
            const users = await base44.entities.User.filter({});
            setAllUsers(users.filter(u => u.id !== userData.id));

            // マッチング候補を取得
            await loadMatches(userData.id);

            await base44.functions.invoke('trackEvent', {
                event_name: 'connect_view',
                event_value: {}
            });
        } catch (error) {
            console.error('Failed to load connect:', error);
        }
        setLoading(false);
    };

    const loadMatches = async (userId) => {
        try {
            const userMatches = await base44.entities.UserMatch.filter({ viewer_user_id: userId });
            
            if (userMatches.length === 0) {
                // マッチがない場合は生成
                await generateNewMatches();
                return;
            }

            // ユーザー情報を取得
            const matchesWithUsers = await Promise.all(
                userMatches.map(async (match) => {
                    const targetUsers = await base44.entities.User.filter({ id: match.target_user_id });
                    return {
                        ...match,
                        user: targetUsers[0]
                    };
                })
            );

            // スコア順にソート
            matchesWithUsers.sort((a, b) => b.score - a.score);
            setMatches(matchesWithUsers);
        } catch (error) {
            console.error('Failed to load matches:', error);
        }
    };

    const generateNewMatches = async () => {
        setGenerating(true);
        try {
            await base44.functions.invoke('generateMatches');
            await loadMatches(user.id);
        } catch (error) {
            console.error('Failed to generate matches:', error);
            alert('マッチングの生成に失敗しました');
        }
        setGenerating(false);
    };

    const handleFollowToggle = async (targetUserId) => {
        try {
            const isFollowing = followingIds.includes(targetUserId);
            
            if (isFollowing) {
                const follows = await base44.entities.Follow.filter({
                    follower_user_id: user.id,
                    following_user_id: targetUserId
                });
                if (follows.length > 0) {
                    await base44.entities.Follow.delete(follows[0].id);
                }
                setFollowingIds(prev => prev.filter(id => id !== targetUserId));
                setMutualFollowIds(prev => prev.filter(id => id !== targetUserId));
            } else {
                await base44.entities.Follow.create({
                    follower_user_id: user.id,
                    following_user_id: targetUserId
                });
                setFollowingIds(prev => [...prev, targetUserId]);

                // 相互フォローチェック
                const reverseFollows = await base44.entities.Follow.filter({
                    follower_user_id: targetUserId,
                    following_user_id: user.id
                });
                if (reverseFollows.length > 0) {
                    setMutualFollowIds(prev => [...prev, targetUserId]);
                }
            }

            await base44.functions.invoke('trackEvent', {
                event_name: 'follow_toggle',
                event_value: { from: 'connect', target_user_id: targetUserId }
            });
        } catch (error) {
            console.error('Failed to toggle follow:', error);
        }
    };

    const handleMessageClick = async (targetUserId) => {
        try {
            const response = await base44.functions.invoke('startOrGetConversation', {
                other_user_id: targetUserId
            });

            if (response.data.error) {
                alert(response.data.error);
            } else {
                navigate(createPageUrl('dmchat') + '?id=' + response.data.conversation_id);
            }
        } catch (error) {
            console.error('Error starting conversation:', error);
            alert('会話の開始に失敗しました');
        }
    };

    const handleProfileClick = async (targetUserId) => {
        await base44.functions.invoke('trackEvent', {
            event_name: 'profile_open_from_connect',
            event_value: { target_user_id: targetUserId }
        });
        navigate(createPageUrl('profile') + '?userId=' + targetUserId);
    };

    // プロフィール完成度チェック
    const isProfileComplete = (u) => {
        return u.display_name && 
               u.bio && 
               u.profile_json && 
               (u.profile_json.interests?.length > 0 || 
                u.profile_json.challenges || 
                u.profile_json.future_goal);
    };

    // アクティブチェック（直近30日以内）
    const isActive = (u) => {
        if (!u.last_active_at) return false;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return new Date(u.last_active_at) > thirtyDaysAgo;
    };

    // 検索結果を取得
    const getSearchResults = () => {
        let filtered = allUsers.filter(u => !followingIds.includes(u.id));

        // 名前/自己紹介で検索
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(u => 
                u.display_name?.toLowerCase().includes(query) ||
                u.full_name?.toLowerCase().includes(query) ||
                u.bio?.toLowerCase().includes(query)
            );
        }

        // 興味でフィルター
        if (interestFilter !== 'all') {
            filtered = filtered.filter(u => 
                u.profile_json?.interests?.includes(interestFilter)
            );
        }

        // 優先順位でソート：アクティブ + プロフィール完成
        filtered.sort((a, b) => {
            const scoreA = (isActive(a) ? 2 : 0) + (isProfileComplete(a) ? 1 : 0);
            const scoreB = (isActive(b) ? 2 : 0) + (isProfileComplete(b) ? 1 : 0);
            return scoreB - scoreA;
        });

        return filtered.slice(0, 50);
    };

    const searchResults = displayMode === 'search' ? getSearchResults() : [];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-6 py-8">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2 mb-4">
                    <Users className="w-8 h-8" />
                    つながる
                </h1>

                {/* モード切り替え */}
                <div className="flex gap-2 mb-4">
                    <Button
                        onClick={() => setDisplayMode('recommended')}
                        variant={displayMode === 'recommended' ? 'default' : 'outline'}
                        className={displayMode === 'recommended' ? 'bg-indigo-600' : ''}
                    >
                        おすすめ
                    </Button>
                    <Button
                        onClick={() => setDisplayMode('search')}
                        variant={displayMode === 'search' ? 'default' : 'outline'}
                        className={displayMode === 'search' ? 'bg-indigo-600' : ''}
                    >
                        <Search className="w-4 h-4 mr-2" />
                        検索
                    </Button>
                </div>

                {/* 検索フィルター */}
                {displayMode === 'search' && (
                    <Card className="p-4 mb-4">
                        <div className="flex gap-3 flex-wrap">
                            <div className="flex-1 min-w-[200px]">
                                <Input
                                    placeholder="名前や自己紹介で検索..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <Select value={interestFilter} onValueChange={setInterestFilter}>
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="興味で絞り込む" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">すべての興味</SelectItem>
                                    <SelectItem value="営業">営業</SelectItem>
                                    <SelectItem value="マーケティング">マーケティング</SelectItem>
                                    <SelectItem value="人間関係">人間関係</SelectItem>
                                    <SelectItem value="マインドセット">マインドセット</SelectItem>
                                    <SelectItem value="習慣化">習慣化</SelectItem>
                                    <SelectItem value="リーダーシップ">リーダーシップ</SelectItem>
                                    <SelectItem value="自己啓発">自己啓発</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </Card>
                )}

                {/* おすすめモードのボタン */}
                {displayMode === 'recommended' && (
                    <Button
                        onClick={generateNewMatches}
                        disabled={generating}
                        className="bg-indigo-600 hover:bg-indigo-700"
                    >
                        {generating ? (
                            <>
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                生成中...
                            </>
                        ) : (
                            <>
                                <Plus className="w-4 h-4 mr-2" />
                                新しいおすすめを見る
                            </>
                        )}
                    </Button>
                )}
            </div>

            {displayMode === 'recommended' ? (
                matches.length > 0 ? (
                    <div className="grid md:grid-cols-2 gap-6">
                        {matches.map(match => {
                            const isFollowing = followingIds.includes(match.target_user_id);
                            const isMutual = mutualFollowIds.includes(match.target_user_id);
                            const targetUser = match.user;

                            return (
                                <Card key={match.id}>
                                    <div className="space-y-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleProfileClick(match.target_user_id)}
                                                        className="text-xl font-bold text-gray-900 hover:text-indigo-600 transition-colors text-left"
                                                    >
                                                        {targetUser?.display_name || targetUser?.full_name || '不明なユーザー'}
                                                    </button>
                                                    {isActive(targetUser) && (
                                                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                                            アクティブ
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    {targetUser?.bio || '自己紹介未設定'}
                                                </p>
                                            </div>
                                            <div className="bg-indigo-50 rounded-full px-3 py-1 ml-4">
                                                <span className="text-indigo-600 font-bold">
                                                    {match.score}%
                                                </span>
                                            </div>
                                        </div>

                                        {match.reasons_json && match.reasons_json.length > 0 && (
                                            <div className="space-y-2">
                                                {match.reasons_json.map((reason, idx) => (
                                                    <div key={idx} className="flex items-start gap-2">
                                                        <span className="text-indigo-600 mt-0.5">✓</span>
                                                        <span className="text-sm text-gray-700">{reason}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="flex gap-2 pt-2 border-t">
                                            {isMutual && (
                                                <Button
                                                    onClick={() => handleMessageClick(match.target_user_id)}
                                                    variant="outline"
                                                    className="flex-1"
                                                >
                                                    <Send className="w-4 h-4 mr-2" />
                                                    メッセージ
                                                </Button>
                                            )}
                                            <Button
                                                onClick={() => handleFollowToggle(match.target_user_id)}
                                                variant={isFollowing ? 'outline' : 'default'}
                                                className={`flex-1 ${!isFollowing && 'bg-indigo-600 hover:bg-indigo-700'}`}
                                            >
                                                {isFollowing ? (
                                                    <>
                                                        <UserCheck className="w-4 h-4 mr-2" />
                                                        フォロー中
                                                    </>
                                                ) : (
                                                    <>
                                                        <UserPlus className="w-4 h-4 mr-2" />
                                                        フォローする
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                ) : (
                    <Card className="text-center py-12">
                        <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600 mb-4">おすすめのユーザーがありません</p>
                        <Button onClick={generateNewMatches} disabled={generating}>
                            {generating ? (
                                <>
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                    生成中...
                                </>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4 mr-2" />
                                    おすすめを生成
                                </>
                            )}
                        </Button>
                    </Card>
                )
            ) : (
                <div>
                    {searchResults.length > 0 ? (
                        <>
                            <p className="text-sm text-gray-600 mb-4">
                                {searchResults.length}人見つかりました
                            </p>
                            <div className="grid md:grid-cols-2 gap-6">
                                {searchResults.map(targetUser => {
                                    const isFollowing = followingIds.includes(targetUser.id);
                                    const isMutual = mutualFollowIds.includes(targetUser.id);

                                    return (
                                        <Card key={targetUser.id}>
                                            <div className="space-y-4">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => handleProfileClick(targetUser.id)}
                                                                className="text-xl font-bold text-gray-900 hover:text-indigo-600 transition-colors text-left"
                                                            >
                                                                {targetUser.display_name || targetUser.full_name || '不明なユーザー'}
                                                            </button>
                                                            {isActive(targetUser) && (
                                                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                                                    アクティブ
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-gray-600 mt-1">
                                                            {targetUser.bio || '自己紹介未設定'}
                                                        </p>
                                                    </div>
                                                </div>

                                                {targetUser.profile_json?.interests && targetUser.profile_json.interests.length > 0 && (
                                                    <div className="flex flex-wrap gap-2">
                                                        {targetUser.profile_json.interests.slice(0, 3).map((interest, idx) => (
                                                            <span key={idx} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full">
                                                                {interest}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}

                                                <div className="flex gap-2 pt-2 border-t">
                                                    {isMutual && (
                                                        <Button
                                                            onClick={() => handleMessageClick(targetUser.id)}
                                                            variant="outline"
                                                            className="flex-1"
                                                        >
                                                            <Send className="w-4 h-4 mr-2" />
                                                            メッセージ
                                                        </Button>
                                                    )}
                                                    <Button
                                                        onClick={() => handleFollowToggle(targetUser.id)}
                                                        variant={isFollowing ? 'outline' : 'default'}
                                                        className={`flex-1 ${!isFollowing && 'bg-indigo-600 hover:bg-indigo-700'}`}
                                                    >
                                                        {isFollowing ? (
                                                            <>
                                                                <UserCheck className="w-4 h-4 mr-2" />
                                                                フォロー中
                                                            </>
                                                        ) : (
                                                            <>
                                                                <UserPlus className="w-4 h-4 mr-2" />
                                                                フォローする
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <Card className="text-center py-12">
                            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-600">
                                {searchQuery || interestFilter !== 'all' ? '該当するユーザーが見つかりませんでした' : '検索条件を入力してください'}
                            </p>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}