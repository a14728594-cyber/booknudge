import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get("STRIPE_API_KEY"), {
    apiVersion: '2023-10-16',
});

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const signature = req.headers.get('stripe-signature');
        const body = await req.text();
        
        if (!signature) {
            return Response.json({ error: 'No signature' }, { status: 400 });
        }

        const event = await stripe.webhooks.constructEventAsync(
            body,
            signature,
            Deno.env.get("STRIPE_WEBHOOK_SECRET")
        );

        switch (event.type) {
            case 'invoice.paid': {
                const invoice = event.data.object;
                const customerId = invoice.customer;
                
                // ユーザーを特定
                const subs = await base44.asServiceRole.entities.Subscription.filter({
                    stripe_customer_id: customerId
                });
                
                if (subs.length > 0) {
                    const sub = subs[0];
                    await base44.asServiceRole.entities.User.update(sub.user_id, {
                        plan_status: 'paid'
                    });
                }
                break;
            }

            case 'customer.subscription.updated':
            case 'customer.subscription.created': {
                const subscription = event.data.object;
                const customerId = subscription.customer;
                
                const subs = await base44.asServiceRole.entities.Subscription.filter({
                    stripe_customer_id: customerId
                });
                
                if (subs.length > 0) {
                    const sub = subs[0];
                    await base44.asServiceRole.entities.Subscription.update(sub.id, {
                        stripe_subscription_id: subscription.id,
                        status: subscription.status,
                        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                        current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
                    });

                    // User の subscription_status を更新
                    const userUpdates = await base44.asServiceRole.entities.User.filter({ id: sub.user_id });
                    if (userUpdates.length > 0) {
                        await base44.asServiceRole.auth.updateUser(sub.user_id, {
                            subscription_status: subscription.status
                        });
                    }

                    if (subscription.status === 'active') {
                        
                        await base44.asServiceRole.entities.Event.create({
                            user_id: sub.user_id,
                            event_name: 'subscribe',
                            event_value: { subscription_id: subscription.id }
                        });
                    }
                } else {
                    // 新規サブスクリプション - メタデータからuser_idを取得
                    const userId = subscription.metadata?.user_id;
                    if (userId) {
                        await base44.asServiceRole.entities.Subscription.create({
                            user_id: userId,
                            stripe_customer_id: customerId,
                            stripe_subscription_id: subscription.id,
                            status: subscription.status,
                            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                            current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
                        });

                        // User の subscription_status を更新
                        await base44.asServiceRole.auth.updateUser(userId, {
                            subscription_status: subscription.status
                        });
                    }
                }
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                const customerId = subscription.customer;
                
                const subs = await base44.asServiceRole.entities.Subscription.filter({
                    stripe_customer_id: customerId
                });
                
                if (subs.length > 0) {
                    const sub = subs[0];
                    await base44.asServiceRole.entities.Subscription.update(sub.id, {
                        status: 'canceled'
                    });

                    // User の subscription_status を更新
                    await base44.asServiceRole.auth.updateUser(sub.user_id, {
                        subscription_status: 'canceled'
                    });
                    
                    await base44.asServiceRole.entities.Event.create({
                        user_id: sub.user_id,
                        event_name: 'cancel',
                        event_value: { subscription_id: subscription.id }
                    });
                }
                break;
            }
        }

        return Response.json({ received: true });
    } catch (error) {
        console.error('Webhook error:', error);
        return Response.json({ error: error.message }, { status: 400 });
    }
});