import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 全ユーザーを取得
        const allUsers = await base44.entities.User.filter({});
        
        // 自分以外のユーザーを取得
        const otherUsers = allUsers.filter(u => u.id !== user.id);

        // フォロー中のユーザーを除外
        const follows = await base44.entities.Follow.filter({ follower_user_id: user.id });
        const followingIds = follows.map(f => f.following_user_id);
        const candidateUsers = otherUsers.filter(u => !followingIds.includes(u.id));

        // 自分のプロフィール情報
        const myProfile = user.profile_json || {};
        const myFavorites = await base44.entities.Favorite.filter({ user_id: user.id });

        // 各候補ユーザーのスコアリング
        const scoredUsers = [];
        for (const candidate of candidateUsers) {
            const candidateProfile = candidate.profile_json || {};
            const candidateFavorites = await base44.entities.Favorite.filter({ user_id: candidate.id });

            let score = 0;
            const reasons = [];

            // 同じジャンル/興味（重み大：30点）
            const myInterests = myProfile.interests || [];
            const candidateInterests = candidateProfile.interests || [];
            const commonInterests = myInterests.filter(i => candidateInterests.includes(i));
            if (commonInterests.length > 0) {
                score += 30;
                reasons.push(`共通の興味: ${commonInterests.slice(0, 2).join('、')}`);
            }

            // 悩みが近い（重み大：25点）
            if (myProfile.challenges && candidateProfile.challenges) {
                const myChallenges = myProfile.challenges.toLowerCase();
                const candidateChallenges = candidateProfile.challenges.toLowerCase();
                if (myChallenges.includes(candidateChallenges.substring(0, 10)) || 
                    candidateChallenges.includes(myChallenges.substring(0, 10))) {
                    score += 25;
                    reasons.push('似た悩みを持っている');
                }
            }

            // 目標が近い（重み中：20点）
            if (myProfile.future_goal && candidateProfile.future_goal) {
                const myGoal = myProfile.future_goal.toLowerCase();
                const candidateGoal = candidateProfile.future_goal.toLowerCase();
                if (myGoal.includes(candidateGoal.substring(0, 10)) || 
                    candidateGoal.includes(myGoal.substring(0, 10))) {
                    score += 20;
                    reasons.push('近い目標を持っている');
                }
            }

            // お気に入り本が近い（重み小：15点）
            const myFavBookIds = myFavorites.map(f => f.book_id);
            const candidateFavBookIds = candidateFavorites.map(f => f.book_id);
            const commonBooks = myFavBookIds.filter(b => candidateFavBookIds.includes(b));
            if (commonBooks.length > 0) {
                score += 15;
                reasons.push(`${commonBooks.length}冊の共通のお気に入り本`);
            }

            // 立場が近い（重み小：10点）
            if (myProfile.position && candidateProfile.position) {
                if (myProfile.position === candidateProfile.position) {
                    score += 10;
                    reasons.push('同じ立場');
                }
            }

            // スコアが0より大きい場合のみ追加
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
        const existingMatches = await base44.entities.UserMatch.filter({ viewer_user_id: user.id });
        for (const match of existingMatches) {
            await base44.entities.UserMatch.delete(match.id);
        }

        // 新しいマッチを保存
        for (const match of topMatches) {
            await base44.entities.UserMatch.create({
                viewer_user_id: user.id,
                target_user_id: match.user.id,
                score: match.score,
                reasons_json: match.reasons
            });
        }

        await base44.functions.invoke('trackEvent', {
            event_name: 'match_generate',
            event_value: { count: topMatches.length }
        });

        return Response.json({ matches: topMatches.length });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});