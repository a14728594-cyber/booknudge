import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

Deno.serve(async (req) => {
    try {
        const isLive = false;

        const STRIPE_SECRET_KEY = isLive
            ? Deno.env.get('STRIPE_SECRET_KEY_LIVE')
            : Deno.env.get('STRIPE_SECRET_KEY_TEST');

        const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' });

        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ ok: false, message: 'ログインが必要です。' }, { status: 401 });
        }

        // Subscriptionエンティティから取得
        const subs = await base44.asServiceRole.entities.Subscription.filter({ user_id: user.id });

        if (subs.length === 0 || !subs[0].stripe_subscription_id) {
            return Response.json({ ok: false, message: 'アクティブなサブスクリプションが見つかりません。' }, { status: 404 });
        }

        const sub = subs[0];

        // 期末でキャンセル（即時停止ではなく期間終了まで有効）
        await stripe.subscriptions.update(sub.stripe_subscription_id, {
            cancel_at_period_end: true
        });

        // Subscriptionエンティティ更新
        await base44.asServiceRole.entities.Subscription.update(sub.id, {
            status: 'canceled'
        });

        // Userエンティティ更新
        await base44.asServiceRole.entities.User.update(user.id, {
            subscription_status: 'canceled',
            plan: 'free'
        });

        return Response.json({ ok: true });
    } catch (error) {
        console.error('[ERROR]', error.message);
        return Response.json({ ok: false, message: error.message }, { status: 500 });
    }
});