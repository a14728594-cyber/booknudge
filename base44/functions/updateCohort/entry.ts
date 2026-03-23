import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { user_id } = await req.json();
        const targetUserId = user_id || user.id;

        // 対象ユーザーのプロフィール取得
        const profiles = await base44.asServiceRole.entities.Profile.filter({ user_id: targetUserId });
        if (profiles.length === 0) {
            return Response.json({ error: 'Profile not found' }, { status: 404 });
        }
        const targetProfile = profiles[0];

        // 全ユーザーのプロフィール取得
        const allProfiles = await base44.asServiceRole.entities.Profile.list();

        // スコアリング
        const scored = allProfiles
            .filter(p => p.user_id !== targetUserId)
            .map(p => {
                let score = 0;
                const goalMatches = (targetProfile.goal_tags || []).filter(tag => 
                    (p.goal_tags || []).includes(tag)
                ).length;
                const interestMatches = (targetProfile.interest_tags || []).filter(tag => 
                    (p.interest_tags || []).includes(tag)
                ).length;
                
                score += goalMatches * 3; // 目標は重み3
                score += interestMatches * 1; // 興味は重み1
                
                return { user_id: p.user_id, score };
            })
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 200);

        const memberUserIds = scored.map(s => s.user_id);

        // 既存のcohortを確認
        const existingCohorts = await base44.asServiceRole.entities.SimilarCohort.filter({ user_id: targetUserId });
        
        if (existingCohorts.length > 0) {
            await base44.asServiceRole.entities.SimilarCohort.update(existingCohorts[0].id, {
                member_user_ids: memberUserIds,
                sample_size: memberUserIds.length
            });
        } else {
            await base44.asServiceRole.entities.SimilarCohort.create({
                user_id: targetUserId,
                member_user_ids: memberUserIds,
                sample_size: memberUserIds.length
            });
        }

        return Response.json({ 
            ok: true, 
            user_id: targetUserId,
            sample_size: memberUserIds.length 
        });
    } catch (error) {
        console.error('updateCohort error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});