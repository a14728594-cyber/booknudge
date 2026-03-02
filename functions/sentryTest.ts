Deno.serve(async (req) => {
    const dsn = Deno.env.get('SENTRY_DSN');
    const environment = Deno.env.get('SENTRY_ENVIRONMENT') || 'test';
    
    try {
        console.log('[sentryTest] Start - DSN:', !!dsn, 'Environment:', environment);
        
        // シンプルなテスト用エラーをログして返す
        const eventId = crypto.randomUUID().substring(0, 12);
        
        console.log('[sentryTest] Generated eventId:', eventId);

        return Response.json({ 
            ok: true, 
            eventId: eventId,
            dsnPresent: !!dsn,
            environment: environment,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[sentryTest] Error:', error.message);
        
        return Response.json({ 
            ok: false, 
            error: error.message,
            dsnPresent: !!dsn,
            environment: environment,
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
});