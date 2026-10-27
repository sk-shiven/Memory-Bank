import React, { useState, useEffect } from 'react';
import { 
  X, 
  Clock, 
  Globe, 
  Bell, 
  Download, 
  Check, 
  ShieldCheck, 
  Flame, 
  LogOut,
  RotateCcw
} from 'lucide-react';
import { updatePreferences, exportUserData, registerPushToken, fetchCurrentUser } from '../api';

const CURATED_INTERESTS = [
  { id: 'philosophy', label: 'Philosophy & Meaning' },
  { id: 'mindfulness', label: 'Mindfulness & Peace' },
  { id: 'growth', label: 'Personal Growth' },
  { id: 'relationships', label: 'Relationships & Love' },
  { id: 'gratitude', label: 'Gratitude & Joy' },
  { id: 'career', label: 'Career & Ambition' },
  { id: 'creativity', label: 'Creativity & Art' },
  { id: 'childhood', label: 'Childhood & Roots' },
  { id: 'daily_life', label: 'Daily Life & Observance' },
  { id: 'future', label: 'Future & Dreams' }
];

const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Amsterdam',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Pacific/Auckland'
];

export default function SettingsModal({ isOpen, onClose, onLogout }) {
  const [user, setUser] = useState(null);
  const [notificationTime, setNotificationTime] = useState('20:00');
  const [timezone, setTimezone] = useState('UTC');
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [exporting, setExporting] = useState(false);

  const loadProfile = async () => {
    try {
      const u = await fetchCurrentUser();
      setUser(u);
      if (u.notification_time_preference) {
        setNotificationTime(u.notification_time_preference);
      }
      if (u.timezone) {
        setTimezone(u.timezone);
      } else {
        try {
          setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
        } catch {}
      }
      if (u.interests && u.interests.length > 0) {
        setSelectedInterests(u.interests);
      } else {
        setSelectedInterests(['philosophy', 'growth', 'mindfulness']);
      }
      if (u.push_token) {
        setPushEnabled(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadProfile();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleInterest = (id) => {
    if (selectedInterests.includes(id)) {
      if (selectedInterests.length > 1) {
        setSelectedInterests(selectedInterests.filter(i => i !== id));
      }
    } else {
      if (selectedInterests.length < 5) {
        setSelectedInterests([...selectedInterests, id]);
      }
    }
  };

  const handleRequestPush = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support push notifications.');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setPushEnabled(true);
      await registerPushToken('web_push_simulated_token_' + Date.now()).catch(() => {});
    }
  };

  const handleSavePreferences = async () => {
    try {
      setSaving(true);
      await updatePreferences({
        notification_time_preference: notificationTime,
        preferred_journaling_time: notificationTime,
        timezone,
        interests: selectedInterests
      });
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 800);
    } catch (e) {
      alert('Failed to save preferences: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleExportArchive = async () => {
    try {
      setExporting(true);
      const data = await exportUserData();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `memory_bank_archive_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Failed to export data: ' + e.message);
    } finally {
      setExporting(false);
    }
  };

  const handleClearDrafts = () => {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('draft_')) {
        localStorage.removeItem(key);
      }
    });
    alert('Local reflection drafts cleared.');
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(42, 45, 37, 0.55)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      zIndex: 2000
    }}>
      <div className="vintage-card" style={{
        maxWidth: '540px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '36px 32px',
        position: 'relative'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'transparent',
            border: 'none',
            color: '#8a877c',
            cursor: 'pointer',
            padding: '4px'
          }}
          aria-label="Close"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <span className="vintage-badge" style={{ marginBottom: '8px' }}>
            Preferences &amp; Sovereignty
          </span>
          <h2 style={{
            margin: '8px 0 4px',
            fontFamily: 'var(--font-serif-display)',
            fontSize: '28px',
            color: '#2a2d25'
          }}>
            Settings
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#6e7262' }}>
            Manage your daily reflection delivery, interest themes, and data archive.
          </p>
        </div>

        {/* User Card */}
        {user && (
          <div style={{
            background: '#f9f7f0',
            border: '1px solid #e2dac9',
            borderRadius: '16px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '22px'
          }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#2a2d25' }}>
                {user.name || 'Memory Bank Explorer'}
              </div>
              <div style={{ fontSize: '12px', color: '#8a877c' }}>
                {user.email}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                borderRadius: '999px',
                background: '#ffffff',
                border: '1px solid #d8d0bc',
                fontSize: '12px',
                fontWeight: 600,
                color: '#b8812f'
              }}>
                <Flame size={13} color="#b8812f" />
                <span>{user.streak_count || 0}d streak</span>
              </div>
            </div>
          </div>
        )}

        {/* Section 1: Schedule & Timezone */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#6e7262' }}>
            Daily Schedule
          </span>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#2a2d25', marginBottom: '6px' }}>
              <Clock size={15} color="#b8812f" />
              Daily Prompt Time
            </label>
            <input
              type="time"
              value={notificationTime}
              onChange={(e) => setNotificationTime(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '12px',
                border: '1px solid #d8d0bc',
                background: '#ffffff',
                color: '#2a2d25',
                fontSize: '14px',
                fontFamily: "'Inter', sans-serif"
              }}
            />
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#2a2d25', marginBottom: '6px' }}>
              <Globe size={15} color="#6e7262" />
              Timezone
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '12px',
                border: '1px solid #d8d0bc',
                background: '#ffffff',
                color: '#2a2d25',
                fontSize: '14px',
                fontFamily: "'Inter', sans-serif"
              }}
            >
              {!COMMON_TIMEZONES.includes(timezone) && (
                <option value={timezone}>{timezone} (Current)</option>
              )}
              {COMMON_TIMEZONES.map(tz => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Section 2: Interest Themes (1-5) */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#6e7262' }}>
              Curated Themes
            </span>
            <span style={{ fontSize: '11px', color: '#8a877c' }}>
              {selectedInterests.length} of 5 selected
            </span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
            {CURATED_INTERESTS.map(item => {
              const isSelected = selectedInterests.includes(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => toggleInterest(item.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '999px',
                    border: '1px solid',
                    borderColor: isSelected ? '#757267' : '#d8d0bc',
                    backgroundColor: isSelected ? '#757267' : '#f9f7f0',
                    color: isSelected ? '#fff3d5' : '#2a2d25',
                    fontSize: '12px',
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {isSelected && <Check size={12} color="#fff3d5" />}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 3: Web Push Notifications */}
        <div style={{
          background: '#f9f7f0',
          border: '1px solid #e2dac9',
          borderRadius: '16px',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Bell size={18} color="#5c8a5c" />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#2a2d25' }}>
                  Browser Notifications
                </div>
                <div style={{ fontSize: '11px', color: '#8a877c' }}>
                  Daily prompt reminder alert
                </div>
              </div>
            </div>

            <button
              onClick={handleRequestPush}
              className="btn-vintage btn-vintage-secondary"
              style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '999px' }}
            >
              {pushEnabled ? 'Enabled' : 'Enable'}
            </button>
          </div>
        </div>

        {/* Section 4: Data Sovereignty */}
        <div style={{
          background: '#f9f7f0',
          border: '1px solid #e2dac9',
          borderRadius: '16px',
          padding: '16px',
          marginBottom: '26px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={18} color="#6e7262" />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#2a2d25' }}>
                  Data Sovereignty
                </div>
                <div style={{ fontSize: '11px', color: '#8a877c' }}>
                  Export all 365 reflections as structured JSON
                </div>
              </div>
            </div>

            <button
              onClick={handleExportArchive}
              disabled={exporting}
              className="btn-vintage btn-vintage-secondary"
              style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '999px' }}
            >
              <Download size={13} />
              <span>{exporting ? 'Exporting...' : 'Export JSON'}</span>
            </button>
          </div>
        </div>

        {/* Bottom Actions */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid #ede8db',
          paddingTop: '18px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleClearDrafts}
              title="Clear cached reflection drafts"
              className="btn-vintage btn-vintage-ghost"
              style={{ padding: '6px 10px', fontSize: '12px', color: '#8a877c' }}
            >
              <RotateCcw size={13} />
              <span>Clear Drafts</span>
            </button>

            {onLogout && (
              <button
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="btn-vintage btn-vintage-ghost"
                style={{ padding: '6px 10px', fontSize: '12px', color: '#c25e5e' }}
              >
                <LogOut size={13} />
                <span>Sign Out</span>
              </button>
            )}
          </div>

          <button
            onClick={handleSavePreferences}
            disabled={saving}
            className="btn-vintage btn-vintage-primary"
            style={{ padding: '10px 22px' }}
          >
            {savedSuccess ? (
              <>
                <Check size={15} />
                <span>Saved</span>
              </>
            ) : (
              <span>{saving ? 'Saving...' : 'Save Preferences'}</span>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
