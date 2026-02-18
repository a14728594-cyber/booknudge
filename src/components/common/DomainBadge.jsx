import React from 'react';

const domainColors = {
    sales: 'bg-blue-100 text-blue-700',
    marketing: 'bg-purple-100 text-purple-700',
    relationships: 'bg-pink-100 text-pink-700',
    mindset: 'bg-amber-100 text-amber-700',
    habits: 'bg-green-100 text-green-700'
};

const domainLabels = {
    sales: 'セールス',
    marketing: 'マーケティング',
    relationships: '人間関係',
    mindset: 'マインドセット',
    habits: '習慣'
};

export default function DomainBadge({ domain, className = '' }) {
    return (
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${domainColors[domain]} ${className}`}>
            {domainLabels[domain] || domain}
        </span>
    );
}