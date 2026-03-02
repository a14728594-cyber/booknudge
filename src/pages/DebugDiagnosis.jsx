import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import DebugCard from '@/components/debug/DebugCard';
import StepLogger from '@/components/debug/StepLogger';
import { Button } from '@/components/ui/button';
import { Loader2, RotateCcw } from 'lucide-react';

const TIMEOUT_MS = 10000;

export default function DebugDiagnosis() {
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [recommendations, setRecommendations] = useState([]);

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

  const runFullDiagnosisFlow = async () => {
    setLoading(true);
    setSteps([]);
    setResult(null);
    setRecommendations([]);

    try {
      // Step 1: Get user
      addStep('Load user');
      const user = await base44.auth.me();
      updateLastStep('success', `userId: ${user.id}`);

      // Step 2: Save answers
      addStep('Save diagnosis answers');
      const answersData = [
        { domain: 'sales', question_id: 'q1', slider_value: 65, reason_text: 'テスト診断' },
        { domain: 'marketing', question_id: 'q2', slider_value: 72, reason_text: 'テスト診断' },
        { domain: 'mindset', question_id: 'q3', slider_value: 58, reason_text: 'テスト診断' },
      ];

      const answersResponse = await Promise.race([
        Promise.all(answersData.map(a => base44.entities.Answer.create({
          ...a,
          user_id: user.id
        }))),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), TIMEOUT_MS))
      ]);

      console.log('[DebugDiagnosis] Answers saved:', answersResponse.length);
      updateLastStep('success', `saved ${answersResponse.length} answers`);

      // Step 3: Generate recommendations
      addStep('Generate recommendations');
      const recResponse = await Promise.race([
        base44.functions.invoke('generateRecommendations', {
          domains: ['sales', 'marketing', 'mindset']
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), TIMEOUT_MS))
      ]);

      console.log('[DebugDiagnosis] Recommendations:', recResponse.data);
      updateLastStep('success', `generated ${recResponse.data?.books?.length || 0} recommendations`);

      // Step 4: Use recommendations directly (if available)
      if (recResponse.data?.books?.length > 0) {
        addStep('Process recommendations');
        const books = Array.isArray(recResponse.data.books) ? recResponse.data.books.slice(0, 3) : [];
        setRecommendations(books);
        updateLastStep('success', `processed ${books.length} books`);
      }

      setResult('success');
    } catch (error) {
      console.error('[DebugDiagnosis] Error:', error);
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
          <h1 className="text-3xl font-bold text-gray-900">Debug: Diagnosis Flow</h1>
          <Button
            onClick={() => {
              setSteps([]);
              setResult(null);
              setRecommendations([]);
            }}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
        </div>

        {/* Test Button */}
        <DebugCard title="Diagnosis Tests">
          <Button
            onClick={runFullDiagnosisFlow}
            disabled={loading}
            className="w-full gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            📝 Run Complete Diagnosis Flow
          </Button>
        </DebugCard>

        {/* Steps Log */}
        {steps.length > 0 && (
          <DebugCard title="Execution Steps">
            <StepLogger steps={steps} />
          </DebugCard>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <DebugCard title="Generated Recommendations">
            <div className="space-y-3">
              {recommendations.map((book, idx) => (
                <div key={idx} className="p-3 bg-blue-50 rounded-lg">
                  <div className="font-semibold text-gray-900">{book.title}</div>
                  <div className="text-sm text-gray-600">{book.authors?.join(', ')}</div>
                  {book.pain_points && (
                    <div className="text-xs text-gray-500 mt-2">
                      <div className="font-semibold">Why: {book.pain_points.join(', ')}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </DebugCard>
        )}

        {/* Result */}
        {result === 'success' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-sm text-green-700">
              ✓ Diagnosis flow completed successfully
            </div>
          </div>
        )}

        {result === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-sm text-red-700">
              ✗ Diagnosis flow failed - see steps above for details
            </div>
          </div>
        )}
      </div>
    </div>
  );
}