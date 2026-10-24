import React, { useState, useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  Send, 
  Image as ImageIcon, 
  Mic, 
  Square, 
  CheckCircle2, 
  Trash2, 
  Sparkles, 
  Play, 
  Pause,
  Edit3
} from 'lucide-react';
import { submitAnswer, uploadPhoto, uploadVoice } from '../api';

export default function DailyQuestion({ question, onAnswered, onRefreshQuestion }) {
  const [text, setText] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);

  // Audio Player state for playback
  const [isPlaying, setIsPlaying] = useState(false);
  const audioPlayerRef = useRef(null);

  const existingAnswer = question?.answer;
  const isAnswered = Boolean(existingAnswer && (existingAnswer.text || existingAnswer.photo_url || existingAnswer.audio_url));

  useEffect(() => {
    if (existingAnswer) {
      setText(existingAnswer.text || '');
      setPhotoUrl(existingAnswer.photo_url || '');
      setAudioUrl(existingAnswer.audio_url || '');
    } else {
      setText('');
      setPhotoUrl('');
      setAudioUrl('');
      setIsEditing(false);
    }
  }, [question]);

  // Audio Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        try {
          const res = await uploadVoice(audioBlob);
          setAudioUrl(res.url);
        } catch (e) {
          alert('Failed to upload audio');
        }
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordSeconds(0);
      timerIntervalRef.current = setInterval(() => {
        setRecordSeconds(prev => prev + 1);
      }, 1000);
    } catch (err) {
      alert('Microphone access denied or unavailable: ' + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerIntervalRef.current);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const res = await uploadPhoto(file);
      setPhotoUrl(res.url);
    } catch (err) {
      alert('Failed to upload photo: ' + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() && !photoUrl && !audioUrl) {
      alert('Please write a reflection, upload a photo, or record a voice note.');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitAnswer({
        question_id: question.id,
        text: text.trim(),
        photo_url: photoUrl || null,
        audio_url: audioUrl || null
      });

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      setIsEditing(false);
      if (onAnswered) onAnswered();
    } catch (err) {
      alert('Error saving reflection: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!question) {
    return (
      <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading today's question...</p>
      </div>
    );
  }

  // Already answered view (unless user clicked Edit)
  if (isAnswered && !isEditing) {
    return (
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0 1.25rem 3rem' }}>
        <div className="glass-panel" style={{
          padding: '2.25rem 2rem',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Subtle gold accent glow */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'linear-gradient(90deg, #10b981, #6366f1)'
          }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span className="pill pill-emerald">
                <CheckCircle2 size={13} />
                Day {question.day_number} Completed
              </span>
              {question.theme_tags && (
                <span className="pill pill-indigo">
                  {question.theme_tags.split(',')[0]}
                </span>
              )}
            </div>

            <button
              onClick={() => setIsEditing(true)}
              className="btn btn-secondary"
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
            >
              <Edit3 size={14} />
              Edit Memory
            </button>
          </div>

          <h2 style={{ fontSize: '1.65rem', fontWeight: 600, lineHeight: 1.35, marginBottom: '1.75rem', color: '#fff' }}>
            "{question.question_text}"
          </h2>

          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: 'var(--radius-md)',
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            {existingAnswer.text && (
              <p style={{ fontSize: '1.05rem', lineHeight: 1.6, color: '#e2e8f0', whiteSpace: 'pre-wrap', marginBottom: '1rem' }}>
                {existingAnswer.text}
              </p>
            )}

            {existingAnswer.photo_url && (
              <div style={{ marginBottom: '1rem' }}>
                <img
                  src={existingAnswer.photo_url}
                  alt="Daily Memory"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '360px',
                    borderRadius: 'var(--radius-md)',
                    objectFit: 'cover',
                    border: '1px solid var(--border-subtle)'
                  }}
                />
              </div>
            )}

            {existingAnswer.audio_url && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                background: 'rgba(99, 102, 241, 0.08)',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(99, 102, 241, 0.2)'
              }}>
                <audio
                  ref={audioPlayerRef}
                  src={existingAnswer.audio_url}
                  onEnded={() => setIsPlaying(false)}
                />
                <button
                  onClick={() => {
                    if (audioPlayerRef.current) {
                      if (isPlaying) {
                        audioPlayerRef.current.pause();
                        setIsPlaying(false);
                      } else {
                        audioPlayerRef.current.play();
                        setIsPlaying(true);
                      }
                    }
                  }}
                  className="btn btn-primary"
                  style={{ padding: '0.5rem', borderRadius: '50%' }}
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <span style={{ fontSize: '0.85rem', color: '#c7d2fe', fontWeight: 500 }}>
                  Recorded Voice Note
                </span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              Saved to your 365 timeline
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Active question composer
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0 1.25rem 3rem' }}>
      <div className="glass-panel" style={{
        padding: '2.5rem 2rem',
        position: 'relative'
      }}>
        {/* Day Pill & Theme */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
          <span className="pill pill-amber">
            <Sparkles size={13} />
            Day {question.day_number} of 365
          </span>
          {question.theme_tags && question.theme_tags.split(',').map((tag, i) => (
            <span key={i} className="pill pill-indigo">
              {tag.trim()}
            </span>
          ))}
        </div>

        {/* Question Prompt */}
        <h2 style={{
          fontSize: '1.85rem',
          fontWeight: 700,
          lineHeight: 1.3,
          marginBottom: '2rem',
          color: '#ffffff'
        }}>
          "{question.question_text}"
        </h2>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Textarea */}
          <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Reflect on today... write whatever comes to mind..."
              rows={5}
              style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '1.15rem',
                color: 'var(--text-main)',
                fontFamily: 'var(--font-body)',
                fontSize: '1rem',
                lineHeight: 1.6,
                resize: 'vertical',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-subtle)'}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              fontSize: '0.75rem',
              color: 'var(--text-dim)',
              marginTop: '0.25rem'
            }}>
              {text.length} characters
            </div>
          </div>

          {/* Media Attachments Preview */}
          {(photoUrl || audioUrl || isRecording) && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
              marginBottom: '1.5rem',
              padding: '1rem',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)'
            }}>
              {photoUrl && (
                <div style={{ position: 'relative', display: 'inline-block', maxWidth: '280px' }}>
                  <img
                    src={photoUrl}
                    alt="Uploaded Memory"
                    style={{
                      width: '100%',
                      borderRadius: 'var(--radius-sm)',
                      objectFit: 'cover'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setPhotoUrl('')}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      background: 'rgba(0,0,0,0.7)',
                      border: 'none',
                      borderRadius: '50%',
                      padding: '4px',
                      color: '#fff',
                      cursor: 'pointer'
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}

              {isRecording && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '3px', alignItems: 'center', height: '26px' }}>
                    <div className="wave-bar" style={{ animationDelay: '0.1s' }} />
                    <div className="wave-bar" style={{ animationDelay: '0.3s' }} />
                    <div className="wave-bar" style={{ animationDelay: '0.5s' }} />
                    <div className="wave-bar" style={{ animationDelay: '0.2s' }} />
                  </div>
                  <span style={{ fontSize: '0.88rem', color: 'var(--accent-rose)', fontWeight: 600 }}>
                    Recording voice note ({recordSeconds}s)...
                  </span>
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="btn btn-secondary"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                  >
                    <Square size={13} />
                    Finish
                  </button>
                </div>
              )}

              {audioUrl && !isRecording && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.85rem', color: '#c7d2fe' }}>
                    🎙️ Voice note recorded & attached
                  </span>
                  <button
                    type="button"
                    onClick={() => setAudioUrl('')}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Action Toolbar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            paddingTop: '0.5rem',
            borderTop: '1px solid var(--border-subtle)'
          }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {/* Photo Upload Input */}
              <label className="btn btn-secondary" style={{ cursor: 'pointer', fontSize: '0.85rem', padding: '0.55rem 0.95rem' }}>
                <ImageIcon size={16} />
                Photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  style={{ display: 'none' }}
                />
              </label>

              {/* Voice Record Button */}
              {!isRecording ? (
                <button
                  type="button"
                  onClick={startRecording}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.85rem', padding: '0.55rem 0.95rem' }}
                >
                  <Mic size={16} />
                  Voice Note
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="btn"
                  style={{ background: 'var(--accent-rose)', color: '#fff', fontSize: '0.85rem', padding: '0.55rem 0.95rem' }}
                >
                  <Square size={16} />
                  Stop ({recordSeconds}s)
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary"
              >
                <Send size={16} />
                {isSubmitting ? 'Saving Memory...' : 'Save Today\'s Memory'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
