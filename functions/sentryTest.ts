Deno.serve(async (req) => {
    try {
        const dsn = Deno.env.get('SENTRY_DSN');
        const env = Deno.env.get('SENTRY_ENVIRONMENT') || 'test';
        
        console.log('[sentryTest] Sending test error to Sentry');
        console.log('[sentryTest] DSN configured:', !!dsn);
        console.log('[sentryTest] Environment:', env);

        // テストエラーを発生させる
        throw new Error('SENTRY_TEST_ERROR: This is a test error from the debug endpoint');
    } catch (error) {
        console.error('[sentryTest] Error caught:', error.message);
        
        // 簡易的にログに出力（本番環境でSentryを使う場合はここでSentryに送信）
        return Response.json({ 
            ok: true, 
            message: 'Test error logged',
            error_message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});