import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import DebugCard from '@/components/debug/DebugCard';
import { RefreshCw, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DebugStatus() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({
    userId: null,
    userEmail: null,
    plan: null,
    subscriptionStatus: null,
    updatedAt: null,
    dsnPresent: false,
    environment: null,
    answerCount: 0,
    lastAnswerId: null,
    matchCount: 0,
    lastMatchAt: null,
    dmCount: 0,
    lastDMAt: null,
    stripeCustomerId: null,
    lastSessionId: null,
    lastEventId: null,
    recentError: null
  });

  const loadStatus = async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me();
      console.log('[DebugStatus] User loaded:', user.id);

      // 各エンティティのデータを取得
      const [answers, matches, conversations, events] = await Promise.all([
        base44.entities.Answer.filter({ user_id: user.id }, '-created_date', 1).catch(() => []),
        base44.entities.UserMatch.filter({ viewer_user_id: user.id }, '-created_date', 1).catch(() => []),
        base44.entities.Conversation.filter({}, '-last_message_at', 1).catch(() => []),
        base44.entities.Event.filter({ user_id: user.id }, '-created_date', 5).catch(() => [])
      ]);

      const lastStripeEvent = events.find(e => e.event_name && e.event_name.includes('subscribe'));
      
      setStatus({
        userId: user.id,
        userEmail: user.email,
        plan: user.plan || 'free',
        subscriptionStatus: user.subscription_status || 'free',
        updatedAt: user.updated_date,
        dsnPresent: !!process.env.SENTRY_DSN,
        environment: 'unknown',
        answerCount: answers.length,
        lastAnswerId: answers[0]?.id,
        matchCount: matches.length,
        lastMatchAt: matches[0]?.created_date,
        dmCount: conversations.length,
        lastDMAt: conversations[0]?.last_message_at,
        stripeCustomerId: user.stripe_customer_id,
        lastSessionId: null,
        lastEventId: lastStripeEvent?.id,
        recentError: null
      });
    } catch (error) {
      console.error('[DebugStatus] Error:', error);
      setStatus(prev => ({
        ...prev,
        recentError: error.message
      }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const statusItems = [
    { label: 'User ID', value: status.userId, copy: true },
    { label: 'Email', value: status.userEmail },
    { label: 'Plan', value: status.plan, highlight: status.plan === 'premium' },
    { label: 'Subscription Status', value: status.subscriptionStatus, highlight: status.subscriptionStatus === 'active' },
    { label: 'Updated At', value: status.updatedAt ? new Date(status.updatedAt).toLocaleString('ja-JP') : 'N/A' },
    { label: 'Stripe Customer ID', value: status.stripeCustomerId || 'None', copy: !!status.stripeCustomerId },
    { label: 'Answer Count', value: status.answerCount },
    { label: 'Match Count', value: status.matchCount },
    { label: 'DM Count', value: status.dmCount },
    { label: 'DSN Present', value: status.dsnPresent ? '✓ Yes' : '✗ No', highlight: status.dsnPresent },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Debug Status Dashboard</h1>
          <Button
            onClick={loadStatus}
            disabled={loading}
            className="gap-2"
            variant="outline"
          >
            <RefreshCw className="w-4 h-4" />
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>

        {/* Main Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {statusItems.map((item, idx) => (
            <DebugCard key={idx} title={item.label}>
              <div className={`text-lg font-mono ${item.highlight ? 'text-green-600 font-bold' : 'text-gray-700'}`}>
                {item.value}
              </div>
              {item.copy && (
                <button
                  onClick={() => navigator.clipboard.writeText(String(item.value))}
                  className="text-xs text-blue-600 hover:underline mt-2"
                >
                  Copy
                </button>
              )}
            </DebugCard>
          ))}
        </div>

        {/* Quick Test Buttons */}
        <DebugCard title="Quick Tests">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <a href="/#/DebugBilling">
              <Button className="w-full gap-2" variant="outline">
                💳 Test Billing
                <ExternalLink className="w-4 h-4" />
              </Button>
            </a>
            <a href="/#/DebugDiagnosis">
              <Button className="w-full gap-2" variant="outline">
                📝 Test Diagnosis
                <ExternalLink className="w-4 h-4" />
              </Button>
            </a>
            <a href="/#/DebugQuiz">
              <Button className="w-full gap-2" variant="outline">
                ❓ Test Quiz
                <ExternalLink className="w-4 h-4" />
              </Button>
            </a>
            <a href="/#/DebugMatch">
              <Button className="w-full gap-2" variant="outline">
                🔗 Test Match
                <ExternalLink className="w-4 h-4" />
              </Button>
            </a>
          </div>
        </DebugCard>

        {/* Error Display */}
        {status.recentError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-sm font-mono text-red-600">{status.recentError}</div>
          </div>
        )}
      </div>
    </div>
  );
}