import React from 'react';
import { Sun, BookOpen, Calendar, Settings, Flame, LogOut } from 'lucide-react';

export default function Header({
  currentTab,
  setCurrentTab,
  currentDay = 1,
  streakCount = 0,
  onOpenSettings,
  onLogout
}) {
  const percentComplete = Math.min(100, Math.round((currentDay / 365) * 100));

  return (
    <header style={{
      maxWidth: '960px',
      margin: '0 auto',
      width: '100%',
      padding: '24px 20px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '18px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        {/* Brand identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            backgroundColor: '#D9D3C5',
            border: '1px solid #d8d0bc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(42, 45, 37, 0.08)'
          }}>
            <span style={{
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontSize: '24px',
              fontWeight: 400,
              fontStyle: 'italic',
              color: '#2a2d25'
            }}>
              365
            </span>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: '18px',
                fontWeight: 600,
                color: '#2a2d25',
                letterSpacing: '-0.01em',
                lineHeight: 1.2
              }}>
                Memory Bank
              </span>
            </div>
            <p style={{
              fontSize: '12px',
              color: '#6e7262',
              margin: '2px 0 0',
              fontFamily: "'Inter', sans-serif"
            }}>
              One reflection a day &bull; 365 days
            </p>
          </div>
        </div>

        {/* Status, Streaks & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Streak Flame Badge with Lucide Icon */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            borderRadius: '999px',
            background: '#fffdf8',
            border: '1px solid #d8d0bc',
            boxShadow: '0 2px 6px rgba(42, 45, 37, 0.04)'
          }}>
            <Flame size={15} color="#b8812f" />
            <span style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#b8812f',
              fontFamily: "'Inter', sans-serif"
            }}>
              {streakCount} {streakCount === 1 ? 'day' : 'days'}
            </span>
          </div>

          {/* Progress Indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 12px',
            borderRadius: '999px',
            background: '#fffdf8',
            border: '1px solid #d8d0bc',
            boxShadow: '0 2px 6px rgba(42, 45, 37, 0.04)'
          }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#6e7262', fontFamily: "'Inter', sans-serif" }}>
              Day <strong style={{ color: '#2a2d25' }}>{currentDay}</strong> / 365
            </span>
            <div style={{
              width: '40px',
              height: '5px',
              backgroundColor: '#e6dfce',
              borderRadius: '999px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${percentComplete}%`,
                height: '100%',
                backgroundColor: '#5c8a5c',
                borderRadius: '999px'
              }} />
            </div>
          </div>

          {/* Settings Trigger */}
          <button
            onClick={onOpenSettings}
            aria-label="Settings"
            title="Settings & Preferences"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: '#fffdf8',
              border: '1px solid #d8d0bc',
              color: '#6e7262',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f7f4ec'; e.currentTarget.style.color = '#2a2d25'; }}
            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#fffdf8'; e.currentTarget.style.color = '#6e7262'; }}
          >
            <Settings size={16} />
          </button>

          {/* Logout Trigger */}
          {onLogout && (
            <button
              onClick={onLogout}
              aria-label="Sign Out"
              title="Sign Out"
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: '#fffdf8',
                border: '1px solid #d8d0bc',
                color: '#6e7262',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f7f4ec'; e.currentTarget.style.color = '#c25e5e'; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#fffdf8'; e.currentTarget.style.color = '#6e7262'; }}
            >
              <LogOut size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Segmented Navigation Bar with Lucide Icons (NO EMOJIS) */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        background: '#ece6d8',
        border: '1px solid #d8d0bc',
        borderRadius: '16px',
        padding: '4px',
        gap: '4px'
      }}>
        <button
          onClick={() => setCurrentTab('today')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '9px 16px',
            borderRadius: '12px',
            border: 'none',
            fontSize: '14px',
            fontWeight: 600,
            fontFamily: "'Inter', sans-serif",
            cursor: 'pointer',
            backgroundColor: currentTab === 'today' ? '#fffdf8' : 'transparent',
            color: currentTab === 'today' ? '#2a2d25' : '#6e7262',
            boxShadow: currentTab === 'today' ? '0 2px 6px rgba(42, 45, 37, 0.08)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          <Sun size={15} color={currentTab === 'today' ? '#b8812f' : '#6e7262'} />
          <span>Today</span>
        </button>

        <button
          onClick={() => setCurrentTab('timeline')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '9px 16px',
            borderRadius: '12px',
            border: 'none',
            fontSize: '14px',
            fontWeight: 600,
            fontFamily: "'Inter', sans-serif",
            cursor: 'pointer',
            backgroundColor: currentTab === 'timeline' ? '#fffdf8' : 'transparent',
            color: currentTab === 'timeline' ? '#2a2d25' : '#6e7262',
            boxShadow: currentTab === 'timeline' ? '0 2px 6px rgba(42, 45, 37, 0.08)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          <BookOpen size={15} color={currentTab === 'timeline' ? '#5c8a5c' : '#6e7262'} />
          <span>Timeline</span>
        </button>

        <button
          onClick={() => setCurrentTab('calendar')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '9px 16px',
            borderRadius: '12px',
            border: 'none',
            fontSize: '14px',
            fontWeight: 600,
            fontFamily: "'Inter', sans-serif",
            cursor: 'pointer',
            backgroundColor: currentTab === 'calendar' ? '#fffdf8' : 'transparent',
            color: currentTab === 'calendar' ? '#2a2d25' : '#6e7262',
            boxShadow: currentTab === 'calendar' ? '0 2px 6px rgba(42, 45, 37, 0.08)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          <Calendar size={15} color={currentTab === 'calendar' ? '#6e7262' : '#6e7262'} />
          <span>365 Grid</span>
        </button>
      </nav>
    </header>
  );
}
