import React from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

export default function CommentItem({ comment, user, onDelete, onProfileClick }) {
    const [isFollowing, setIsFollowing] = React.useState(false);
    const [checkingFollow, setCheckingFollow] = React.useState(true);

    React.useEffect(() => {
        const checkFollow = async () => {
            if (user && comment.user_id !== user.id) {
                const follows = await base44.entities.Follow.filter({
                    follower_user_id: user.id,
                    following_user_id: comment.user_id
                });
                setIsFollowing(follows.length > 0);
            }
            setCheckingFollow(false);
        };
        checkFollow();
    }, [user, comment.user_id]);

    const handleFollowToggle = async (e) => {
        e.stopPropagation();
        if (!user) {
            base44.auth.redirectToLogin();
            return;
        }

        if (isFollowing) {
            const follows = await base44.entities.Follow.filter({
                follower_user_id: user.id,
                following_user_id: comment.user_id
            });
            if (follows.length > 0) {
                await base44.entities.Follow.delete(follows[0].id);
            }
            setIsFollowing(false);
        } else {
            await base44.entities.Follow.create({
                follower_user_id: user.id,
                following_user_id: comment.user_id
            });
            setIsFollowing(true);
        }

        await base44.functions.invoke('trackEvent', {
            event_name: 'follow_toggle',
            event_value: { from: 'book_comment', target_user_id: comment.user_id }
        });
    };

    return (
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 flex-1">
                    <button
                        onClick={() => onProfileClick(comment.user_id)}
                        className="font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                        {comment.user?.display_name || comment.user?.full_name || '匿名ユーザー'}
                    </button>
                    {user && user.id !== comment.user_id && !checkingFollow && (
                        <Button
                            variant={isFollowing ? "outline" : "default"}
                            size="sm"
                            onClick={handleFollowToggle}
                            className={`h-7 text-xs ${!isFollowing && 'bg-indigo-600 hover:bg-indigo-700'}`}
                        >
                            {isFollowing ? 'フォロー中' : 'フォロー'}
                        </Button>
                    )}
                    <span className="text-sm text-gray-500">
                        {new Date(comment.created_date).toLocaleDateString('ja-JP', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                        })}
                    </span>
                </div>
                {user?.id === comment.user_id && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(comment.id)}
                        className="text-gray-400 hover:text-red-600"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                )}
            </div>
            <p className="text-gray-700 whitespace-pre-wrap">
                {comment.content}
            </p>
        </div>
    );
}