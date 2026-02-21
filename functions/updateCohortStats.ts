import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { cohort_id, quiz_id } = await req.json();

        // cohort取得
        const cohort = await base44.asServiceRole.entities.SimilarCohort.get(cohort_id);
        if (!cohort) {
            return Response.json({ error: 'Cohort not found' }, { status: 404 });
        }

        // quiz取得
        const quiz = await base44.asServiceRole.entities.Quiz.get(quiz_id);
        if (!quiz) {
            return Response.json({ error: 'Quiz not found' }, { status: 404 });
        }

        // cohortメンバーの回答を取得
        const attempts = await base44.asServiceRole.entities.QuizAttempt.filter({ quiz_id });
        const cohortAttempts = attempts.filter(a => cohort.member_user_ids.includes(a.user_id));

        if (cohortAttempts.length === 0) {
            return Response.json({ ok: true, sample_size: 0, message: 'No attempts yet' });
        }

        let distribution_json = {};

        if (quiz.answer_type === 'choice') {
            const counts = {};
            cohortAttempts.forEach(a => {
                counts[a.answer_value] = (counts[a.answer_value] || 0) + 1;
            });
            const total = cohortAttempts.length;
            Object.keys(counts).forEach(key => {
                distribution_json[key] = counts[key] / total;
            });
        } else if (quiz.answer_type === 'slider') {
            const values = cohortAttempts.map(a => parseFloat(a.answer_value)).filter(v => !isNaN(v));
            if (values.length > 0) {
                const sum = values.reduce((a, b) => a + b, 0);
                const mean = sum / values.length;
                const sorted = [...values].sort((a, b) => a - b);
                const median = sorted[Math.floor(sorted.length / 2)];
                distribution_json = { mean, median, min: sorted[0], max: sorted[sorted.length - 1] };
            }
        }

        // 既存のstatsを確認
        const existingStats = await base44.asServiceRole.entities.CohortAnswerStats.filter({ 
            cohort_id, 
            quiz_id 
        });

        if (existingStats.length > 0) {
            await base44.asServiceRole.entities.CohortAnswerStats.update(existingStats[0].id, {
                sample_size: cohortAttempts.length,
                distribution_json
            });
        } else {
            await base44.asServiceRole.entities.CohortAnswerStats.create({
                cohort_id,
                quiz_id,
                sample_size: cohortAttempts.length,
                distribution_json
            });
        }

        return Response.json({ 
            ok: true, 
            sample_size: cohortAttempts.length,
            distribution_json
        });
    } catch (error) {
        console.error('updateCohortStats error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});