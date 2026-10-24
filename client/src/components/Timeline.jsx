import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Search, 
  Image as ImageIcon, 
  Mic, 
  CheckCircle, 
  Clock, 
  Flame, 
  Play, 
  Pause,
  Award
} from 'lucide-react';
import { fetchTimeline } from '../api';

export default function Timeline({ onSelectDay }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [playingAudioId, setPlayingAudioId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchTimeline();
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '3rem 1.25rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading your 365 journey...</p>
      </div>
    );
  }

  const memories = data?.memories || [];
  const filteredMemories = memories.filter(item => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const matchText = (item.answer?.text || '').toLowerCase().includes(q);
    const matchQuestion = item.question_text.toLowerCase().includes(q);
    const matchTags = (item.theme_tags || '').toLowerCase().includes(q);
    return matchText || matchQuestion || matchTags;
  });

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0 1.25rem 4rem' }}>
      {/* Stats Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: '0.85rem',
        marginBottom: '2rem'
      }}>
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-amber)', marginBottom: '0.35rem' }}>
            <Award size={18} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Total Memories</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>
            {data?.total_memories || 0}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            of 365 daily reflections
          </span>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)', marginBottom: '0.35rem' }}>
            <Flame size={18} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Active Days</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>
            {data?.current_day || 1}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            days since started
          </span>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-emerald)', marginBottom: '0.35rem' }}>
            <Clock size={18} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Days Remaining</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>
            {365 - (data?.current_day || 1)}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            to complete the year
          </span>
        </div>
      </div>

      {/* Search / Filter */}
      <div style={{ position: 'relative', marginBottom: '1.75rem' }}>
        <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search through past memories, themes, or prompts..."
          style={{
            width: '100%',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '0.85rem 1rem 0.85rem 2.85rem',
            color: 'var(--text-main)',
            fontFamily: 'var(--font-body)',
            fontSize: '0.95rem',
            outline: 'none',
          }}
        />
      </div>

      {/* Memory Feed */}
      {filteredMemories.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>No memories found matching your search.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {filteredMemories.map((item) => {
            const dateStr = new Date(item.date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });

            return (
              <div
                key={item.question_id}
                className="glass-panel"
                style={{
                  padding: '1.65rem 1.85rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem'
                }}
              >
                {/* Header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span className="pill pill-amber" style={{ fontSize: '0.75rem' }}>
                      Day {item.day_number}
                    </span>
                    {item.theme_tags && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        #{item.theme_tags.split(',')[0]}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                    {dateStr}
                  </span>
                </div>

                {/* Question */}
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#fff', lineHeight: 1.35 }}>
                  "{item.question_text}"
                </h3>

                {/* Answer Content */}
                {item.answered && item.answer ? (
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.04)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.15rem 1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem'
                  }}>
                    {item.answer.text && (
                      <p style={{ fontSize: '0.975rem', lineHeight: 1.6, color: '#e2e8f0', whiteSpace: 'pre-wrap' }}>
                        {item.answer.text}
                      </p>
                    )}

                    {item.answer.photo_url && (
                      <div>
                        <img
                          src={item.answer.photo_url}
                          alt="Memory"
                          style={{
                            maxWidth: '100%',
                            maxHeight: '280px',
                            borderRadius: 'var(--radius-sm)',
                            objectFit: 'cover'
                          }}
                        />
                      </div>
                    )}

                    {item.answer.audio_url && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <audio
                          id={`audio-${item.question_id}`}
                          src={item.answer.audio_url}
                          onEnded={() => setPlayingAudioId(null)}
                        />
                        <button
                          onClick={() => {
                            const el = document.getElementById(`audio-${item.question_id}`);
                            if (el) {
                              if (playingAudioId === item.question_id) {
                                el.pause();
                                setPlayingAudioId(null);
                              } else {
                                el.play();
                                setPlayingAudioId(item.question_id);
                              }
                            }
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '0.4rem', borderRadius: '50%' }}
                        >
                          {playingAudioId === item.question_id ? <Pause size={14} /> : <Play size={14} />}
                        </button>
                        <span style={{ fontSize: '0.825rem', color: '#a5b4fc' }}>
                          Voice Note Memory
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{
                    fontSize: '0.85rem',
                    color: 'var(--text-dim)',
                    fontStyle: 'italic',
                    padding: '0.5rem 0'
                  }}>
                    Awaiting reflection for this day.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
