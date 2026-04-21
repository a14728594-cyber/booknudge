import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ArrowRight, Clock, BarChart2, Star, RotateCcw, CheckCircle2 } from 'lucide-react';
import { ENDING_CONFIG } from '@/lib/gameEngine';

const GENRE_LABEL = { marketing: 'マーケティング', branding: 'ブランディング' };
const GENRE_COLOR = { marketing: 'bg-indigo-100 text-indigo-700', branding: 'bg-purple-100 text-purple-700' };
const DIFFICULTY_LABEL = { easy: '★☆☆ かんたん', normal: '★★☆ ふつう', hard: '★★★ むずかしい' };

export default function BusinessStory() {
  const navigate = useNavigate();
  const [episodes, setEpisodes] = useState([]);
  const [sessions, setSessions] = useState({});
  const [diagnosisTypes, setDiagnosisTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [eps, userData] = await Promise.all([
        base44.entities.GameEpisode.filter({ is_active: true }, 'order', 20),
        base44.auth.me().catch(() => null)
      ]);
      setEpisodes(eps);
      setUser(userData);

      if (userData) {
        const [playSessions, diag] = await Promise.all([
          base44.entities.GamePlaySession.filter({ user_id: userData.id }, '-created_date', 50),
          base44.entities.DiagnosisSession.filter({ user_id: userData.id, is_latest: true }, '-created_date', 1)
        ]);

        // セッションをepisode_idでまとめる（最新のみ）
        const sessionMap = {};
        for (const s of playSessions) {
          if (!sessionMap[s.episode_id] || s.created_date > sessionMap[s.episode_id].created_date) {
            sessionMap[s.episode_id] = s;
          }
        }
        setSessions(sessionMap);

        // 診断タイプ
        if (diag[0]?.result_type_keys) {
          setDiagnosisTypes(diag[0].result_type_keys);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = (ep, isReplay = false) => {
    navigate(`/business-story/play?episode_id=${ep.id}&replay=${isReplay}`);
  };

  const isRecommended = (ep) => {
    if (!ep.linked_diagnosis_types || diagnosisTypes.length === 0) return false;
    return ep.linked_diagnosis_types.some(t => diagnosisTypes.includes(t));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 mb-4">
            <span className="text-amber-400 text-sm font-semibold">BUSINESS STORY</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">ビジネスストーリー</h1>
          <p className="text-indigo-200 text-base">あなたならどう判断する？正解のないビジネスゲーム</p>
        </div>

        {/* Episodes */}
        <div className="space-y-4">
          {episodes.map(ep => {
            const session = sessions[ep.id];
            const played = session?.is_completed;
            const recommended = isRecommended(ep);
            const endingConf = played && session.ending_type ? ENDING_CONFIG[session.ending_type] : null;

            return (
              <div key={ep.id} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl overflow-hidden hover:bg-white/15 transition-all">
                <div className="p-5">
                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${GENRE_COLOR[ep.genre] || 'bg-gray-100 text-gray-600'}`}>
                      {GENRE_LABEL[ep.genre] || ep.genre}
                    </span>
                    {recommended && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        あなたにおすすめ
                      </span>
                    )}
                    {played && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-400/20 text-green-300 border border-green-400/40 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        プレイ済み
                      </span>
                    )}
                  </div>

                  <h2 className="text-lg font-bold text-white mb-1">{ep.title}</h2>
                  {ep.protagonist && <p className="text-sm text-indigo-200 mb-3">{ep.protagonist}</p>}
                  {ep.description && <p className="text-xs text-indigo-300 mb-4 line-clamp-2">{ep.description}</p>}

                  <div className="flex items-center gap-4 text-xs text-indigo-300 mb-4">
                    <span className="flex items-center gap-1">
                      <BarChart2 className="w-3.5 h-3.5" />
                      {DIFFICULTY_LABEL[ep.difficulty] || ep.difficulty}
                    </span>
                    {ep.estimated_minutes && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        約{ep.estimated_minutes}分
                      </span>
                    )}
                  </div>

                  {/* プレイ済み結末表示 */}
                  {played && endingConf && (
                    <div className={`mb-4 p-3 rounded-xl bg-gradient-to-r ${endingConf.color} bg-opacity-20`}>
                      <p className="text-white font-semibold text-sm">
                        {endingConf.emoji} 前回の結末: {endingConf.label}
                      </p>
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="flex gap-2">
                    {!played ? (
                      <Button
                        onClick={() => handlePlay(ep)}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
                      >
                        プレイする <ArrowRight className="w-4 h-4" />
                      </Button>
                    ) : (
                      <>
                        <Button
                          onClick={() => handlePlay(ep, true)}
                          variant="outline"
                          className="flex-1 border-white/30 text-white hover:bg-white/10 gap-2"
                        >
                          <RotateCcw className="w-4 h-4" />
                          別の結末を見る
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {episodes.length === 0 && (
          <div className="text-center py-16 text-indigo-300">
            <p className="text-lg">エピソードを準備中です...</p>
          </div>
        )}

        <div className="mt-8 text-center">
          <Link to="/home" className="text-indigo-300 text-sm hover:text-white transition-colors">
            ← ホームに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}