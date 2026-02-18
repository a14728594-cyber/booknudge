import React from 'react';
import { cn } from '@/lib/utils';

export default function KPICard({ title, value, icon: Icon, trend, trendLabel, colorClass = 'text-indigo-600' }) {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <p className="text-sm text-gray-600 mb-1">{title}</p>
                    <p className="text-3xl font-bold text-gray-900">{value}</p>
                </div>
                {Icon && (
                    <div className={cn('p-3 rounded-xl bg-opacity-10', colorClass, `bg-${colorClass.split('-')[1]}-100`)}>
                        <Icon className={cn('w-6 h-6', colorClass)} />
                    </div>
                )}
            </div>
            {trend !== undefined && (
                <div className="flex items-center gap-2">
                    <span className={cn(
                        'text-sm font-medium',
                        trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-600'
                    )}>
                        {trend > 0 ? '+' : ''}{trend}%
                    </span>
                    {trendLabel && (
                        <span className="text-xs text-gray-500">{trendLabel}</span>
                    )}
                </div>
            )}
        </div>
    );
}