import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 有料プランチェック
        if (user.subscription_status !== 'active') {
            return Response.json({ error: 'Premium required' }, { status: 403 });
        }

        const { attempt_id } = await req.json();

        // 既存のフィードバックチェック
        const existing = await base44.asServiceRole.entities.QuizFeedback.filter({ attempt_id });
        if (existing.length > 0) {
            return Response.json({ ok: true, feedback: existing[0] });
        }

        // attempt取得
        const attempt = await base44.asServiceRole.entities.QuizAttempt.get(attempt_id);
        if (!attempt) {
            return Response.json({ error: 'Attempt not found' }, { status: 404 });
        }

        // quiz取得
        const quiz = await base44.asServiceRole.entities.Quiz.get(attempt.quiz_id);
        if (!quiz) {
            return Response.json({ error: 'Quiz not found' }, { status: 404 });
        }

        // profile取得
        const profiles = await base44.asServiceRole.entities.Profile.filter({ user_id: attempt.user_id });
        const profile = profiles[0] || {};

        // cohort取得
        const cohorts = await base44.asServiceRole.entities.SimilarCohort.filter({ user_id: attempt.user_id });
        let distributionSummary = '';
        if (cohorts.length > 0) {
            const stats = await base44.asServiceRole.entities.CohortAnswerStats.filter({
                cohort_id: cohorts[0].id,
                quiz_id: quiz.id
            });
            if (stats.length > 0) {
                distributionSummary = JSON.stringify(stats[0].distribution_json);
            }
        }

        // GPTでフィードバック生成
        const prompt = `あなたはビジネス書の専門家です。以下のクイズ結果に対して、正解を断定せず、フィードバックを生成してください。

【クイズ】
タイトル: ${quiz.title}
状況: ${quiz.scenario_text}
形式: ${quiz.answer_type}
${quiz.choices ? `選択肢: ${quiz.choices.join(', ')}` : ''}

【ユーザーの回答】
${attempt.answer_value}

【似てる人の分布】
${distributionSummary || 'データなし'}

【ユーザーの目標・興味】
目標: ${(profile.goal_tags || []).join(', ') || 'なし'}
興味: ${(profile.interest_tags || []).join(', ') || 'なし'}

以下のJSON形式で出力してください：
{
  "summary_one_liner": "一言でこの回答を評価",
  "strength_text": "この選択の良い点・強み（2-3文）",
  "blindspot_text": "起こりがちなリスクや盲点（2-3文）",
  "next_action_text": "明日できる具体的な行動1つ（1-2文）"
}`;

        const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
                type: 'object',
                properties: {
                    summary_one_liner: { type: 'string' },
                    strength_text: { type: 'string' },
                    blindspot_text: { type: 'string' },
                    next_action_text: { type: 'string' }
                }
            }
        });

        const feedback = await base44.asServiceRole.entities.QuizFeedback.create({
            attempt_id,
            ...result
        });

        return Response.json({ ok: true, feedback });
    } catch (error) {
        console.error('generateQuizFeedback error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});