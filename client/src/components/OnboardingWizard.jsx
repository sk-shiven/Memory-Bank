import React, { useState } from 'react';
import { Clock, Globe, Bell, ArrowRight, ArrowLeft, Check, CheckCircle2, Sparkles } from 'lucide-react';
import { updatePreferences, registerPushToken } from '../api';

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

export default function OnboardingWizard({ onComplete }) {
  const [step, setStep] = useState(1);
  const [timezone, setTimezone] = useState(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  });
  const [journalingTime, setJournalingTime] = useState('20:00');
  const [selectedInterests, setSelectedInterests] = useState(['philosophy', 'growth', 'mindfulness']);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const handleFinish = async () => {
    try {
      setSaving(true);
      await updatePreferences({
        timezone,
        preferred_journaling_time: journalingTime,
        notification_time_preference: journalingTime,
        interests: selectedInterests
      });
      if (onComplete) {
        onComplete();
      }
    } catch (err) {
      alert('Failed to save onboarding setup: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(42, 45, 37, 0.45)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      zIndex: 2000
    }}>
      <div style={{
        maxWidth: '520px',
        width: '100%',
        background: '#fffdf8',
        border: '1px solid #d8d0bc',
        borderRadius: '24px',
        padding: '36px 32px',
        boxShadow: '0 24px 60px -24px rgba(42,45,37,0.22)',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>

        {/* Step Indicator Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #ede8db', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '11px',
              fontFamily: "'Playfair Display', serif",
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontWeight: 600,
              color: '#6e7262',
              background: '#d9d3c5',
              padding: '3px 10px',
              borderRadius: '999px'
            }}>
              Step {step} of 3
            </span>
            <span style={{ fontSize: '13px', color: '#8a877c' }}>
              {step === 1 ? 'Daily Rhythm' : step === 2 ? 'Themes' : 'Reminders'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '4px' }}>
            {[1, 2, 3].map(s => (
              <div
                key={s}
                style={{
                  width: '24px',
                  height: '4px',
                  borderRadius: '2px',
                  background: s <= step ? '#757267' : '#e4ded0',
                  transition: 'background-color 0.2s ease'
                }}
              />
            ))}
          </div>
        </div>

        {/* Step 1: Timezone & Daily Schedule */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h2 style={{
                margin: '0 0 6px',
                fontFamily: "'Instrument Serif', Georgia, serif",
                fontSize: '28px',
                color: '#2a2d25'
              }}>
                Set your daily rhythm
              </h2>
              <p style={{ margin: 0, fontSize: '14px', color: '#6e7262', lineHeight: 1.5 }}>
                Your reflection prompt is delivered at your ideal quiet hour in your local timezone.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#2a2d25', marginBottom: '6px' }}>
                  <Globe size={15} color="#6e7262" />
                  Your Timezone
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
                    <option value={timezone}>{timezone} (Detected)</option>
                  )}
                  {COMMON_TIMEZONES.map(tz => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#2a2d25', marginBottom: '6px' }}>
                  <Clock size={15} color="#b8812f" />
                  Preferred Daily Prompt Time
                </label>
                <input
                  type="time"
                  value={journalingTime}
                  onChange={(e) => setJournalingTime(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: '1px solid #d8d0bc',
                    background: '#ffffff',
                    color: '#2a2d25',
                    fontSize: '15px',
                    fontFamily: "'Inter', sans-serif"
                  }}
                />
                <span style={{ display: 'block', marginTop: '6px', fontSize: '12px', color: '#8a877c' }}>
                  Arrives at {journalingTime} every evening.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Core Interests */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <h2 style={{
                margin: '0 0 6px',
                fontFamily: "'Instrument Serif', Georgia, serif",
                fontSize: '28px',
                color: '#2a2d25'
              }}>
                Choose your reflective themes
              </h2>
              <p style={{ margin: 0, fontSize: '14px', color: '#6e7262', lineHeight: 1.5 }}>
                Pick 1 to 5 themes that resonate with you to guide your daily AI question curation.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#8a877c' }}>
                Selected: {selectedInterests.length} of 5 (min 1, max 5)
              </span>
            </div>

            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              maxHeight: '230px',
              overflowY: 'auto',
              paddingRight: '4px'
            }}>
              {CURATED_INTERESTS.map(item => {
                const isSelected = selectedInterests.includes(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleInterest(item.id)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '999px',
                      border: '1px solid',
                      borderColor: isSelected ? '#757267' : '#d8d0bc',
                      backgroundColor: isSelected ? '#757267' : '#f9f7f0',
                      color: isSelected ? '#fff3d5' : '#2a2d25',
                      fontSize: '13px',
                      fontFamily: "'Inter', sans-serif",
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {isSelected && <Check size={13} color="#fff3d5" />}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Notification Setup */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'center', alignItems: 'center' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#f1ede2',
              border: '1px solid #d8d0bc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: '8px'
            }}>
              <Bell size={26} color="#5c8a5c" />
            </div>

            <div>
              <h2 style={{
                margin: '0 0 6px',
                fontFamily: "'Instrument Serif', Georgia, serif",
                fontSize: '28px',
                color: '#2a2d25'
              }}>
                A gentle daily tap
              </h2>
              <p style={{ margin: 0, fontSize: '14px', color: '#6e7262', lineHeight: 1.5, maxWidth: '400px' }}>
                Enable notifications so your question reaches you precisely when your mind is ready to reflect.
              </p>
            </div>

            <div style={{ width: '100%' }}>
              <button
                onClick={handleRequestPush}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  borderRadius: '14px',
                  border: '1px solid #d8d0bc',
                  background: pushEnabled ? '#eef6ee' : '#ffffff',
                  color: pushEnabled ? '#2d5e2d' : '#2a2d25',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {pushEnabled ? (
                  <>
                    <CheckCircle2 size={16} color="#2d5e2d" />
                    <span>Notifications Enabled</span>
                  </>
                ) : (
                  <>
                    <Bell size={16} color="#5c8a5c" />
                    <span>Enable Browser Notifications</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Navigation Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #ede8db', paddingTop: '16px' }}>
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'transparent',
                border: 'none',
                color: '#6e7262',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 20px',
                borderRadius: '12px',
                background: '#757267',
                border: 'none',
                color: '#fff3d5',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <span>Continue</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={saving}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 22px',
                borderRadius: '12px',
                background: '#757267',
                border: 'none',
                color: '#fff3d5',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <span>{saving ? 'Saving...' : 'Enter Memory Bank'}</span>
              <Sparkles size={16} />
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
