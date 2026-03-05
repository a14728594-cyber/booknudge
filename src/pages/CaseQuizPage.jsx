import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import QuizTimeGenreSelect from '@/components/casequiz/QuizTimeGenreSelect';
import QuizTimePlayer from '@/components/casequiz/QuizTimePlayer';
import QuizTimeFinish from '@/components/casequiz/QuizTimeFinish';

// フロー: 'genre' -> 'playing' -> 'finish'
export default function CaseQuizPage() {
    const [user, setUser] = useState(null);
    const [flow, setFlow] = useState('genre'); // 'genre' | 'playing' | 'finish'
    const [selectedGenre, setSelectedGenre] = useState(null); // Genre object
    const [quizQueue, setQuizQueue] = useState([]); // 出題するクイズ配列

    useEffect(() => {
        base44.auth.me().then(setUser).catch(() => {});
    }, []);

    const handleStart = (genre, quizzes) => {
        setSelectedGenre(genre);
        setQuizQueue(quizzes);
        setFlow('playing');
    };

    const handleFinish = () => setFlow('finish');

    const handleRestart = (genre, quizzes) => {
        setSelectedGenre(genre);
        setQuizQueue(quizzes);
        setFlow('playing');
    };

    const handleBackToGenre = () => {
        setFlow('genre');
        setSelectedGenre(null);
        setQuizQueue([]);
    };

    if (flow === 'playing') {
        return (
            <QuizTimePlayer
                quizzes={quizQueue}
                user={user}
                genre={selectedGenre}
                onFinish={handleFinish}
                onBack={handleBackToGenre}
            />
        );
    }

    if (flow === 'finish') {
        return (
            <QuizTimeFinish
                genre={selectedGenre}
                user={user}
                onRestart={handleRestart}
                onBackToGenre={handleBackToGenre}
            />
        );
    }

    return (
        <QuizTimeGenreSelect
            user={user}
            onStart={handleStart}
        />
    );
}