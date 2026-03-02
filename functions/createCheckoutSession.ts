import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const mode = Deno.env.get('STRIPE_MODE') || 'test';
const isLive = mode === 'live';

const STRIPE_SECRET_KEY = isLive
    ? Deno.env.get('STRIPE_SECRET_KEY_LIVE')
    : Deno.env.get('STRIPE_SECRET_KEY_TEST');

const STRIPE_PRICE_ID = isLive
    ? Deno.env.get('STRIPE_PRICE_ID_LIVE')
    : Deno.env.get('STRIPE_PRICE_ID_TEST');

console.log(`[INFO] Stripe mode: ${mode}, key prefix: ${STRIPE_SECRET_KEY?.substring(0, 8)}...`);

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: '2024-12-18.acacia'
}) : null;

Deno.serve(async (req) => {
    try {
        if (!STRIPE_SECRET_KEY) {
            return Response.json({ ok: false, code: 'STRIPE_CONFIG_MISSING', message: 'Stripe設定が完了していません。' }, { status: 500 });
        }
        if (!STRIPE_PRICE_ID) {
            return Response.json({ ok: false, code: 'STRIPE_PRICE_MISSING', message: 'Stripe料金設定が完了していません。' }, { status: 500 });
        }

        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ ok: false, code: 'UNAUTHORIZED', message: 'ログインが必要です。' }, { status: 401 });
        }

        const { success_url, cancel_url, next } = await req.json();

        let customerId = user.stripe_customer_id;

        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: { user_id: user.id }
            });
            customerId = customer.id;
            await base44.asServiceRole.entities.User.update(user.id, {
                stripe_customer_id: customerId
            });
        }

        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
            success_url: success_url || `${req.headers.get('origin')}/home`,
            cancel_url: cancel_url || `${req.headers.get('origin')}/paywall`,
            client_reference_id: user.id,
            metadata: { user_id: user.id, next: next || '/' }
        });

        return Response.json({ ok: true, url: session.url });
    } catch (error) {
        console.error('[ERROR]', error.message);
        return Response.json({ ok: false, code: 'INTERNAL_ERROR', message: 'チェックアウトの開始に失敗しました。', details: error.message }, { status: 500 });
    }
});