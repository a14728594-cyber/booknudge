import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_API_KEY'), {
    apiVersion: '2024-12-18.acacia'
});

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { success_url, cancel_url } = await req.json();

        // 既存のSubscriptionを取得
        const subscriptions = await base44.entities.Subscription.filter({ user_id: user.id });
        let customerId = null;

        if (subscriptions.length > 0) {
            customerId = subscriptions[0].stripe_customer_id;
        }

        // Stripe Customerがない場合は作成
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: {
                    user_id: user.id
                }
            });
            customerId = customer.id;
        }

        // Checkout Session作成
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'jpy',
                        product_data: {
                            name: 'BusinessLearn プレミアムプラン',
                            description: 'パーソナライズドクイズ、マッチング、DM機能'
                        },
                        unit_amount: 1200,
                        recurring: {
                            interval: 'month'
                        }
                    },
                    quantity: 1
                }
            ],
            success_url: success_url || `${req.headers.get('origin')}/home`,
            cancel_url: cancel_url || `${req.headers.get('origin')}/paywall`,
            metadata: {
                user_id: user.id
            }
        });

        return Response.json({ url: session.url });
    } catch (error) {
        console.error('Checkout error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});