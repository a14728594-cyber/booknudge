import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import Card from '@/components/common/Card';
import BookCard from '@/components/common/BookCard';
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
        const newFollowing = !isFollowing;
        // Optimistic update
        setIsFollowing(newFollowing);
        setFollowersCount(prev => newFollowing ? prev + 1 : prev - 1);

        try {
            if (!newFollowing) {
                const follows = await base44.entities.Follow.filter({
                    follower_user_id: currentUser.id,
                    following_user_id: profileUser.id
                });
                if (follows.length > 0) {
                    await base44.entities.Follow.delete(follows[0].id);
                }
            } else {
                await base44.entities.Follow.create({
                    follower_user_id: currentUser.id,
                    following_user_id: profileUser.id
                });
            }
        } catch (error) {
            // Revert on error
            setIsFollowing(!newFollowing);
            setFollowersCount(prev => newFollowing ? prev - 1 : prev + 1);
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
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Profile Header Card */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-6">
                    {/* Banner */}
                    <div className="h-24 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-600" />

                    <div className="px-6 pb-6">
                        <div className="flex flex-col sm:flex-row items-start gap-4 -mt-10">
                            {/* Avatar */}
                            <div className="w-20 h-20 bg-gradient-to-br from-indigo-400 to-purple-600 rounded-2xl border-4 border-white shadow-md flex items-center justify-center flex-shrink-0">
                                <span className="text-2xl font-bold text-white">
                                    {(profileUser?.display_name || profileUser?.email || 'U')[0].toUpperCase()}
                                </span>
                            </div>

                            <div className="flex-1 pt-12 sm:pt-2">
                                {editing ? (
                                    <div className="space-y-3">
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
                                            rows={3}
                                        />
                                        <div className="flex gap-2">
                                            <Button onClick={handleSaveProfile} size="sm" className="rounded-xl bg-indigo-600 hover:bg-indigo-700">
                                                <Check className="w-4 h-4 mr-1.5" /> 保存
                                            </Button>
                                            <Button onClick={() => setEditing(false)} variant="outline" size="sm" className="rounded-xl">
                                                <X className="w-4 h-4 mr-1.5" /> キャンセル
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h1 className="text-xl font-bold text-gray-900">
                                                    {profileUser?.display_name || profileUser?.email || '名前なし'}
                                                </h1>
                                                {isPrivateProfile && (
                                                    <span className="flex items-center gap-1 text-gray-400 text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                                                        <Lock className="w-3 h-3" /> 非公開
                                                    </span>
                                                )}
                                            </div>
                                            {!isPrivateProfile && (
                                                <p className="text-sm text-gray-500 mb-3 leading-relaxed">
                                                    {profileUser?.bio || '自己紹介がありません'}
                                                </p>
                                            )}
                                            <div className="flex gap-5 text-sm">
                                                <button onClick={loadFollowing} className="hover:text-indigo-600 transition-colors">
                                                    <span className="font-bold text-gray-900">{followingCount}</span>
                                                    <span className="text-gray-400 ml-1.5">フォロー</span>
                                                </button>
                                                <button onClick={loadFollowers} className="hover:text-indigo-600 transition-colors">
                                                    <span className="font-bold text-gray-900">{followersCount}</span>
                                                    <span className="text-gray-400 ml-1.5">フォロワー</span>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 flex-shrink-0 pt-1">
                                            {isOwnProfile ? (
                                                <Button onClick={() => setEditing(true)} variant="outline" size="sm" className="rounded-xl gap-1.5">
                                                    <Edit2 className="w-3.5 h-3.5" /> 編集
                                                </Button>
                                            ) : (
                                                <>
                                                    {isMutualFollow && (
                                                        <Button onClick={handleMessageClick} variant="outline" size="sm" className="rounded-xl gap-1.5">
                                                            <Send className="w-3.5 h-3.5" /> メッセージ
                                                        </Button>
                                                    )}
                                                    <Button
                                                        onClick={handleFollowToggle}
                                                        size="sm"
                                                        variant={isFollowing ? 'outline' : 'default'}
                                                        className={`rounded-xl gap-1.5 ${isFollowing ? '' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                                                    >
                                                        <Users className="w-3.5 h-3.5" />
                                                        {isFollowing ? 'フォロー中' : 'フォロー'}
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 公開設定 */}
                {isOwnProfile && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 mb-6 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {profileVisibility === 'public'
                                ? <Globe className="w-4 h-4 text-indigo-500" />
                                : <Lock className="w-4 h-4 text-gray-400" />
                            }
                            <div>
                                <Label htmlFor="profile-visibility" className="text-sm font-medium text-gray-800 cursor-pointer">
                                    プロフィールを公開する
                                </Label>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {profileVisibility === 'public' ? '他のユーザーに公開中' : '非公開設定中'}
                                </p>
                            </div>
                        </div>
                        <Switch
                            id="profile-visibility"
                            checked={profileVisibility === 'public'}
                            onCheckedChange={handleVisibilityToggle}
                        />
                    </div>
                )}

                {/* Tabs */}
                {!isPrivateProfile ? (
                    <div>
                        <div className="mb-6">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Heart className="w-5 h-5 text-pink-600" />
                                お気に入りの本
                            </h2>
                        </div>
                        {!isOwnProfile && profileUser?.favorites_visibility === 'private' ? (
                            <div className="bg-white rounded-2xl border border-gray-100 text-center py-14 text-gray-400 text-sm">
                                このユーザーのお気に入りは非公開です
                            </div>
                        ) : favoritesBooks.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {favoritesBooks.map(book => (
                                    <BookCard key={book.id} book={book} />
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl border border-gray-100 text-center py-14">
                                <Heart className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                                <p className="text-sm text-gray-400">お気に入りの本がまだありません</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-gray-100 text-center py-16">
                        <Lock className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                        <p className="text-sm text-gray-400">このユーザーはプロフィールを非公開に設定しています</p>
                    </div>
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