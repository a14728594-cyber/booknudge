import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`[getDebugStatus] userId: ${user.id}`);

    // 各データ取得（失敗してもcontinue）
    const [answers, matches, conversations, events, subscriptions] = await Promise.all([
      base44.entities.Answer.filter({ user_id: user.id }, '-created_date', 1).catch(() => []),
      base44.entities.UserMatch.filter({ viewer_user_id: user.id }, '-created_date', 1).catch(() => []),
      base44.entities.Conversation.filter({}, '-last_message_at', 1).catch(() => []),
      base44.entities.Event.filter({ user_id: user.id }, '-created_date', 10).catch(() => []),
      base44.entities.Subscription.filter({ user_id: user.id }).catch(() => [])
    ]);

    // Stripe関連情報を探す
    const stripeSessionEvent = events.find(e => e.event_value?.session_id);
    const stripeEventIdEvent = events.find(e => e.event_value?.event_id);

    console.log(`[getDebugStatus] answers: ${answers.length}, matches: ${matches.length}, events: ${events.length}`);

    return Response.json({
      userId: user.id,
      email: user.email,
      plan: user.plan || 'free',
      subscriptionStatus: user.subscription_status || 'free',
      stripeCustomerId: user.stripe_customer_id,
      userUpdatedAt: user.updated_date,
      
      // Debug情報
      dsnPresent: !!Deno.env.get('SENTRY_DSN'),
      environment: Deno.env.get('SENTRY_ENVIRONMENT') || 'unknown',
      
      // 最新リソースID
      lastAnswerId: answers[0]?.id,
      lastAnswerAt: answers[0]?.created_date,
      answerCount: answers.length,
      
      lastMatchId: matches[0]?.id,
      lastMatchAt: matches[0]?.created_date,
      matchCount: matches.length,
      
      lastConversationId: conversations[0]?.id,
      lastDMAt: conversations[0]?.last_message_at,
      dmCount: conversations.length,
      
      lastStripeSessionId: stripeSessionEvent?.event_value?.session_id,
      lastStripeEventId: stripeEventIdEvent?.event_value?.event_id,
      
      // Subscription情報
      subscriptionId: subscriptions[0]?.id,
      subscriptionCurrentPeriodEnd: subscriptions[0]?.current_period_end
    });
  } catch (error) {
    console.error('[getDebugStatus] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});