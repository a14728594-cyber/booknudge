import * as Sentry from 'npm:@sentry/node@7.108.0';

Deno.serve(async (req) => {
    // Sentry初期化（一度だけ）
    if (!Sentry.getClient()) {
        Sentry.init({
            dsn: Deno.env.get('SENTRY_DSN'),
            environment: Deno.env.get('SENTRY_ENVIRONMENT') || 'test',
            tracesSampleRate: 1.0,
            sendDefaultPii: false
        });
    }

    try {
        // テストエラーを意図的に発生させる
        throw new Error('Test error from /debug/sentry endpoint');
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

        // Sentryへの送信を待つ
        await Sentry.flush(2000);

        return Response.json({ 
            ok: true, 
            message: 'Test error sent to Sentry',
            dsn_configured: !!Deno.env.get('SENTRY_DSN')
        });
    }
});