import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Loader2 } from 'lucide-react';

export default function SubscriptionGuard({ children, pagePath }) {
    const navigate = useNavigate();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkSubscription();
    }, []);

    const checkSubscription = async () => {
        try {
            const user = await base44.auth.me();
            
            // 管理者のみアクセス可能
            if (user.role === 'admin') {
                setIsAuthorized(true);
            } else {
                // イベント記録
                await base44.functions.invoke('trackEvent', {
                    event_name: 'gated_access_blocked',
                    event_value: { path: pagePath }
                });

                // Paywallへリダイレクト
                navigate(createPageUrl('paywall') + '?next=' + encodeURIComponent(pagePath) + '&from=' + pagePath.split('/')[1]);
            }
        } catch (error) {
            console.error('Failed to check subscription:', error);
            navigate(createPageUrl('home'));
        }
        setLoading(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return isAuthorized ? children : null;
}