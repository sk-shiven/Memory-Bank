import React, { useState, useEffect, useRef } from 'react';
import { Mic, Calendar, ShieldCheck, Lock, Mail, User, ArrowRight } from 'lucide-react';
import { loginDemoUser, loginGoogleUser, loginWithPassword, registerWithPassword } from '../api';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '243590835137-8f6jid61m0t4od43u4aer0uqlhpg9vch.apps.googleusercontent.com';

export default function AuthView({ onLoginSuccess }) {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [googleLoaded, setGoogleLoaded] = useState(false);
  const googleBtnRef = useRef(null);

  const handlePasswordAuth = async (e) => {
    e.preventDefault();
    if (!usernameOrEmail.trim() || !password) {
      setError('Please provide your username/email and password.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      let data;
      if (isRegisterMode) {
        data = await registerWithPassword(usernameOrEmail.trim(), password, name.trim() || 'Memory Explorer');
      } else {
        data = await loginWithPassword(usernameOrEmail.trim(), password);
      }

      if (onLoginSuccess) {
        onLoginSuccess(data.user);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await loginDemoUser();
      if (onLoginSuccess) {
        onLoginSuccess(data.user);
      }
    } catch (err) {
      setError(err.message || 'Failed to authenticate demo user');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredentialResponse = async (response) => {
    if (!response?.credential) {
      setError('Google Sign-In did not return an identity token.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await loginGoogleUser(response.credential);
      if (onLoginSuccess) {
        onLoginSuccess(data.user);
      }
    } catch (err) {
      setError(err.message || 'Google authentication failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let checkInterval = null;

    const setupGoogle = () => {
      if (typeof window !== 'undefined' && window.google?.accounts?.id && googleBtnRef.current) {
        try {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          googleBtnRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'rectangular',
            width: googleBtnRef.current.offsetWidth || 380,
            logo_alignment: 'left',
          });

          setGoogleLoaded(true);
          return true;
        } catch (err) {
          console.warn('Google Identity initialization notice:', err);
        }
      }
      return false;
    };

    if (!setupGoogle()) {
      checkInterval = setInterval(() => {
        if (setupGoogle()) {
          clearInterval(checkInterval);
        }
      }, 300);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, []);

  const handleGoogleClick = () => {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    } else {
      setError('Google Sign-In is unavailable or blocked by browser privacy settings. You may explore with a demo account.');
    }
  };

  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      boxSizing: 'border-box',
      backgroundColor: '#f6f4ee',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      padding: '32px 20px'
    }}>
      {/* Ambient texture: soft sage and warm ochre radial glows */}
      <div style={{
        position: 'absolute',
        top: '-180px',
        left: '-160px',
        width: '520px',
        height: '520px',
        borderRadius: '50%',
        background: 'radial-gradient(circle at 30% 30%, rgba(92,138,92,0.14), rgba(92,138,92,0) 70%)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-220px',
        right: '-140px',
        width: '600px',
        height: '600px',
        borderRadius: '50%',
        background: 'radial-gradient(circle at 60% 60%, rgba(184,129,47,0.12), rgba(184,129,47,0) 70%)',
        pointerEvents: 'none'
      }} />

      {/* Main Auth Card */}
      <div style={{
        maxWidth: '480px',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '28px',
        background: '#fffdf8',
        border: '1px solid #d8d0bc',
        borderRadius: '24px',
        padding: '48px 40px',
        boxShadow: '0 24px 60px -24px rgba(42,45,37,0.18)',
        position: 'relative',
        zIndex: 2
      }}>

        {/* Brand Badge & Calligraphic Header */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '14px',
          textAlign: 'center'
        }}>
          {/* Badge pill */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px 18px',
            border: '1px solid #d8d0bc',
            borderRadius: '999px',
            backgroundColor: '#D9D3C5',
            color: '#6e7262',
            boxShadow: '0 2px 6px rgba(42,45,37,0.04)'
          }}>
            <span style={{
              fontSize: '12px',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              fontFamily: "'Playfair Display', serif"
            }}>
              Memory Bank
            </span>
          </div>

          {/* Heading in Calligraphic Instrument Serif italic */}
          <h1 style={{
            margin: 0,
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontWeight: 400,
            fontStyle: 'italic',
            fontSize: '40px',
            lineHeight: 1.18,
            color: '#6e7262'
          }}>
            One question a day.<br />365 days.
          </h1>

          {/* Subtitle in Vintage Lora */}
          <p style={{
            margin: 0,
            fontSize: '15px',
            lineHeight: 1.6,
            color: '#2a2d25',
            maxWidth: '380px',
            fontFamily: "'Lora', Georgia, serif"
          }}>
            An AI-curated bank of who you were — in text, voice, or a photo, whenever you have a moment.
          </p>
        </div>

        {error && (
          <div style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: '10px',
            background: 'rgba(194, 94, 94, 0.1)',
            border: '1px solid rgba(194, 94, 94, 0.3)',
            color: '#c25e5e',
            fontSize: '0.85rem',
            textAlign: 'center',
            fontFamily: "'Inter', sans-serif"
          }}>
            {error}
          </div>
        )}

        {/* Manual Username / Password Form (Outputs JWT) */}
        <form onSubmit={handlePasswordAuth} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {isRegisterMode && (
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#6e7262', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: "'Inter', sans-serif" }}>
                <User size={13} color="#6e7262" />
                Your Name
              </label>
              <input
                type="text"
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '12px',
                  border: '1px solid #d8d0bc',
                  background: '#fcfaf5',
                  color: '#2a2d25',
                  fontSize: '14px',
                  fontFamily: "'Inter', sans-serif",
                  outline: 'none'
                }}
              />
            </div>
          )}

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#6e7262', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: "'Inter', sans-serif" }}>
              <Mail size={13} color="#6e7262" />
              Email or Username
            </label>
            <input
              type="text"
              required
              placeholder="you@example.com"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '11px 14px',
                borderRadius: '12px',
                border: '1px solid #d8d0bc',
                background: '#fcfaf5',
                color: '#2a2d25',
                fontSize: '14px',
                fontFamily: "'Inter', sans-serif",
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#6e7262', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: "'Inter', sans-serif" }}>
              <Lock size={13} color="#6e7262" />
              Password
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '11px 14px',
                borderRadius: '12px',
                border: '1px solid #d8d0bc',
                background: '#fcfaf5',
                color: '#2a2d25',
                fontSize: '14px',
                fontFamily: "'Inter', sans-serif",
                outline: 'none'
              }}
            />
          </div>

          {/* Manual Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="btn-vintage btn-vintage-primary"
            style={{ width: '100%', marginTop: '6px', padding: '12px 20px', borderRadius: '12px' }}
          >
            <span>{loading ? 'Authenticating...' : isRegisterMode ? 'Create Account & Sign In' : 'Sign In with Password'}</span>
            <ArrowRight size={15} />
          </button>

          {/* Toggle between Login and Register */}
          <div style={{ textAlign: 'center', marginTop: '4px' }}>
            <button
              type="button"
              onClick={() => { setIsRegisterMode(!isRegisterMode); setError(null); }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#6e7262',
                fontSize: '12px',
                fontFamily: "'Inter', sans-serif",
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              {isRegisterMode ? 'Already have an account? Sign in' : "Don't have an account? Sign up with email"}
            </button>
          </div>
        </form>

        {/* Divider */}
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ flex: 1, height: '1px', background: '#d8d0bc' }} />
          <span style={{ fontSize: '11px', color: '#b8b09a', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'Inter', sans-serif" }}>
            or continue with
          </span>
          <div style={{ flex: 1, height: '1px', background: '#d8d0bc' }} />
        </div>

        {/* Google & Demo Auth Actions */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Google Sign-In Container for GSI Rendered Button */}
          <div
            id="googleSignInBtnContainer"
            ref={googleBtnRef}
            style={{
              width: '100%',
              minHeight: '44px',
              display: googleLoaded ? 'flex' : 'none',
              justifyContent: 'center',
              overflow: 'hidden',
              borderRadius: '12px'
            }}
          />

          {/* Fallback button if Google script is still initializing or blocked */}
          {!googleLoaded && (
            <button
              type="button"
              onClick={handleGoogleClick}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                width: '100%',
                boxSizing: 'border-box',
                padding: '12px 20px',
                borderRadius: '12px',
                border: '1px solid #d8d0bc',
                background: '#ffffff',
                color: '#2a2d25',
                fontSize: '14px',
                fontWeight: 600,
                fontFamily: "'Inter', sans-serif",
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.1-.4-4.6H24v9h11.8c-.5 2.7-2 5-4.3 6.6v5.5h7C42.5 37 45.1 31.3 45.1 24.5z" />
                <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-7-5.5c-2 1.3-4.5 2.1-7.5 2.1-5.8 0-10.7-3.9-12.4-9.1h-7.2v5.7C7.9 40.9 15.3 46 24 46z" />
                <path fill="#FBBC05" d="M11.6 28.2c-.4-1.3-.7-2.7-.7-4.2s.3-2.9.7-4.2v-5.7H4.4C3 16.8 2.3 20.3 2.3 24s.7 7.2 2.1 10l7.2-5.8z" />
                <path fill="#EA4335" d="M24 10.7c3.2 0 6.1 1.1 8.4 3.3l6.2-6.2C34.9 4.3 29.9 2 24 2 15.3 2 7.9 7.1 4.4 14.1l7.2 5.7c1.7-5.2 6.6-9.1 12.4-9.1z" />
              </svg>
              Continue with Google
            </button>
          )}

          {/* Demo Sandbox Button */}
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={loading}
            className="btn-vintage btn-vintage-secondary"
            style={{ width: '100%', padding: '12px 20px', borderRadius: '12px', fontSize: '14px' }}
          >
            Explore with demo account
          </button>
        </div>

        {/* Feature showcase pills with Lucide icons (NO EMOJIS) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          paddingTop: '12px',
          borderTop: '1px solid #ede8db',
          width: '100%'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: '#6e7262',
            padding: '4px 10px',
            borderRadius: '999px',
            background: '#f9f7f0',
            border: '1px solid #e2dac9'
          }}>
            <Mic size={13} color="#5c8a5c" />
            <span>Voice &amp; Photos</span>
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: '#6e7262',
            padding: '4px 10px',
            borderRadius: '999px',
            background: '#f9f7f0',
            border: '1px solid #e2dac9'
          }}>
            <Calendar size={13} color="#b8812f" />
            <span>365 Day Grid</span>
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: '#6e7262',
            padding: '4px 10px',
            borderRadius: '999px',
            background: '#f9f7f0',
            border: '1px solid #e2dac9'
          }}>
            <ShieldCheck size={13} color="#6e7262" />
            <span>Private &amp; Exportable</span>
          </div>
        </div>

      </div>
    </div>
  );
}
