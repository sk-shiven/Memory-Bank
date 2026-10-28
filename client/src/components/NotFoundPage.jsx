import React from 'react';
import { Compass, Sun, BookOpen, ArrowLeft } from 'lucide-react';

export default function NotFoundPage({ onNavigate, isAuthenticated = false, errorDetail = null }) {
  const handleGoToday = () => {
    if (onNavigate) {
      onNavigate('today');
    } else {
      window.history.pushState(null, '', '/today');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const handleGoTimeline = () => {
    if (onNavigate) {
      onNavigate('timeline');
    } else {
      window.history.pushState(null, '', '/timeline');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      handleGoToday();
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 20px 48px',
      backgroundColor: 'var(--bg-canvas)'
    }}>
      {/* Brand Badge */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '28px'
      }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '11px',
          backgroundColor: '#D9D3C5',
          border: '1px solid #d8d0bc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(42, 45, 37, 0.08)'
        }}>
          <span style={{
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontSize: '22px',
            fontStyle: 'italic',
            color: '#2a2d25'
          }}>
            365
          </span>
        </div>
        <span style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: '18px',
          fontWeight: 600,
          color: '#2a2d25',
          letterSpacing: '-0.01em'
        }}>
          Memory Bank
        </span>
      </div>

      {/* Main 404 Card */}
      <div className="vintage-card" style={{
        maxWidth: '560px',
        width: '100%',
        padding: '48px 36px 40px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Subtle decorative background watermarks */}
        <div style={{
          position: 'absolute',
          top: '-20px',
          right: '-20px',
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(184, 129, 47, 0.08) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        {/* Vintage Pill Badge */}
        <div style={{ marginBottom: '16px' }}>
          <span className="vintage-badge" style={{
            padding: '5px 14px',
            letterSpacing: '0.06em',
            gap: '6px'
          }}>
            <Compass size={13} color="#6e7262" />
            Page Not Found &bull; 404
          </span>
        </div>

        {/* Grand 404 Serif Callout */}
        <div style={{
          fontFamily: "'Instrument Serif', Georgia, serif",
          fontSize: 'clamp(84px, 15vw, 128px)',
          lineHeight: 0.9,
          fontStyle: 'italic',
          color: '#757267',
          margin: '12px 0 16px',
          letterSpacing: '-0.04em',
          userSelect: 'none',
          textShadow: '0 2px 10px rgba(117, 114, 103, 0.15)'
        }}>
          404
        </div>

        {/* Title */}
        <h1 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: '26px',
          fontWeight: 600,
          color: '#2a2d25',
          margin: '0 0 12px',
          letterSpacing: '-0.01em'
        }}>
          A Moment Lost to Time
        </h1>

        {/* Description */}
        <p style={{
          fontSize: '15px',
          color: '#6e7262',
          lineHeight: 1.6,
          maxWidth: '440px',
          margin: '0 auto 20px',
          fontFamily: "var(--font-serif-body)"
        }}>
          The reflection, archive, or page you are seeking cannot be located in this bank. It may have evaporated into the ether, or belongs to another chapter altogether.
        </p>

        {/* Contextual error note (if triggered from API) */}
        {errorDetail && (
          <div style={{
            margin: '0 auto 24px',
            padding: '10px 14px',
            borderRadius: '12px',
            backgroundColor: '#f9f6ed',
            border: '1px dashed #d8d0bc',
            fontSize: '12px',
            color: '#8a877c',
            maxWidth: '440px',
            wordBreak: 'break-word',
            fontFamily: "'Inter', sans-serif"
          }}>
            <strong>Diagnostic:</strong> {errorDetail}
          </div>
        )}

        {/* Vintage quote divider */}
        <div style={{
          borderTop: '1px solid #e8e2d4',
          margin: '24px 0 28px',
          position: 'relative'
        }}>
          <span style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'var(--bg-card)',
            padding: '0 14px',
            color: '#b8b09a',
            fontSize: '12px',
            fontFamily: "'Alex Brush', cursive",
            fontStyle: 'italic'
          }}>
            where have the days gone?
          </span>
        </div>

        {/* Navigation Action Buttons */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px'
        }}>
          <button
            onClick={handleGoToday}
            className="btn-vintage btn-vintage-primary"
            style={{
              padding: '11px 22px',
              borderRadius: '14px',
              fontSize: '14px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer'
            }}
          >
            <Sun size={16} />
            <span>Return to Today</span>
          </button>

          {isAuthenticated ? (
            <button
              onClick={handleGoTimeline}
              className="btn-vintage btn-vintage-secondary"
              style={{
                padding: '11px 20px',
                borderRadius: '14px',
                fontSize: '14px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
            >
              <BookOpen size={16} />
              <span>Browse Timeline</span>
            </button>
          ) : (
            <button
              onClick={handleGoBack}
              className="btn-vintage btn-vintage-secondary"
              style={{
                padding: '11px 20px',
                borderRadius: '14px',
                fontSize: '14px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
            >
              <ArrowLeft size={16} />
              <span>Go Back</span>
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer style={{
        marginTop: '32px',
        textAlign: 'center',
        fontSize: '12px',
        color: '#8a877c',
        fontFamily: 'var(--font-serif-vintage)',
        letterSpacing: '0.03em'
      }}>
        Memory Bank &bull; 365 Days of Reflections &bull; Private &amp; Self-Hosted
      </footer>
    </div>
  );
}
