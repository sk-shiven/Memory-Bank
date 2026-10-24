import React, { useState } from 'react';
import { X, Bell, Clock, Shield, Sparkles, Check, Smartphone } from 'lucide-react';
import { updatePreferences } from '../api';

export default function SettingsModal({ isOpen, onClose }) {
  const [notificationTime, setNotificationTime] = useState('20:00');
  const [pushEnabled, setPushEnabled] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleRequestPush = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support push notifications.');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setPushEnabled(true);
      new Notification('365 Daily Journal', {
        body: 'Daily reminders are activated! Your question arrives at ' + notificationTime,
        icon: '/favicon.svg'
      });
    } else {
      alert('Notification permission was not granted.');
    }
  };

  const handleSave = async () => {
    try {
      await updatePreferences(notificationTime);
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 900);
    } catch (e) {
      alert('Failed to save settings: ' + e.message);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.25rem',
      zIndex: 1000
    }}>
      <div className="glass-panel" style={{
        maxWidth: '480px',
        width: '100%',
        padding: '2rem',
        position: 'relative'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-dim)',
            cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem', color: '#fff' }}>
          Preferences
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.75rem' }}>
          Configure your daily journaling habit and notification timing.
        </p>

        {/* Daily Notification Time */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.9rem',
            fontWeight: 600,
            color: '#e2e8f0',
            marginBottom: '0.5rem'
          }}>
            <Clock size={16} color="var(--accent-primary)" />
            Daily Question Delivery Time
          </label>
          <input
            type="time"
            value={notificationTime}
            onChange={(e) => setNotificationTime(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.75rem 1rem',
              color: '#fff',
              fontSize: '1rem',
              outline: 'none',
              fontFamily: 'var(--font-body)'
            }}
          />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', marginTop: '0.35rem' }}>
            We'll deliver your AI-curated prompt at this time every day.
          </span>
        </div>

        {/* Web Push Notification */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '1.15rem',
          marginBottom: '1.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>
              <Bell size={16} color={pushEnabled ? "var(--accent-emerald)" : "var(--accent-amber)"} />
              Push Notifications
            </div>
            <p style={{ fontSize: '0.775rem', color: 'var(--text-dim)', margin: '0.25rem 0 0' }}>
              Receive an alert on your device when today's prompt is ready.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRequestPush}
            className={`btn ${pushEnabled ? 'btn-secondary' : 'btn-primary'}`}
            style={{ padding: '0.5rem 0.85rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
          >
            {pushEnabled ? 'Enabled' : 'Enable'}
          </button>
        </div>

        {/* Action Button */}
        <button
          onClick={handleSave}
          className="btn btn-primary"
          style={{ width: '100%', padding: '0.85rem' }}
        >
          {saved ? <Check size={16} /> : null}
          {saved ? 'Saved!' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
}
