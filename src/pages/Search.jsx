import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import BookCard from '@/components/common/BookCard';
import { Search as SearchIcon, Loader2 } from 'lucide-react';

export default function Search() {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const inputRef = useRef(null);
    const suggestionsRef = useRef(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const q = params.get('q');
        if (q) {
            setQuery(q);
            performSearch(q);
        }
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(event.target) &&
                inputRef.current && !inputRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const performSearch = async (searchQuery) => {
        setLoading(true);
        setShowSuggestions(false);
        try {
            await base44.functions.invoke('trackEvent', {
                event_name: 'search',
                event_value: { query: searchQuery }
            });

            const response = await base44.functions.invoke('searchBooks', {
                query: searchQuery
            });
            
            setResults(response.data.books || []);
        } catch (error) {
            console.error('Error searching:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSuggestions = async (searchQuery) => {
        if (!searchQuery || searchQuery.trim().length === 0) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        try {
            const response = await base44.functions.invoke('searchBooks', {
                query: searchQuery
            });
            
            const books = response.data.books || [];
            setSuggestions(books.slice(0, 5));
            setShowSuggestions(books.length > 0);
        } catch (error) {
            console.error('Error fetching suggestions:', error);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (query.trim()) {
            performSearch(query);
        }
    };

    const handleQueryChange = (e) => {
        const newQuery = e.target.value;
        setQuery(newQuery);
        fetchSuggestions(newQuery);
    };

    const handleSuggestionClick = (bookId) => {
        navigate(createPageUrl('Book') + `?id=${bookId}`);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
                        <div className="relative">
                            <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
                            <Input
                                ref={inputRef}
                                type="text"
                                placeholder="本のタイトル、著者で検索..."
                                value={query}
                                onChange={handleQueryChange}
                                className="pl-12 pr-4 py-6 text-lg rounded-2xl border-gray-200 focus:border-indigo-300"
                            />
                            
                            {showSuggestions && suggestions.length > 0 && (
                                <div 
                                    ref={suggestionsRef}
                                    className="absolute top-full mt-2 w-full bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden z-50"
                                >
                                    {suggestions.map((book) => (
                                        <button
                                            key={book.id}
                                            type="button"
                                            onClick={() => handleSuggestionClick(book.id)}
                                            className="w-full px-4 py-3 text-left hover:bg-indigo-50 transition-colors border-b border-gray-100 last:border-b-0"
                                        >
                                            <div className="font-medium text-gray-900">{book.title}</div>
                                            {book.authors && book.authors.length > 0 && (
                                                <div className="text-sm text-gray-600 mt-1">
                                                    {book.authors.join(', ')}
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </form>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                    </div>
                ) : results.length > 0 ? (
                    <>
                        <p className="text-gray-600 mb-6">
                            {results.length}件の結果
                        </p>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {results.map(book => (
                                <BookCard key={book.id} book={book} />
                            ))}
                        </div>
                    </>
                ) : query ? (
                    <div className="text-center py-12 text-gray-600">
                        「{query}」の検索結果が見つかりませんでした
                    </div>
                ) : null}
            </div>
        </div>
    );
}