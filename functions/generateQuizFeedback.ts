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

        // GPTでフィードバック生成（超簡潔版）
        const prompt = `あなたはビジネスコーチです。以下のクイズ回答に対して、超簡潔なフィードバックを生成してください。

【クイズ】
${quiz.scenario_text}
回答: ${attempt.answer_value}

【重要】各項目は30文字以内で出力してください。

以下のJSON形式で出力：
{
  "summary_one_liner": "一言評価（30文字以内）",
  "strength_text": "良い点（30文字以内）",
  "blindspot_text": "注意点（30文字以内）",
  "next_action_text": "次の一歩（30文字以内）"
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