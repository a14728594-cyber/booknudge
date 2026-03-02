import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import DebugCard from '@/components/debug/DebugCard';
import StepLogger from '@/components/debug/StepLogger';
import { Button } from '@/components/ui/button';
import { Loader2, RotateCcw } from 'lucide-react';

const TIMEOUT_MS = 10000;

export default function DebugBilling() {
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const addStep = (name, status = 'pending', data = null, error = null) => {
    setSteps(prev => [...prev, {
      name,
      status,
      timestamp: new Date().toISOString(),
      data,
      error
    }]);
  };

  const updateLastStep = (status, data = null, error = null) => {
    setSteps(prev => {
      const updated = [...prev];
      if (updated.length > 0) {
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          status,
          data,
          error,
          timestamp: new Date().toISOString()
        };
      }
      return updated;
    });
  };

  const testCheckoutFlow = async () => {
    setLoading(true);
    setSteps([]);
    setResult(null);

    try {
      // Step 1: Get user
      addStep('Get current user');
      const user = await base44.auth.me();
      console.log('[DebugBilling] User:', user.id);
      updateLastStep('success', `userId: ${user.id}`);

      // Step 2: Create checkout session
      addStep('Create checkout session');
      const checkoutResponse = await Promise.race([
        base44.functions.invoke('createCheckoutSession', {
          success_url: `${window.location.origin}/#/DebugBillingSuccess?test=true`,
          cancel_url: `${window.location.origin}/#/DebugBilling`,
          next: '/'
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), TIMEOUT_MS))
      ]);
      
      console.log('[DebugBilling] Checkout response:', checkoutResponse.data);
      updateLastStep('success', `sessionId: ${checkoutResponse.data.url?.split('checkout/')[1]?.substring(0, 20)}...`);

      // Step 3: Redirect to Stripe
      addStep('Redirecting to Stripe...');
      setResult('checkout_ready');
      
      if (checkoutResponse.data?.url) {
        setTimeout(() => {
          window.location.href = checkoutResponse.data.url;
        }, 2000);
      }
    } catch (error) {
      console.error('[DebugBilling] Error:', error);
      updateLastStep('failed', null, error.message);
      setResult('error');
    } finally {
      setLoading(false);
    }
  };

  const testVerifySession = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');

    if (!sessionId) {
      alert('No session_id in URL');
      return;
    }

    setLoading(true);
    setSteps([]);
    setResult(null);

    try {
      addStep('Verify checkout session');
      const verifyResponse = await Promise.race([
        base44.functions.invoke('verifyCheckoutSession', { session_id: sessionId }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), TIMEOUT_MS))
      ]);

      console.log('[DebugBilling] Verify response:', verifyResponse.data);
      
      if (verifyResponse.data?.ok) {
        updateLastStep('success', `active: ${verifyResponse.data.subscription_active}`);
        setResult('verified');

        // Check updated user data
        addStep('Check user entitlements');
        const user = await base44.auth.me();
        updateLastStep('success', `plan: ${user.plan}, status: ${user.subscription_status}`);
      } else {
        updateLastStep('failed', null, verifyResponse.data?.message);
        setResult('error');
      }
    } catch (error) {
      console.error('[DebugBilling] Verify error:', error);
      updateLastStep('failed', null, error.message);
      setResult('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Debug: Billing Flow</h1>
          <Button
            onClick={() => {
              setSteps([]);
              setResult(null);
            }}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
        </div>

        {/* Test Buttons */}
        <DebugCard title="Billing Tests">
          <div className="space-y-3">
            <Button
              onClick={testCheckoutFlow}
              disabled={loading}
              className="w-full gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              💳 Test Checkout Session
            </Button>
            <Button
              onClick={testVerifySession}
              disabled={loading}
              variant="outline"
              className="w-full gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              ✓ Verify Session (if session_id in URL)
            </Button>
          </div>
        </DebugCard>

        {/* Steps Log */}
        {steps.length > 0 && (
          <DebugCard title="Execution Steps">
            <StepLogger steps={steps} />
          </DebugCard>
        )}

        {/* Result */}
        {result === 'checkout_ready' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-700">
              ✓ Checkout session created. Redirecting to Stripe...
            </div>
          </div>
        )}

        {result === 'verified' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-sm text-green-700">
              ✓ Session verified and user entitlements updated
            </div>
          </div>
        )}

        {result === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-sm text-red-700">
              ✗ Billing flow failed - see steps above for details
            </div>
          </div>
        )}
      </div>
    </div>
  );
}