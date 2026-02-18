import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Menu, X, BookOpen, Home, Calendar, Users, Share2, Mail, BarChart3, UserCog, MessageSquare, LogOut, User, Send } from 'lucide-react';

export default function Layout({ children, currentPageName }) {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        try {
            const userData = await base44.auth.me();
            setUser(userData);

            // ログインイベント記録
            if (userData) {
                await base44.functions.invoke('trackEvent', {
                    event_name: 'login',
                    event_value: {},
                    update_last_active: true
                });
            }
        } catch (error) {
            // 未ログイン
        }
    };

    const handleLogout = async () => {
        await base44.auth.logout();
        setUser(null);
        navigate(createPageUrl('landing'));
    };

    const isAdminPage = currentPageName.startsWith('admin');
    const isLandingPage = currentPageName === 'landing';

    // ランディングページはレイアウトなし
    if (isLandingPage) {
        return <>{children}</>;
    }

    const userNavItems = [
        { label: 'ホーム', path: 'home', icon: Home },
        { label: 'クイズ', path: 'quiz', icon: Calendar },
        { label: 'DM', path: 'dm', icon: Send },
        { label: 'プロフィール', path: 'profile', icon: User },
        { label: 'URL共有', path: 'share', icon: Share2 },
        { label: 'お問い合わせ', path: 'support', icon: Mail }
    ];

    const adminNavItems = [
        { label: 'ダッシュボード', path: 'admin/dashboard', icon: BarChart3 },
        { label: 'ユーザー管理', path: 'admin/users', icon: UserCog },
        { label: '本管理', path: 'admin/books', icon: BookOpen },
        { label: '問い合わせ', path: 'admin/inquiries', icon: MessageSquare }
    ];

    const navItems = isAdminPage ? adminNavItems : userNavItems;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <Link to={createPageUrl(user ? 'home' : 'landing')} className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                                <BookOpen className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-xl font-bold text-gray-900">
                                BusinessLearn
                            </span>
                        </Link>

                        {/* Desktop Nav */}
                        {user && (
                            <nav className="hidden md:flex items-center gap-2">
                                {navItems.map(item => (
                                    <Link
                                        key={item.path}
                                        to={createPageUrl(item.path)}
                                        className={`group relative p-3 rounded-xl transition-all duration-200 ${
                                            currentPageName === item.path || currentPageName.startsWith(item.path)
                                                ? 'bg-indigo-50 text-indigo-600'
                                                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                                        }`}
                                    >
                                        <item.icon className="w-5 h-5" />
                                        <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                                            {item.label}
                                        </span>
                                    </Link>
                                ))}
                                
                                {user.role === 'admin' && (
                                    <>
                                        <div className="w-px h-6 bg-gray-200 mx-2" />
                                        {!isAdminPage ? (
                                            <Link 
                                                to={createPageUrl('admin/dashboard')}
                                                className="group relative p-3 rounded-xl text-amber-600 hover:bg-amber-50 transition-all duration-200"
                                            >
                                                <BarChart3 className="w-5 h-5" />
                                                <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                                                    管理画面
                                                </span>
                                            </Link>
                                        ) : (
                                            <Link 
                                                to={createPageUrl('home')}
                                                className="group relative p-3 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all duration-200"
                                            >
                                                <Home className="w-5 h-5" />
                                                <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                                                    ユーザー画面
                                                </span>
                                            </Link>
                                        )}
                                    </>
                                )}

                                <div className="w-px h-6 bg-gray-200 mx-2" />
                                <button
                                    onClick={handleLogout}
                                    className="group relative p-3 rounded-xl text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
                                >
                                    <LogOut className="w-5 h-5" />
                                    <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                                        ログアウト
                                    </span>
                                </button>
                            </nav>
                        )}

                        {/* Mobile Menu Button */}
                        {user && (
                            <button
                                className="md:hidden p-2"
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                            >
                                {isMenuOpen ? (
                                    <X className="w-6 h-6" />
                                ) : (
                                    <Menu className="w-6 h-6" />
                                )}
                            </button>
                        )}
                    </div>

                    {/* Mobile Nav */}
                    {user && isMenuOpen && (
                        <nav className="md:hidden mt-4 pb-4 space-y-2">
                            {navItems.map(item => (
                                <Link
                                    key={item.path}
                                    to={createPageUrl(item.path)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                                        currentPageName === item.path || currentPageName.startsWith(item.path)
                                            ? 'bg-indigo-50 text-indigo-600 font-medium'
                                            : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    <item.icon className="w-5 h-5" />
                                    <span>{item.label}</span>
                                </Link>
                            ))}
                            
                            {user.role === 'admin' && !isAdminPage && (
                                <Link 
                                    to={createPageUrl('admin/dashboard')}
                                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    <BarChart3 className="w-5 h-5" />
                                    <span>管理画面</span>
                                </Link>
                            )}
                            
                            {isAdminPage && (
                                <Link 
                                    to={createPageUrl('home')}
                                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    <Home className="w-5 h-5" />
                                    <span>ユーザー画面</span>
                                </Link>
                            )}

                            <button
                                onClick={() => {
                                    handleLogout();
                                    setIsMenuOpen(false);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50"
                            >
                                <LogOut className="w-5 h-5" />
                                <span>ログアウト</span>
                            </button>
                        </nav>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <main>
                {children}
            </main>
        </div>
    );
}