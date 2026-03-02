import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // ユーザーのサブスク状態を確認
        const userRecord = await base44.entities.User.filter({ id: user.id });
        if (userRecord.length === 0) {
            return Response.json({ error: 'User not found' }, { status: 404 });
        }

        const userData = userRecord[0];
        const isPro = userData.subscription_status === 'active';

        // Pro はチェック不要
        if (isPro) {
            return Response.json({ canAnswer: true, isPro: true });
        }

        // Free ユーザーは1日5問制限
        // JST基準で当日分の回答を集計
        const now = new Date();
        const jst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
        const todayStart = new Date(jst.getFullYear(), jst.getMonth(), jst.getDate());
        const todayStartISO = todayStart.toISOString();

        // 本日の回答数を数える（created_date >= todayStart）
        const todaysAnswers = await base44.entities.QuizAnswer.filter({
            user_id: user.id
        });

        const todayCount = todaysAnswers.filter(answer => {
            const answerDate = new Date(answer.created_date);
            return answerDate >= todayStart;
        }).length;

        const canAnswer = todayCount < 5;
        const remaining = Math.max(0, 5 - todayCount);

        return Response.json({
            canAnswer,
            isPro: false,
            todayCount,
            remaining,
            limit: 5
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});