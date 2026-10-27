import React from 'react';
import { Sun, BookOpen, Calendar, Settings } from 'lucide-react';

export default function BottomNav({ currentTab, setCurrentTab, onOpenSettings }) {
  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: '#fffdf8',
      borderTop: '1px solid #d8d0bc',
      display: 'none', // Shown on mobile via CSS media query below or dynamic styling
      alignItems: 'center',
      justifyContent: 'space-around',
      padding: '8px 12px 14px',
      zIndex: 900,
      boxShadow: '0 -4px 16px rgba(42, 45, 37, 0.06)'
    }}
    className="mobile-bottom-nav"
    >
      <button
        onClick={() => setCurrentTab('today')}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '3px',
          background: 'transparent',
          border: 'none',
          color: currentTab === 'today' ? '#b8812f' : '#8a877c',
          cursor: 'pointer',
          fontSize: '11px',
          fontWeight: 600,
          fontFamily: "'Inter', sans-serif"
        }}
      >
        <Sun size={20} />
        <span>Today</span>
      </button>

      <button
        onClick={() => setCurrentTab('timeline')}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '3px',
          background: 'transparent',
          border: 'none',
          color: currentTab === 'timeline' ? '#5c8a5c' : '#8a877c',
          cursor: 'pointer',
          fontSize: '11px',
          fontWeight: 600,
          fontFamily: "'Inter', sans-serif"
        }}
      >
        <BookOpen size={20} />
        <span>Timeline</span>
      </button>

      <button
        onClick={() => setCurrentTab('calendar')}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '3px',
          background: 'transparent',
          border: 'none',
          color: currentTab === 'calendar' ? '#757267' : '#8a877c',
          cursor: 'pointer',
          fontSize: '11px',
          fontWeight: 600,
          fontFamily: "'Inter', sans-serif"
        }}
      >
        <Calendar size={20} />
        <span>365 Grid</span>
      </button>

      <button
        onClick={onOpenSettings}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '3px',
          background: 'transparent',
          border: 'none',
          color: '#8a877c',
          cursor: 'pointer',
          fontSize: '11px',
          fontWeight: 600,
          fontFamily: "'Inter', sans-serif"
        }}
      >
        <Settings size={20} />
        <span>Settings</span>
      </button>
    </nav>
  );
}
