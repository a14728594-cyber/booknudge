import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // アクティブなユーザーのみ取得（直近30日以内）
        const allUsers = await base44.asServiceRole.entities.User.filter({});
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const activeUsers = allUsers.filter(u => {
            if (!u.last_active_at) return false;
            const isActive = new Date(u.last_active_at) > thirtyDaysAgo;
            
            // プロフィール完成チェック
            const hasProfile = u.display_name && 
                              u.bio && 
                              u.profile_json && 
                              (u.profile_json.interests?.length > 0 || 
                               u.profile_json.challenges || 
                               u.profile_json.future_goal);
            
            return isActive && hasProfile;
        });

        let successCount = 0;
        let errorCount = 0;

        // 各アクティブユーザーに対してマッチングを生成
        for (const user of activeUsers) {
            try {
                // 他のアクティブユーザーを候補として取得
                const candidateUsers = activeUsers.filter(u => u.id !== user.id);

                // フォロー中のユーザーを除外
                const follows = await base44.asServiceRole.entities.Follow.filter({ follower_user_id: user.id });
                const followingIds = follows.map(f => f.following_user_id);
                const finalCandidates = candidateUsers.filter(u => !followingIds.includes(u.id));

                // 自分のプロフィール情報
                const myProfile = user.profile_json || {};
                const myFavorites = await base44.asServiceRole.entities.Favorite.filter({ user_id: user.id });

                // 各候補ユーザーのスコアリング
                const scoredUsers = [];
                for (const candidate of finalCandidates) {
                    const candidateProfile = candidate.profile_json || {};
                    const candidateFavorites = await base44.asServiceRole.entities.Favorite.filter({ user_id: candidate.id });

                    let score = 0;
                    const reasons = [];

                    // 同じ興味（30点）
                    const myInterests = myProfile.interests || [];
                    const candidateInterests = candidateProfile.interests || [];
                    const commonInterests = myInterests.filter(i => candidateInterests.includes(i));
                    if (commonInterests.length > 0) {
                        score += 30;
                        reasons.push(`共通の興味: ${commonInterests.slice(0, 2).join('、')}`);
                    }

                    // 悩みが近い（25点）
                    if (myProfile.challenges && candidateProfile.challenges) {
                        const myChallenges = myProfile.challenges.toLowerCase();
                        const candidateChallenges = candidateProfile.challenges.toLowerCase();
                        if (myChallenges.includes(candidateChallenges.substring(0, 10)) || 
                            candidateChallenges.includes(myChallenges.substring(0, 10))) {
                            score += 25;
                            reasons.push('似た悩みを持っている');
                        }
                    }

                    // 目標が近い（20点）
                    if (myProfile.future_goal && candidateProfile.future_goal) {
                        const myGoal = myProfile.future_goal.toLowerCase();
                        const candidateGoal = candidateProfile.future_goal.toLowerCase();
                        if (myGoal.includes(candidateGoal.substring(0, 10)) || 
                            candidateGoal.includes(myGoal.substring(0, 10))) {
                            score += 20;
                            reasons.push('近い目標を持っている');
                        }
                    }

                    // お気に入り本が近い（15点）
                    const myFavBookIds = myFavorites.map(f => f.book_id);
                    const candidateFavBookIds = candidateFavorites.map(f => f.book_id);
                    const commonBooks = myFavBookIds.filter(b => candidateFavBookIds.includes(b));
                    if (commonBooks.length > 0) {
                        score += 15;
                        reasons.push(`${commonBooks.length}冊の共通のお気に入り本`);
                    }

                    // 立場が近い（10点）
                    if (myProfile.position && candidateProfile.position) {
                        if (myProfile.position === candidateProfile.position) {
                            score += 10;
                            reasons.push('同じ立場');
                        }
                    }

                    if (score > 0 && reasons.length > 0) {
                        scoredUsers.push({
                            user: candidate,
                            score: Math.min(score, 100),
                            reasons: reasons.slice(0, 3)
                        });
                    }
                }

                // スコア順にソート
                scoredUsers.sort((a, b) => b.score - a.score);

                // 上位20人を取得
                const topMatches = scoredUsers.slice(0, 20);

                // 既存のマッチを削除
                const existingMatches = await base44.asServiceRole.entities.UserMatch.filter({ viewer_user_id: user.id });
                for (const match of existingMatches) {
                    await base44.asServiceRole.entities.UserMatch.delete(match.id);
                }

                // 新しいマッチを保存
                for (const match of topMatches) {
                    await base44.asServiceRole.entities.UserMatch.create({
                        viewer_user_id: user.id,
                        target_user_id: match.user.id,
                        score: match.score,
                        reasons_json: match.reasons
                    });
                }

                successCount++;
            } catch (error) {
                console.error(`Failed to generate matches for user ${user.id}:`, error);
                errorCount++;
            }
        }

        return Response.json({
            success: true,
            total_active_users: activeUsers.length,
            success_count: successCount,
            error_count: errorCount
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});