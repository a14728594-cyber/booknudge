import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import DebugCard from '@/components/debug/DebugCard';
import { RefreshCw, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DebugStatus() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({
    userId: null,
    email: null,
    plan: null,
    subscriptionStatus: null,
    userUpdatedAt: null,
    dsnPresent: false,
    environment: null,
    answerCount: 0,
    lastAnswerId: null,
    lastAnswerAt: null,
    matchCount: 0,
    lastMatchAt: null,
    dmCount: 0,
    lastDMAt: null,
    stripeCustomerId: null,
    lastStripeSessionId: null,
    lastStripeEventId: null,
    recentError: null
  });

  const loadStatus = async () => {
    setLoading(true);
    try {
      console.log('[DebugStatus] Calling getDebugStatus...');
      const response = await base44.functions.invoke('getDebugStatus', {});
      console.log('[DebugStatus] Response:', response.data);
      setStatus(response.data);
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
    { label: 'Email', value: status.email },
    { label: 'Plan', value: status.plan, highlight: status.plan === 'premium' },
    { label: 'Subscription Status', value: status.subscriptionStatus, highlight: status.subscriptionStatus === 'active' },
    { label: 'Updated At', value: status.userUpdatedAt ? new Date(status.userUpdatedAt).toLocaleString('ja-JP') : 'N/A' },
    { label: 'Stripe Customer ID', value: status.stripeCustomerId || 'None', copy: !!status.stripeCustomerId },
    { label: 'Last Answer At', value: status.lastAnswerAt ? new Date(status.lastAnswerAt).toLocaleString('ja-JP') : 'None' },
    { label: 'Answer Count', value: status.answerCount },
    { label: 'Match Count', value: status.matchCount },
    { label: 'Last Match At', value: status.lastMatchAt ? new Date(status.lastMatchAt).toLocaleString('ja-JP') : 'None' },
    { label: 'DM Count', value: status.dmCount },
    { label: 'Last Stripe Session ID', value: status.lastStripeSessionId?.substring(0, 20) + '...' || 'None', copy: !!status.lastStripeSessionId },
    { label: 'Last Stripe Event ID', value: status.lastStripeEventId?.substring(0, 20) + '...' || 'None', copy: !!status.lastStripeEventId },
    { label: 'DSN Present', value: status.dsnPresent ? '✓ Yes' : '✗ No', highlight: status.dsnPresent },
    { label: 'Environment', value: status.environment || 'unknown' },
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