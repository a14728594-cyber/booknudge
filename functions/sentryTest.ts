import * as Sentry from 'npm:@sentry/node@7.108.0';

Deno.serve(async (req) => {
    const dsn = Deno.env.get('SENTRY_DSN');
    const environment = Deno.env.get('SENTRY_ENVIRONMENT') || 'test';
    
    try {
        // Sentry初期化
        if (!Sentry.getClient()) {
            Sentry.init({
                dsn: dsn,
                environment: environment,
                tracesSampleRate: 1.0,
                sendDefaultPii: false
            });
        }

        // テストエラーを発生させて送信、eventIdを取得
        const eventId = Sentry.captureException(new Error('SENTRY_TEST_ERROR: This is a test error from /debug/sentry endpoint'), {
            tags: {
                endpoint: 'debug_sentry',
                test: 'true'
            },
            extra: {
                timestamp: new Date().toISOString()
            }
        });

        // 送信を確実にするため flush を実行
        await Sentry.flush(2000);

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