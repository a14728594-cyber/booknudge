import React from 'react';
import { CheckCircle, AlertCircle, Clock, Loader2 } from 'lucide-react';

export default function StepLogger({ steps }) {
  return (
    <div className="space-y-2">
      {steps.map((step, idx) => {
        const isLoading = step.status === 'pending';
        const isSuccess = step.status === 'success';
        const isFailed = step.status === 'failed';

        return (
          <div
            key={idx}
            className={`p-3 rounded-lg border-l-4 ${
              isSuccess
                ? 'bg-green-50 border-green-500'
                : isFailed
                ? 'bg-red-50 border-red-500'
                : isLoading
                ? 'bg-blue-50 border-blue-500'
                : 'bg-gray-50 border-gray-300'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {isLoading && <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />}
                {isSuccess && <CheckCircle className="w-4 h-4 text-green-600" />}
                {isFailed && <AlertCircle className="w-4 h-4 text-red-600" />}
                {!isLoading && !isSuccess && !isFailed && <Clock className="w-4 h-4 text-gray-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-gray-900">{step.name}</div>
                {step.timestamp && (
                  <div className="text-xs text-gray-500 mt-0.5">
                    {new Date(step.timestamp).toLocaleTimeString('ja-JP')}
                  </div>
                )}
                {step.error && (
                  <div className="text-xs text-red-600 mt-1 font-mono break-all">{step.error}</div>
                )}
                {step.data && (
                  <div className="text-xs text-gray-600 mt-1 font-mono bg-white/50 p-1 rounded break-all">
                    {typeof step.data === 'string' ? step.data : JSON.stringify(step.data)}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}