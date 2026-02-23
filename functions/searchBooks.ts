import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function normalizeText(text) {
    if (!text) return '';
    
    // NFKC正規化
    let normalized = text.normalize('NFKC');
    
    // 小文字化
    normalized = normalized.toLowerCase();
    
    // 記号除去
    normalized = normalized.replace(/[・:！？（）『』「」【】\-\.\,\!\?\(\)\[\]\{\}]/g, '');
    
    // スペース除去
    normalized = normalized.replace(/\s+/g, '');
    
    return normalized;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { query } = await req.json();

        if (!query || query.trim().length === 0) {
            return Response.json({ books: [] });
        }

        const normalizedQuery = normalizeText(query);
        
        const allBooks = await base44.entities.Book.list();
        const matchedBooks = allBooks.filter(book => {
            // search_textがあればそれを使う、なければリアルタイムで正規化
            let searchText = book.search_text;
            if (!searchText) {
                const titleText = book.title || '';
                const authorText = (book.authors || []).join(' ');
                searchText = normalizeText(titleText + ' ' + authorText);
            }
            
            return searchText.includes(normalizedQuery);
        });

        return Response.json({ books: matchedBooks.slice(0, 20) });
    } catch (error) {
        console.error('Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});