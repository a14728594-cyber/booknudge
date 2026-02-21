import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // ユーザーの課金ステータスを返す
        return Response.json({
            subscription_status: user.subscription_status || 'free',
            plan: user.plan || 'free',
            stripe_customer_id: user.stripe_customer_id || null,
            subscription_current_period_end: user.subscription_current_period_end || null
        });
    } catch (error) {
        console.error('Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});