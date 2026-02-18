import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import Card from '@/components/common/Card';
import BookCard from '@/components/common/BookCard';
import DomainBadge from '@/components/common/DomainBadge';
import { User as UserIcon, Heart, Users, Edit2, Check, X, Loader2, Lock, Globe, Send } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function Profile() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState(null);
    const [profileUser, setProfileUser] = useState(null);
    const [isOwnProfile, setIsOwnProfile] = useState(false);
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    
    const [displayName, setDisplayName] = useState('');
    const [bio, setBio] = useState('');
    const [profileVisibility, setProfileVisibility] = useState('public');
    
    const [favorites, setFavorites] = useState([]);
    const [favoritesBooks, setFavoritesBooks] = useState([]);
    const [sharedAnswers, setSharedAnswers] = useState([]);
    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [isFollowing, setIsFollowing] = useState(false);
    
    const [showFollowersModal, setShowFollowersModal] = useState(false);
    const [showFollowingModal, setShowFollowingModal] = useState(false);
    const [followersList, setFollowersList] = useState([]);
    const [followingList, setFollowingList] = useState([]);
    const [isMutualFollow, setIsMutualFollow] = useState(false);

    useEffect(() => {
        loadProfile();
    }, [userId]);

    const loadProfile = async () => {
        setLoading(true);
        try {
            const current = await base44.auth.me();
            setCurrentUser(current);

            const targetUserId = userId || current.id;
            const isOwn = targetUserId === current.id;
            setIsOwnProfile(isOwn);

            const targetUser = await base44.entities.User.get(targetUserId);
            setProfileUser(targetUser);
            setDisplayName(targetUser.display_name || '');
            setBio(targetUser.bio || '');
            setProfileVisibility(targetUser.profile_visibility || 'public');

            // お気に入り（プライバシー設定を確認）
            const canViewFavorites = isOwn || targetUser.favorites_visibility === 'public';
            let favs = [];
            if (canViewFavorites) {
                favs = await base44.entities.Favorite.filter({ user_id: targetUserId });
            }
            setFavorites(favs);
            
            const booksData = [];
            for (const fav of favs) {
                try {
                    const book = await base44.entities.Book.get(fav.book_id);
                    booksData.push(book);
                } catch (e) {}
            }
            setFavoritesBooks(booksData);

            // 共有回答
            const answers = await base44.entities.SharedAnswer.filter({ user_id: targetUserId }, '-created_date', 20);
            setSharedAnswers(answers);

            // フォロー数
            const followers = await base44.entities.Follow.filter({ following_user_id: targetUserId });
            setFollowersCount(followers.length);
            
            const following = await base44.entities.Follow.filter({ follower_user_id: targetUserId });
            setFollowingCount(following.length);

            // 自分がフォロー中か
            if (!isOwn) {
                const followCheck = await base44.entities.Follow.filter({
                    follower_user_id: current.id,
                    following_user_id: targetUserId
                });
                setIsFollowing(followCheck.length > 0);

                // 相互フォローチェック
                const reverseFollowCheck = await base44.entities.Follow.filter({
                    follower_user_id: targetUserId,
                    following_user_id: current.id
                });
                setIsMutualFollow(followCheck.length > 0 && reverseFollowCheck.length > 0);
            }
        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveProfile = async () => {
        try {
            await base44.auth.updateMe({
                display_name: displayName,
                bio: bio
            });
            setEditing(false);
            await loadProfile();
        } catch (error) {
            console.error('Error saving profile:', error);
            alert('プロフィールの保存に失敗しました');
        }
    };

    const handleVisibilityToggle = async (checked) => {
        const newVisibility = checked ? 'public' : 'private';
        try {
            await base44.auth.updateMe({
                profile_visibility: newVisibility
            });
            setProfileVisibility(newVisibility);
            
            await base44.functions.invoke('trackEvent', {
                event_name: 'profile_visibility_change',
                event_value: { visibility: newVisibility },
                update_last_active: true
            });
        } catch (error) {
            console.error('Error updating visibility:', error);
            alert('公開設定の変更に失敗しました');
        }
    };

    const handleFollowToggle = async () => {
        try {
            if (isFollowing) {
                const follows = await base44.entities.Follow.filter({
                    follower_user_id: currentUser.id,
                    following_user_id: profileUser.id
                });
                if (follows.length > 0) {
                    await base44.entities.Follow.delete(follows[0].id);
                }
                setIsFollowing(false);
                setFollowersCount(prev => prev - 1);
            } else {
                await base44.entities.Follow.create({
                    follower_user_id: currentUser.id,
                    following_user_id: profileUser.id
                });
                setIsFollowing(true);
                setFollowersCount(prev => prev + 1);
            }
        } catch (error) {
            console.error('Error toggling follow:', error);
        }
    };

    const loadFollowers = async () => {
        try {
            const follows = await base44.entities.Follow.filter({ 
                following_user_id: profileUser.id 
            });
            const users = [];
            for (const follow of follows) {
                try {
                    const user = await base44.entities.User.get(follow.follower_user_id);
                    users.push(user);
                } catch (e) {}
            }
            setFollowersList(users);
            setShowFollowersModal(true);
        } catch (error) {
            console.error('Error loading followers:', error);
        }
    };

    const loadFollowing = async () => {
        try {
            const follows = await base44.entities.Follow.filter({ 
                follower_user_id: profileUser.id 
            });
            const users = [];
            for (const follow of follows) {
                try {
                    const user = await base44.entities.User.get(follow.following_user_id);
                    users.push(user);
                } catch (e) {}
            }
            setFollowingList(users);
            setShowFollowingModal(true);
        } catch (error) {
            console.error('Error loading following:', error);
        }
    };

    const handleMessageClick = async () => {
        try {
            const response = await base44.functions.invoke('startOrGetConversation', {
                other_user_id: profileUser.id
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

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
            </div>
        );
    }

    const isPrivateProfile = !isOwnProfile && profileUser?.profile_visibility === 'private';

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-6">
            <div className="max-w-5xl mx-auto">
                {/* Profile Header */}
                <Card className="mb-8">
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                        <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <UserIcon className="w-10 h-10 text-white" />
                        </div>
                        
                        <div className="flex-1">
                            {editing ? (
                                <div className="space-y-4">
                                    <Input
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        placeholder="表示名"
                                        className="rounded-xl"
                                    />
                                    <Textarea
                                        value={bio}
                                        onChange={(e) => setBio(e.target.value)}
                                        placeholder="自己紹介"
                                        className="rounded-xl"
                                    />
                                    <div className="flex gap-2">
                                        <Button onClick={handleSaveProfile} size="sm" className="rounded-xl">
                                            <Check className="w-4 h-4 mr-2" />
                                            保存
                                        </Button>
                                        <Button onClick={() => setEditing(false)} variant="outline" size="sm" className="rounded-xl">
                                            <X className="w-4 h-4 mr-2" />
                                            キャンセル
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-3 mb-2">
                                        <h1 className="text-2xl font-bold text-gray-900">
                                            {profileUser?.display_name || profileUser?.email || '名前なし'}
                                        </h1>
                                        {isOwnProfile && (
                                            <Button onClick={() => setEditing(true)} variant="outline" size="sm" className="rounded-xl">
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                        {isPrivateProfile && (
                                            <div className="flex items-center gap-1 text-gray-500 text-sm">
                                                <Lock className="w-4 h-4" />
                                                <span>非公開</span>
                                            </div>
                                        )}
                                    </div>
                                    {!isPrivateProfile && (
                                        <p className="text-gray-600 mb-4">
                                            {profileUser?.bio || '自己紹介がありません'}
                                        </p>
                                    )}
                                    <div className="flex gap-6 text-sm">
                                        <button 
                                            onClick={loadFollowing}
                                            className="hover:underline"
                                        >
                                            <span className="font-semibold text-gray-900">{followingCount}</span>
                                            <span className="text-gray-600 ml-1">フォロー中</span>
                                        </button>
                                        <button 
                                            onClick={loadFollowers}
                                            className="hover:underline"
                                        >
                                            <span className="font-semibold text-gray-900">{followersCount}</span>
                                            <span className="text-gray-600 ml-1">フォロワー</span>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                        {!isOwnProfile && (
                            <div className="flex gap-2">
                                {isMutualFollow && (
                                    <Button
                                        onClick={handleMessageClick}
                                        variant="outline"
                                        className="rounded-xl"
                                    >
                                        <Send className="w-4 h-4 mr-2" />
                                        メッセージ
                                    </Button>
                                )}
                                <Button
                                    onClick={handleFollowToggle}
                                    variant={isFollowing ? 'outline' : 'default'}
                                    className={`rounded-xl ${isFollowing ? '' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                                >
                                    <Users className="w-4 h-4 mr-2" />
                                    {isFollowing ? 'フォロー中' : 'フォローする'}
                                </Button>
                            </div>
                        )}
                    </div>
                </Card>

                {/* プロフィール公開設定（自分のプロフィールのみ） */}
                {isOwnProfile && (
                    <Card className="mb-8">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {profileVisibility === 'public' ? (
                                    <Globe className="w-5 h-5 text-indigo-600" />
                                ) : (
                                    <Lock className="w-5 h-5 text-gray-400" />
                                )}
                                <div>
                                    <Label htmlFor="profile-visibility" className="font-medium text-gray-900 cursor-pointer">
                                        プロフィールを公開する
                                    </Label>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {profileVisibility === 'public' 
                                            ? '他のユーザーがあなたのプロフィールを見ることができます'
                                            : 'プロフィールは非公開です'}
                                    </p>
                                </div>
                            </div>
                            <Switch
                                id="profile-visibility"
                                checked={profileVisibility === 'public'}
                                onCheckedChange={handleVisibilityToggle}
                            />
                        </div>
                    </Card>
                )}

                {/* Tabs - 非公開プロフィールの場合は非表示 */}
                {!isPrivateProfile ? (
                    <Tabs defaultValue="favorites" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-6">
                            <TabsTrigger value="favorites">お気に入りの本</TabsTrigger>
                            <TabsTrigger value="answers">共有した回答</TabsTrigger>
                        </TabsList>

                        <TabsContent value="favorites">
                            {!isOwnProfile && profileUser?.favorites_visibility === 'private' ? (
                                <div className="text-center py-12 text-gray-600">
                                    このユーザーのお気に入りは非公開です
                                </div>
                            ) : favoritesBooks.length > 0 ? (
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {favoritesBooks.map(book => (
                                        <BookCard key={book.id} book={book} />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-gray-600">
                                    お気に入りの本がまだありません
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="answers">
                            {sharedAnswers.length > 0 ? (
                                <div className="space-y-4">
                                    {sharedAnswers.map(answer => (
                                        <Card key={answer.id}>
                                            <div className="flex items-start gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <DomainBadge domain={answer.domain} />
                                                        <span className="text-sm text-gray-500">
                                                            {new Date(answer.created_date).toLocaleDateString('ja-JP')}
                                                        </span>
                                                    </div>
                                                    <p className="text-gray-700 mb-3">
                                                        {answer.question_text}
                                                    </p>
                                                    <div className="bg-indigo-50 rounded-xl p-4">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm font-medium text-gray-600">
                                                                スライダー値
                                                            </span>
                                                            <span className="text-2xl font-bold text-indigo-600">
                                                                {answer.shared_slider_value}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-gray-600">
                                    共有した回答がまだありません
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                ) : (
                    <Card className="text-center py-12">
                        <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">
                            このユーザーはプロフィールを非公開に設定しています
                        </p>
                    </Card>
                )}

                {/* フォロワー一覧モーダル */}
                <Dialog open={showFollowersModal} onOpenChange={setShowFollowersModal}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>フォロワー</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {followersList.length > 0 ? (
                                followersList.map(user => (
                                    <Link 
                                        key={user.id}
                                        to={createPageUrl(`u/${user.id}`)}
                                        onClick={() => setShowFollowersModal(false)}
                                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                                            {(user.display_name || user.email || 'U')[0].toUpperCase()}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-900">
                                                {user.display_name || user.email || 'ユーザー'}
                                            </div>
                                            {user.profile_visibility === 'private' && (
                                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                                    <Lock className="w-3 h-3" />
                                                    <span>非公開</span>
                                                </div>
                                            )}
                                        </div>
                                    </Link>
                                ))
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    フォロワーがいません
                                </div>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>

                {/* フォロー中一覧モーダル */}
                <Dialog open={showFollowingModal} onOpenChange={setShowFollowingModal}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>フォロー中</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {followingList.length > 0 ? (
                                followingList.map(user => (
                                    <Link 
                                        key={user.id}
                                        to={createPageUrl(`u/${user.id}`)}
                                        onClick={() => setShowFollowingModal(false)}
                                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                                            {(user.display_name || user.email || 'U')[0].toUpperCase()}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-900">
                                                {user.display_name || user.email || 'ユーザー'}
                                            </div>
                                            {user.profile_visibility === 'private' && (
                                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                                    <Lock className="w-3 h-3" />
                                                    <span>非公開</span>
                                                </div>
                                            )}
                                        </div>
                                    </Link>
                                ))
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    フォロー中のユーザーがいません
                                </div>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}