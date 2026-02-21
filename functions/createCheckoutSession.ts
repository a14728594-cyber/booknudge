import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

// 環境変数チェック
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
const STRIPE_PRICE_ID = Deno.env.get('STRIPE_PRICE_ID');

if (!STRIPE_SECRET_KEY) {
    console.error('[FATAL] STRIPE_SECRET_KEY is not set');
}

if (!STRIPE_PRICE_ID) {
    console.error('[FATAL] STRIPE_PRICE_ID is not set');
}

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: '2024-12-18.acacia'
}) : null;

Deno.serve(async (req) => {
    const startTime = Date.now();
    console.log('[INFO] Checkout session request started');

    try {
        // 環境変数チェック
        if (!STRIPE_SECRET_KEY) {
            console.error('[ERROR] STRIPE_SECRET_KEY not configured');
            return Response.json({ 
                ok: false, 
                code: 'STRIPE_CONFIG_MISSING',
                message: 'Stripe設定が完了していません。管理者にお問い合わせください。'
            }, { status: 500 });
        }

        if (!STRIPE_PRICE_ID) {
            console.error('[ERROR] STRIPE_PRICE_ID not configured');
            return Response.json({ 
                ok: false, 
                code: 'STRIPE_PRICE_MISSING',
                message: 'Stripe料金設定が完了していません。管理者にお問い合わせください。'
            }, { status: 500 });
        }

        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            console.error('[ERROR] Unauthorized access attempt');
            return Response.json({ 
                ok: false, 
                code: 'UNAUTHORIZED',
                message: 'ログインが必要です。'
            }, { status: 401 });
        }

        console.log(`[INFO] User ${user.id} (${user.email}) requesting checkout`);

        const { success_url, cancel_url, next } = await req.json();

        // User エンティティから stripe_customer_id を確認
        let customerId = user.stripe_customer_id;

        if (!customerId) {
            console.log('[INFO] Creating new Stripe customer');
            try {
                const customer = await stripe.customers.create({
                    email: user.email,
                    metadata: {
                        user_id: user.id
                    }
                });
                customerId = customer.id;
                console.log(`[INFO] Created Stripe customer: ${customerId}`);

                await base44.asServiceRole.entities.User.update(user.id, {
                    stripe_customer_id: customerId
                });
            } catch (customerError) {
                console.error('[ERROR] Failed to create Stripe customer:', customerError.message);
                return Response.json({ 
                    ok: false, 
                    code: 'CUSTOMER_CREATE_FAILED',
                    message: '顧客情報の作成に失敗しました。もう一度お試しください。'
                }, { status: 500 });
            }
        } else {
            console.log(`[INFO] Using existing Stripe customer: ${customerId}`);
        }

        // Checkout Session作成
        console.log(`[INFO] Creating checkout session with price: ${STRIPE_PRICE_ID}`);
        
        try {
            const session = await stripe.checkout.sessions.create({
                customer: customerId,
                mode: 'subscription',
                payment_method_types: ['card'],
                line_items: [
                    {
                        price: STRIPE_PRICE_ID,
                        quantity: 1
                    }
                ],
                success_url: success_url || `${req.headers.get('origin')}/home`,
                cancel_url: cancel_url || `${req.headers.get('origin')}/paywall`,
                client_reference_id: user.id,
                metadata: {
                    user_id: user.id,
                    next: next || '/'
                }
            });

            const duration = Date.now() - startTime;
            console.log(`[SUCCESS] Checkout session created in ${duration}ms: ${session.id}`);
            
            return Response.json({ 
                ok: true, 
                url: session.url 
            });
        } catch (stripeError) {
            console.error('[ERROR] Stripe API error:', stripeError.message);
            console.error('[ERROR] Stripe error type:', stripeError.type);
            console.error('[ERROR] Stripe error code:', stripeError.code);
            
            let errorCode = 'STRIPE_ERROR';
            let errorMessage = 'チェックアウトの開始に失敗しました。もう一度お試しください。';
            
            if (stripeError.code === 'resource_missing') {
                errorCode = 'NO_SUCH_PRICE';
                errorMessage = '料金設定が見つかりません。管理者にお問い合わせください。';
            } else if (stripeError.type === 'StripeInvalidRequestError') {
                errorCode = 'INVALID_REQUEST';
            }
            
            return Response.json({ 
                ok: false, 
                code: errorCode,
                message: errorMessage,
                details: stripeError.message
            }, { status: 500 });
        }
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[ERROR] Unexpected error after ${duration}ms:`, error.message);
        console.error('[ERROR] Stack:', error.stack);
        
        return Response.json({ 
            ok: false, 
            code: 'INTERNAL_ERROR',
            message: 'チェックアウトの開始に失敗しました。もう一度お試しください。問題が続く場合はお問い合わせください。',
            details: error.message
        }, { status: 500 });
    }
});