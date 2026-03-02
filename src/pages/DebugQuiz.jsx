import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import DebugCard from '@/components/debug/DebugCard';
import StepLogger from '@/components/debug/StepLogger';
import { Button } from '@/components/ui/button';
import { Loader2, RotateCcw } from 'lucide-react';

const TIMEOUT_MS = 10000;

export default function DebugQuiz() {
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

  const testQuizFlow = async () => {
    setLoading(true);
    setSteps([]);
    setResult(null);

    try {
      // Step 1: Get user
      addStep('Load user');
      const user = await base44.auth.me();
      updateLastStep('success', `userId: ${user.id}`);

      // Step 2: Create quiz set
      addStep('Create quiz set');
      const quizSetResponse = await Promise.race([
        base44.entities.QuizSet.create({
          user_id: user.id,
          title: 'Debug Quiz Set',
          request_text: 'Debug test',
          is_active: true
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), TIMEOUT_MS))
      ]);

      console.log('[DebugQuiz] Quiz set:', quizSetResponse.id);
      updateLastStep('success', `quizSetId: ${quizSetResponse.id}`);

      // Step 3: Generate question
      addStep('Generate question');
      const genResponse = await Promise.race([
        base44.functions.invoke('generateQuestion', {
          quiz_set_id: quizSetResponse.id,
          domain: 'sales'
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), TIMEOUT_MS))
      ]);

      console.log('[DebugQuiz] Generated question:', genResponse.data);
      updateLastStep('success', `question generated`);

      // Step 4: Save answer
      addStep('Save quiz answer');
      const answerResponse = await Promise.race([
        base44.entities.QuizQuestion.create({
          quiz_set_id: quizSetResponse.id,
          question_json: genResponse.data?.question || {},
          order_index: 1
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), TIMEOUT_MS))
      ]);

      console.log('[DebugQuiz] Answer saved:', answerResponse.id);
      updateLastStep('success', `answerId: ${answerResponse.id}`);

      setResult('success');
    } catch (error) {
      console.error('[DebugQuiz] Error:', error);
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
          <h1 className="text-3xl font-bold text-gray-900">Debug: Quiz Flow</h1>
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

        {/* Test Button */}
        <DebugCard title="Quiz Tests">
          <Button
            onClick={testQuizFlow}
            disabled={loading}
            className="w-full gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            ❓ Test Quiz Flow
          </Button>
        </DebugCard>

        {/* Steps Log */}
        {steps.length > 0 && (
          <DebugCard title="Execution Steps">
            <StepLogger steps={steps} />
          </DebugCard>
        )}

        {/* Result */}
        {result === 'success' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-sm text-green-700">
              ✓ Quiz flow completed successfully
            </div>
          </div>
        )}

        {result === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-sm text-red-700">
              ✗ Quiz flow failed - see steps above for details
            </div>
          </div>
        )}
      </div>
    </div>
  );
}