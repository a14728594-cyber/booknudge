import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import CaseQuizGenreSelector from '../components/casequiz/CaseQuizGenreSelector';
import CaseQuizPlayer from '../components/casequiz/CaseQuizPlayer';

export default function CaseQuizPage() {
    const [user, setUser] = useState(null);
    const [selectedGenre, setSelectedGenre] = useState(null);
    const [selectedProblem, setSelectedProblem] = useState(null);
    const [currentQuiz, setCurrentQuiz] = useState(null); // 回答中のクイズ

    useEffect(() => {
        base44.auth.me().then(setUser).catch(() => {});
    }, []);

    if (currentQuiz) {
        return (
            <CaseQuizPlayer
                quiz={currentQuiz}
                user={user}
                onBack={() => setCurrentQuiz(null)}
            />
        );
    }

    return (
        <CaseQuizGenreSelector
            user={user}
            selectedGenre={selectedGenre}
            selectedProblem={selectedProblem}
            onSelectGenre={setSelectedGenre}
            onSelectProblem={setSelectedProblem}
            onStartQuiz={setCurrentQuiz}
        />
    );
}