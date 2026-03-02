import React from 'react';
import { Card } from '@/components/ui/card';

export default function DebugCard({ title, children, className = '' }) {
  return (
    <Card className={`p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      {children}
    </Card>
  );
}