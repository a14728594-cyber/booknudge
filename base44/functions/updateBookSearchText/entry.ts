import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function normalizeText(text) {
    if (!text) return '';
    
    // NFKC正規化
    let normalized = text.normalize('NFKC');
    
    // 小文字化
    normalized = normalized.toLowerCase();
    
    // 記号除去（・: - ! ? （）『』「」【】など）
    normalized = normalized.replace(/[・:！？（）『』「」【】\-\.\,\!\?\(\)\[\]\{\}]/g, '');
    
    // スペース除去
    normalized = normalized.replace(/\s+/g, '');
    
    return normalized;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const books = await base44.asServiceRole.entities.Book.list();
        
        let updated = 0;
        for (const book of books) {
            const titleText = book.title || '';
            const authorText = (book.authors || []).join(' ');
            const searchText = normalizeText(titleText + ' ' + authorText);
            
            await base44.asServiceRole.entities.Book.update(book.id, {
                search_text: searchText
            });
            updated++;
        }

        return Response.json({ 
            success: true, 
            updated,
            message: `${updated}件の本の検索テキストを更新しました` 
        });
    } catch (error) {
        console.error('Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});