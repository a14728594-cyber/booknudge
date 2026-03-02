import * as Sentry from 'npm:@sentry/node@7.108.0';

Deno.serve(async (req) => {
    try {
        // Sentry初期化
        if (!Sentry.getClient()) {
            Sentry.init({
                dsn: Deno.env.get('SENTRY_DSN'),
                environment: Deno.env.get('SENTRY_ENVIRONMENT') || 'test',
                tracesSampleRate: 1.0,
                sendDefaultPii: false
            });
        }

        // テストエラーを発生させて送信
        throw new Error('SENTRY_TEST_ERROR: This is a test error from /debug/sentry endpoint');
    } catch (error) {
        console.error('[sentryTest] Capturing test error:', error.message);
        
        Sentry.captureException(error, {
            tags: {
                endpoint: 'debug_sentry',
                test: 'true'
            },
            extra: {
                timestamp: new Date().toISOString()
            }
        });

        await Sentry.flush(2000);

        return Response.json({ 
            ok: true, 
            message: 'sent',
            timestamp: new Date().toISOString()
        });
    }
});