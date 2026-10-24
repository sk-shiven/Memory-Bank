import React from 'react';
import { Calendar, BookOpen, Settings, Sparkles } from 'lucide-react';

export default function Header({ currentTab, setCurrentTab, currentDay, onOpenSettings }) {
  const percentComplete = Math.round((currentDay / 365) * 100);

  return (
    <header style={{
      maxWidth: '860px',
      margin: '0 auto',
      padding: '1.75rem 1.25rem 1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.25rem'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 18px rgba(99, 102, 241, 0.4)',
            fontWeight: 800,
            fontSize: '1.1rem',
            color: '#fff',
            letterSpacing: '-0.03em'
          }}>
            365
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, lineHeight: 1.15 }}>
              Memory Bank
            </h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
              One daily prompt. 365 memories.
            </p>
          </div>
        </div>

        {/* Progress & Settings */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-full)',
            padding: '0.35rem 0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem'
          }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              Day <span style={{ color: '#fff' }}>{currentDay}</span>/365
            </span>
            <div style={{
              width: '44px',
              height: '5px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${Math.max(percentComplete, 1)}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #6366f1, #f59e0b)'
              }} />
            </div>
          </div>

          <button
            onClick={onOpenSettings}
            className="btn btn-secondary"
            style={{ padding: '0.55rem', borderRadius: '50%' }}
            aria-label="Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <nav style={{
        display: 'flex',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '0.25rem',
        gap: '0.25rem'
      }}>
        <button
          onClick={() => setCurrentTab('today')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '0.65rem',
            borderRadius: '10px',
            border: 'none',
            fontSize: '0.88rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: currentTab === 'today' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
            color: currentTab === 'today' ? '#a5b4fc' : 'var(--text-muted)'
          }}
        >
          <Sparkles size={16} />
          Today's Prompt
        </button>

        <button
          onClick={() => setCurrentTab('timeline')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '0.65rem',
            borderRadius: '10px',
            border: 'none',
            fontSize: '0.88rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: currentTab === 'timeline' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
            color: currentTab === 'timeline' ? '#a5b4fc' : 'var(--text-muted)'
          }}
        >
          <BookOpen size={16} />
          Timeline
        </button>
      </nav>
    </header>
  );
}
