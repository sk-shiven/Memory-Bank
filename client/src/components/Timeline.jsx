import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Camera, 
  Mic, 
  FileText, 
  Clock, 
  Flame, 
  Play, 
  Pause,
  Award,
  Sparkles,
  X,
  RotateCcw
} from 'lucide-react';
import { fetchTimeline } from '../api';

export default function Timeline({ onOpenMemory }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('all');
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [playingAudioUrl, setPlayingAudioUrl] = useState(null);
  const audioRef = useRef(null);

  const loadData = async (searchTerm = search) => {
    try {
      setLoading(true);
      const res = await fetchTimeline({
        page: 1,
        limit: 100,
        format: selectedFormat !== 'all' ? selectedFormat : null,
        theme: selectedTheme,
        search: searchTerm
      });
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedFormat, selectedTheme]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(window.__timelineSearchTimeout);
    window.__timelineSearchTimeout = setTimeout(() => {
      loadData(val);
    }, 350);
  };

  const handleClearSearch = () => {
    setSearch('');
    loadData('');
  };

  const togglePlayAudio = (url, e) => {
    if (e) e.stopPropagation();
    if (playingAudioUrl === url) {
      audioRef.current?.pause();
      setPlayingAudioUrl(null);
    } else {
      setPlayingAudioUrl(url);
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play().catch(() => {});
      }
    }
  };

  const memories = data?.memories || [];
  const answeredMemories = memories.filter(m => m.answered && m.answer);
  const throwbackMemory = answeredMemories.length > 1 ? answeredMemories[answeredMemories.length - 1] : null;

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0 20px 4rem', width: '100%' }}>
      
      {/* Hidden global audio element */}
      <audio
        ref={audioRef}
        onEnded={() => setPlayingAudioUrl(null)}
        style={{ display: 'none' }}
      />

      {/* Summary Metrics Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: '12px',
        marginBottom: '24px'
      }}>
        <div className="vintage-card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b8812f', marginBottom: '6px' }}>
            <Award size={16} />
            <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Memories Saved
            </span>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 400, fontFamily: 'var(--font-serif-display)', color: '#2a2d25' }}>
            {data?.total_memories || 0}
          </div>
          <span style={{ fontSize: '12px', color: '#8a877c' }}>
            of 365 daily prompts
          </span>
        </div>

        <div className="vintage-card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#5c8a5c', marginBottom: '6px' }}>
            <Flame size={16} />
            <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Active Days
            </span>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 400, fontFamily: 'var(--font-serif-display)', color: '#2a2d25' }}>
            {data?.current_day || 1}
          </div>
          <span style={{ fontSize: '12px', color: '#8a877c' }}>
            days on this journey
          </span>
        </div>

        <div className="vintage-card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#757267', marginBottom: '6px' }}>
            <Clock size={16} />
            <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Days Remaining
            </span>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 400, fontFamily: 'var(--font-serif-display)', color: '#2a2d25' }}>
            {Math.max(0, 365 - (data?.current_day || 1))}
          </div>
          <span style={{ fontSize: '12px', color: '#8a877c' }}>
            until year is complete
          </span>
        </div>
      </div>

      {/* Throwback Flashback Card */}
      {throwbackMemory && !search && selectedFormat === 'all' && (
        <div
          className="vintage-card"
          onClick={() => onOpenMemory && onOpenMemory(throwbackMemory.answer?.id || throwbackMemory.question_id)}
          style={{
            padding: '24px 28px',
            marginBottom: '28px',
            background: 'linear-gradient(135deg, #fffdf8 0%, #f7f3e8 100%)',
            border: '1px solid #d4cbb3',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: '#eedfc3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Sparkles size={14} color="#b8812f" />
              </div>
              <span style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#b8812f'
              }}>
                Flashback &bull; Day {throwbackMemory.day_number}
              </span>
            </div>
            <span style={{ fontSize: '12px', color: '#8a877c' }}>
              Click to view reflection
            </span>
          </div>

          <h3 style={{
            fontFamily: 'var(--font-serif-display)',
            fontStyle: 'italic',
            fontSize: '22px',
            color: '#2a2d25',
            margin: '0 0 8px'
          }}>
            "{throwbackMemory.question_text}"
          </h3>

          {throwbackMemory.answer?.text && (
            <p style={{
              margin: 0,
              fontSize: '15px',
              lineHeight: 1.6,
              color: '#6e7262',
              fontFamily: 'var(--font-serif-body)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}>
              {throwbackMemory.answer.text}
            </p>
          )}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="vintage-card" style={{ padding: '16px 20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Top row: Search input + Format pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div style={{
              flex: '1 1 240px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 14px',
              background: '#fcfaf5',
              border: '1px solid #d8d0bc',
              borderRadius: '12px'
            }}>
              <Search size={15} color="#8a877c" />
              <input
                type="text"
                placeholder="Search reflections, keywords, prompts..."
                value={search}
                onChange={handleSearchChange}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: '13px',
                  color: '#2a2d25',
                  fontFamily: "'Inter', sans-serif"
                }}
              />
              {search && (
                <button
                  onClick={handleClearSearch}
                  style={{ background: 'transparent', border: 'none', color: '#8a877c', cursor: 'pointer', padding: 0 }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Format Filter Pills with Lucide Icons (NO EMOJIS) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setSelectedFormat('all')}
                className={`vintage-pill ${selectedFormat === 'all' ? 'active' : ''}`}
              >
                <span>All</span>
              </button>

              <button
                onClick={() => setSelectedFormat('text')}
                className={`vintage-pill ${selectedFormat === 'text' ? 'active' : ''}`}
              >
                <FileText size={13} />
                <span>Text</span>
              </button>

              <button
                onClick={() => setSelectedFormat('audio')}
                className={`vintage-pill ${selectedFormat === 'audio' ? 'active' : ''}`}
              >
                <Mic size={13} />
                <span>Voice</span>
              </button>

              <button
                onClick={() => setSelectedFormat('photo')}
                className={`vintage-pill ${selectedFormat === 'photo' ? 'active' : ''}`}
              >
                <Camera size={13} />
                <span>Photos</span>
              </button>
            </div>
          </div>

          {/* Theme tag filters */}
          {selectedTheme && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: '#8a877c' }}>Filtering theme:</span>
              <span className="vintage-badge" style={{ gap: '6px' }}>
                #{selectedTheme}
                <X size={12} style={{ cursor: 'pointer' }} onClick={() => setSelectedTheme(null)} />
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Memory Feed List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#8a877c' }}>
          <p>Loading your memory archives...</p>
        </div>
      ) : memories.length === 0 ? (
        <div className="vintage-card" style={{ padding: '48px 32px', textAlign: 'center' }}>
          <h3 style={{ fontFamily: 'var(--font-serif-display)', fontStyle: 'italic', fontSize: '26px', color: '#6e7262' }}>
            No reflections found
          </h3>
          <p style={{ fontSize: '14px', color: '#8a877c', marginTop: '8px' }}>
            {search ? 'Try clearing your search term or format filters.' : 'Answer today\'s reflection to start building your 365 timeline.'}
          </p>
          {(search || selectedFormat !== 'all' || selectedTheme) && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedFormat('all');
                setSelectedTheme(null);
                loadData('');
              }}
              className="btn-vintage btn-vintage-secondary"
              style={{ marginTop: '16px' }}
            >
              <RotateCcw size={14} />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {memories.map((item) => {
            const hasAnswer = item.answered && item.answer;
            const itemTags = (item.theme_tags || '').split(',').map(t => t.trim()).filter(Boolean);

            return (
              <div
                key={item.question_id}
                className="vintage-card"
                onClick={() => hasAnswer && onOpenMemory && onOpenMemory(item.answer.id)}
                style={{
                  padding: '28px 28px',
                  cursor: hasAnswer ? 'pointer' : 'default',
                  opacity: hasAnswer ? 1 : 0.75
                }}
              >
                {/* Memory Meta Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="vintage-badge">
                      Day {item.day_number}
                    </span>
                    {itemTags.map(tag => (
                      <span
                        key={tag}
                        onClick={(e) => { e.stopPropagation(); setSelectedTheme(tag); }}
                        style={{
                          fontSize: '11px',
                          color: '#6e7262',
                          background: '#f9f7f0',
                          border: '1px solid #e5ded0',
                          padding: '2px 8px',
                          borderRadius: '999px',
                          cursor: 'pointer'
                        }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <span style={{ fontSize: '12px', color: '#8a877c' }}>
                    {item.date ? new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                  </span>
                </div>

                {/* Question in serif italic */}
                <h3 style={{
                  fontFamily: 'var(--font-serif-display)',
                  fontStyle: 'italic',
                  fontSize: '24px',
                  lineHeight: 1.3,
                  color: '#2a2d25',
                  margin: '0 0 12px'
                }}>
                  "{item.question_text}"
                </h3>

                {/* Answer Content */}
                {hasAnswer ? (
                  <div>
                    {item.answer.text && (
                      <p style={{
                        fontSize: '15px',
                        lineHeight: 1.65,
                        fontFamily: 'var(--font-serif-body)',
                        color: '#3d3f35',
                        margin: '0 0 14px',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {item.answer.text}
                      </p>
                    )}

                    {/* Media attachments */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      {item.answer.audio_url && (
                        <button
                          type="button"
                          onClick={(e) => togglePlayAudio(item.answer.audio_url, e)}
                          className="btn-vintage btn-vintage-secondary"
                          style={{ padding: '6px 14px', borderRadius: '999px', fontSize: '12px' }}
                        >
                          {playingAudioUrl === item.answer.audio_url ? <Pause size={13} /> : <Play size={13} />}
                          <span>{playingAudioUrl === item.answer.audio_url ? 'Pause' : 'Play Voice Note'}</span>
                        </button>
                      )}

                      {item.answer.photo_url && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <img
                            src={item.answer.photo_url}
                            alt="Attached snapshot"
                            style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #d8d0bc' }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '13px', color: '#8a877c', fontStyle: 'italic' }}>
                    Unanswered prompt for this day.
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
