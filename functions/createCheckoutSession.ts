import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

Deno.serve(async (req) => {
    const requestId = crypto.randomUUID().substring(0, 8);
    console.log(`[${requestId}] createCheckoutSession started`);
    
    try {
        // モード固定: テストは 'test'、本番リリース時は 'live' に変更してデプロイ
        const mode = 'test';
        const isLive = false;

        const STRIPE_SECRET_KEY = isLive
            ? Deno.env.get('STRIPE_SECRET_KEY_LIVE')
            : Deno.env.get('STRIPE_SECRET_KEY_TEST');

        const STRIPE_PRICE_ID = isLive
            ? Deno.env.get('STRIPE_PRICE_ID_LIVE')
            : Deno.env.get('STRIPE_PRICE_ID_TEST');

        console.log(`[${requestId}] Stripe mode: ${mode}, key prefix: ${STRIPE_SECRET_KEY?.substring(0, 8)}...`);

        if (!STRIPE_SECRET_KEY) {
            return Response.json({ ok: false, code: 'STRIPE_CONFIG_MISSING', message: 'Stripe設定が完了していません。' }, { status: 500 });
        }
        if (!STRIPE_PRICE_ID) {
            return Response.json({ ok: false, code: 'STRIPE_PRICE_MISSING', message: 'Stripe料金設定が完了していません。' }, { status: 500 });
        }

        const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' });

        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            console.log(`[${requestId}] Auth failed - no user`);
            return Response.json({ ok: false, code: 'UNAUTHORIZED', message: 'ログインが必要です。' }, { status: 401 });
        }

        console.log(`[${requestId}] User authenticated: ${user.id} (${user.email})`);

        const { success_url, cancel_url, next } = await req.json();

        const customerIdField = isLive ? 'stripe_customer_id_live' : 'stripe_customer_id_test';
        let customerId = user[customerIdField];

        if (!customerId) {
            const existing = await stripe.customers.list({ email: user.email, limit: 1 });
            if (existing.data.length > 0) {
                customerId = existing.data[0].id;
            } else {
                const customer = await stripe.customers.create({
                    email: user.email,
                    metadata: { user_id: user.id }
                });
                customerId = customer.id;
            }
            await base44.asServiceRole.entities.User.update(user.id, {
                [customerIdField]: customerId
            });
        }

        console.log(`[${requestId}] Creating checkout session for customer: ${customerId}`);

        const finalSuccessUrl = success_url || `${req.headers.get('origin')}/home`;
        const successUrlWithSession = finalSuccessUrl.includes('?') 
            ? `${finalSuccessUrl}&session_id={CHECKOUT_SESSION_ID}`
            : `${finalSuccessUrl}?session_id={CHECKOUT_SESSION_ID}`;

        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
            success_url: successUrlWithSession,
            cancel_url: cancel_url || `${req.headers.get('origin')}/paywall`,
            client_reference_id: user.id,
            metadata: { user_id: user.id, next: next || '/' }
        });

        console.log(`[${requestId}] Checkout session created: ${session.id}, redirecting to Stripe`);
        return Response.json({ ok: true, url: session.url });
    } catch (error) {
        console.error(`[${requestId}] ERROR:`, error.message, error.stack);
        return Response.json({ ok: false, code: 'INTERNAL_ERROR', message: 'チェックアウトの開始に失敗しました。', details: error.message }, { status: 500 });
    }
});