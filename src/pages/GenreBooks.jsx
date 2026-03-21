import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import BookCard from '@/components/common/BookCard';
import { ArrowLeft } from 'lucide-react';

const domainConfig = {
    'マーケティング': {
        label: 'マーケティング',
        tags: ['マーケティング', 'marketing', 'セールス', '集客', '広告', 'ブランディング']
    },
    '人間関係': {
        label: '人間関係・コミュニケーション',
        tags: ['人間関係', 'コミュニケーション', '伝える力', 'プレゼン', '言語化', '交渉', '対人スキル', '自己肯定感', '自己防衛', '感情コントロール', 'ストレス', '立ち回り']
    },
    'マインドセット': {
        label: 'マインドセット',
        tags: ['マインドセット', 'メンタルケア', 'メンタル', '行動力', '思考法']
    },
    '起業': {
        label: '起業・ビジネス',
        tags: ['起業', 'ビジネス', '副業', '職場術', '仕事術']
    },
    '習慣': {
        label: '習慣・生活',
        tags: ['習慣', '生活', 'ライフスタイル', '時間管理']
    }
};

export default function GenreBooks() {
    const navigate = useNavigate();
    const urlParams = new URLSearchParams(window.location.search);
    const domain = urlParams.get('domain');
    const config = domainConfig[domain];

    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!domain) return;
        loadBooks();
    }, [domain]);

    const loadBooks = async () => {
        const allBooks = await base44.entities.Book.list('-created_date', 500);
        if (config) {
            const filtered = allBooks.filter(book =>
                book.tags && book.tags.some(bookTag =>
                    config.tags.some(domainTag =>
                        bookTag.toLowerCase().includes(domainTag.toLowerCase()) ||
                        domainTag.toLowerCase().includes(bookTag.toLowerCase())
                    )
                )
            );
            setBooks(filtered);
        } else {
            setBooks(allBooks);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
                <div className="flex items-center gap-3 mb-8">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">{config?.label || domain || 'すべての本'}</h1>
                    {!loading && <span className="text-sm text-gray-400">{books.length}冊</span>}
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {books.map(book => (
                            <BookCard key={book.id} book={book} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}