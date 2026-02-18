import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import Card from '@/components/common/Card';
import BookCard from '@/components/common/BookCard';
import { Loader2, Edit, Save, X, Lock, Globe, Heart, Users as UsersIcon } from 'lucide-react';

export default function MyProfile() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    
    const [favorites, setFavorites] = useState([]);
    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);

    const [formData, setFormData] = useState({
        display_name: '',
        bio: '',
        profile_visibility: 'public'
    });

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        setLoading(true);
        try {
            const userData = await base44.auth.me();
            setUser(userData);
            
            setFormData({
                display_name: userData.display_name || '',
                bio: userData.bio || '',
                profile_visibility: userData.profile_visibility || 'public'
            });

            // お気に入りの本を取得
            const favRecords = await base44.entities.Favorite.filter({ user_id: userData.id });
            const bookIds = favRecords.map(f => f.book_id);
            
            if (bookIds.length > 0) {
                const books = await Promise.all(
                    bookIds.map(id => base44.entities.Book.get(id).catch(() => null))
                );
                setFavorites(books.filter(b => b !== null));
            }

            // フォロー数を取得
            const followers = await base44.entities.Follow.filter({ following_user_id: userData.id });
            const following = await base44.entities.Follow.filter({ follower_user_id: userData.id });
            
            setFollowersCount(followers.length);
            setFollowingCount(following.length);

        } catch (error) {
            console.error('Error loading profile:', error);
            navigate(createPageUrl('landing'));
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await base44.auth.updateMe({
                display_name: formData.display_name,
                bio: formData.bio,
                profile_visibility: formData.profile_visibility
            });

            // イベント記録
            if (user.profile_visibility !== formData.profile_visibility) {
                await base44.functions.invoke('trackEvent', {
                    event_name: 'profile_visibility_change',
                    event_value: { 
                        from: user.profile_visibility || 'public',
                        to: formData.profile_visibility 
                    }
                });
            }

            setUser({ ...user, ...formData });
            setEditing(false);
        } catch (error) {
            console.error('Error saving profile:', error);
            alert('保存に失敗しました');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setFormData({
            display_name: user.display_name || '',
            bio: user.bio || '',
            profile_visibility: user.profile_visibility || 'public'
        });
        setEditing(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-6">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* プロフィールヘッダー */}
                <Card>
                    <div className="flex items-start justify-between mb-6">
                        <div className="flex items-start gap-4">
                            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                                {(user.display_name || user.email || 'U')[0].toUpperCase()}
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                                    {user.display_name || user.email || 'ユーザー'}
                                </h1>
                                <p className="text-sm text-gray-500 mb-3">{user.email}</p>
                                <div className="flex items-center gap-4 text-sm">
                                    <div className="flex items-center gap-1">
                                        <UsersIcon className="w-4 h-4 text-gray-400" />
                                        <span className="text-gray-600">
                                            <strong>{followersCount}</strong> フォロワー
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <UsersIcon className="w-4 h-4 text-gray-400" />
                                        <span className="text-gray-600">
                                            <strong>{followingCount}</strong> フォロー中
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {!editing && (
                            <Button
                                onClick={() => setEditing(true)}
                                variant="outline"
                                className="gap-2"
                            >
                                <Edit className="w-4 h-4" />
                                編集
                            </Button>
                        )}
                    </div>

                    {editing ? (
                        <div className="space-y-4">
                            <div>
                                <Label>ニックネーム</Label>
                                <Input
                                    value={formData.display_name}
                                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                                    placeholder="表示名を入力"
                                />
                            </div>

                            <div>
                                <Label>自己紹介</Label>
                                <Textarea
                                    value={formData.bio}
                                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                    placeholder="自己紹介を入力"
                                    rows={3}
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        {formData.profile_visibility === 'public' ? (
                                            <Globe className="w-5 h-5 text-indigo-600" />
                                        ) : (
                                            <Lock className="w-5 h-5 text-gray-600" />
                                        )}
                                        <div>
                                            <div className="font-medium text-gray-900">
                                                プロフィールを{formData.profile_visibility === 'public' ? '公開' : '非公開'}
                                            </div>
                                            <div className="text-sm text-gray-600">
                                                {formData.profile_visibility === 'public' 
                                                    ? '他のユーザーがあなたのプロフィール、自己紹介、お気に入りを閲覧できます'
                                                    : 'ニックネームのみ表示され、詳細は非公開になります'}
                                            </div>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={formData.profile_visibility === 'public'}
                                        onCheckedChange={(checked) => 
                                            setFormData({ ...formData, profile_visibility: checked ? 'public' : 'private' })
                                        }
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="bg-indigo-600 hover:bg-indigo-700 gap-2"
                                >
                                    {saving ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Save className="w-4 h-4" />
                                    )}
                                    保存
                                </Button>
                                <Button
                                    onClick={handleCancel}
                                    variant="outline"
                                    className="gap-2"
                                >
                                    <X className="w-4 h-4" />
                                    キャンセル
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {user.bio && (
                                <p className="text-gray-700 mb-4">{user.bio}</p>
                            )}
                            <div className="flex items-center gap-2 text-sm">
                                {user.profile_visibility === 'public' ? (
                                    <>
                                        <Globe className="w-4 h-4 text-indigo-600" />
                                        <span className="text-gray-600">プロフィール公開中</span>
                                    </>
                                ) : (
                                    <>
                                        <Lock className="w-4 h-4 text-gray-600" />
                                        <span className="text-gray-600">プロフィール非公開</span>
                                    </>
                                )}
                            </div>
                        </>
                    )}
                </Card>

                {/* お気に入りの本 */}
                <Card>
                    <div className="flex items-center gap-2 mb-6">
                        <Heart className="w-6 h-6 text-pink-600" />
                        <h2 className="text-xl font-bold text-gray-900">
                            お気に入りの本
                        </h2>
                        <span className="text-gray-500">({favorites.length})</span>
                    </div>

                    {favorites.length > 0 ? (
                        <div className="grid md:grid-cols-2 gap-4">
                            {favorites.map(book => (
                                <BookCard key={book.id} book={book} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500">まだお気に入りの本がありません</p>
                            <Link to={createPageUrl('home')}>
                                <Button variant="outline" className="mt-4">
                                    本を探す
                                </Button>
                            </Link>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}