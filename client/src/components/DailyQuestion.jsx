import React, { useState, useRef, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { 
  Send, 
  Camera, 
  Mic, 
  Square, 
  CheckCircle2, 
  Trash2, 
  Sparkles, 
  Play, 
  Pause,
  Edit3,
  Clock
} from 'lucide-react';
import { submitAnswer, uploadPhoto, uploadVoice, isDemoUser } from '../api';

export default function DailyQuestion({ question, onAnswered }) {
  const existingAnswer = question?.answer;
  const isAnswered = Boolean(
    existingAnswer && (existingAnswer.text || existingAnswer.photo_url || existingAnswer.audio_url)
  );

  const [text, setText] = useState(() => existingAnswer?.text || '');
  const [photoUrl, setPhotoUrl] = useState(() => existingAnswer?.photo_url || '');
  const [audioUrl, setAudioUrl] = useState(() => existingAnswer?.audio_url || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draftSavedTime, setDraftSavedTime] = useState(null);
  const [showCelebration, setShowCelebration] = useState(false);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);

  // Audio Waveform Canvas
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);

  // Audio Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const audioPlayerRef = useRef(null);

  // Countdown to tomorrow
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });

  // Load question and saved drafts
  useEffect(() => {
    if (existingAnswer) {
      setText(existingAnswer.text || '');
      setPhotoUrl(existingAnswer.photo_url || '');
      setAudioUrl(existingAnswer.audio_url || '');
    } else if (question?.id) {
      const draft = isDemoUser() ? null : localStorage.getItem(`draft_${question.id}`);
      if (draft) {
        setText(draft);
        setDraftSavedTime('Restored from draft');
      } else {
        setText('');
      }
      setPhotoUrl('');
      setAudioUrl('');
      setIsEditing(false);
    }
  }, [question, existingAnswer]);

  // Draft autosave debounce
  useEffect(() => {
    if (!isAnswered && !existingAnswer && question?.id && text && !isDemoUser()) {
      const timer = setTimeout(() => {
        localStorage.setItem(`draft_${question.id}`, text);
        const now = new Date();
        setDraftSavedTime(`Draft saved at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [text, isAnswered, existingAnswer, question?.id]);

  // Countdown timer calculation to midnight
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const diff = Math.max(0, tomorrow.getTime() - now.getTime());
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setCountdown({ hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = useCallback(async (e) => {
    if (e) e.preventDefault();
    if (!text.trim() && !photoUrl && !audioUrl) {
      alert('Please compose your reflection in text, voice, or a photo.');
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

      // Clear draft
      localStorage.removeItem(`draft_${question.id}`);

      // Fire confetti burst
      confetti({
        particleCount: 85,
        spread: 65,
        origin: { y: 0.6 },
        colors: ['#5c8a5c', '#b8812f', '#757267', '#d9d3c5']
      });

      setShowCelebration(true);
      setIsEditing(false);

      if (onAnswered) {
        await onAnswered();
      }
    } catch (err) {
      alert('Failed to save memory: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  }, [text, photoUrl, audioUrl, question?.id, onAnswered]);

  // Keyboard shortcut: Cmd+Enter or Ctrl+Enter to submit
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        if (!isAnswered || isEditing) {
          handleSubmit(e);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSubmit, isAnswered, isEditing]);

  const drawWaveform = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      analyserRef.current.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        ctx.fillStyle = '#5c8a5c'; // Botanical sage color
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
        x += barWidth;
      }
    };
    render();
  };

  // Audio Recording with Canvas Visualizer
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      // Audio context for waveform visualization
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 64;
      source.connect(analyserRef.current);

      drawWaveform();

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if (audioContextRef.current) audioContextRef.current.close().catch(() => {});

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        try {
          const res = await uploadVoice(audioBlob);
          setAudioUrl(res.url);
        } catch (e) {
          alert('Failed to upload audio: ' + e.message);
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

  const formatSeconds = (sec) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const wordsCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charsCount = text.length;

  if (!question) {
    return (
      <div style={{ maxWidth: '820px', margin: '3rem auto', padding: '0 20px', textAlign: 'center' }}>
        <div className="vintage-card" style={{ padding: '48px 32px' }}>
          <h2 style={{ fontFamily: 'var(--font-serif-display)', fontStyle: 'italic', fontSize: '32px', color: '#6e7262' }}>
            Preparing your reflection...
          </h2>
          <p style={{ color: '#8a877c', marginTop: '12px' }}>
            Curating your personal daily question.
          </p>
        </div>
      </div>
    );
  }

  const tags = (question.theme_tags || '').split(',').map(t => t.trim()).filter(Boolean);

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto', padding: '0 20px 4rem', width: '100%' }}>

      {/* Celebration Modal Overlay */}
      {showCelebration && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(42, 45, 37, 0.45)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 3000
        }}>
          <div className="vintage-card" style={{
            maxWidth: '440px',
            width: '100%',
            padding: '40px 32px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '18px'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: '#eef6ee',
              border: '1px solid #d8d0bc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Sparkles size={28} color="#5c8a5c" />
            </div>

            <div>
              <span className="vintage-badge" style={{ marginBottom: '8px' }}>
                Day {question.day_number} Sealed
              </span>
              <h2 style={{
                margin: '8px 0',
                fontFamily: 'var(--font-serif-display)',
                fontStyle: 'italic',
                fontSize: '32px',
                color: '#2a2d25'
              }}>
                Memory Saved
              </h2>
              <p style={{ margin: 0, fontSize: '14px', color: '#6e7262', lineHeight: 1.6 }}>
                Your reflection has been woven into your 365 archive. Take a breath and carry this insight into your day.
              </p>
            </div>

            <button
              onClick={() => setShowCelebration(false)}
              className="btn-vintage btn-vintage-primary"
              style={{ width: '100%', marginTop: '6px' }}
            >
              <span>View Your Reflection</span>
            </button>
          </div>
        </div>
      )}

      {/* Prompt Hero Card */}
      <div className="vintage-card" style={{ padding: '40px 36px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="vintage-badge">
              Day {question.day_number}
            </span>
            {tags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  color: '#6e7262',
                  background: '#f7f4ed',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  border: '1px solid #e5ded0'
                }}
              >
                #{tag}
              </span>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#8a877c' }}>
            <Clock size={13} />
            <span>Daily Prompt</span>
          </div>
        </div>

        {/* The Question in calligraphic serif */}
        <h1 style={{
          fontFamily: 'var(--font-serif-display)',
          fontStyle: 'italic',
          fontWeight: 400,
          fontSize: '34px',
          lineHeight: 1.25,
          color: '#2a2d25',
          margin: '0 0 16px'
        }}>
          "{question.question_text}"
        </h1>

        <div style={{ fontSize: '13px', color: '#8a877c' }}>
          Reflect in your own words, speak your thoughts, or capture a photo of this moment.
        </div>
      </div>

      {/* State A: Prompt Unanswered OR Currently in Edit Mode */}
      {(!isAnswered || isEditing) ? (
        <form onSubmit={handleSubmit} className="vintage-card" style={{ padding: '32px 32px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#6e7262', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Your Reflection
            </span>
            {draftSavedTime && (
              <span style={{ fontSize: '11px', color: '#8a877c', fontStyle: 'italic' }}>
                {draftSavedTime}
              </span>
            )}
          </div>

          {/* Text Reflection Area */}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write freely... What is moving through you today?"
            rows={6}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '16px',
              border: '1px solid var(--border-card)',
              background: '#fcfaf5',
              color: '#2a2d25',
              fontSize: '16px',
              lineHeight: 1.65,
              fontFamily: 'var(--font-serif-body)',
              resize: 'vertical',
              outline: 'none',
              boxShadow: 'inset 0 2px 6px rgba(42, 45, 37, 0.03)'
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#6e7262'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#d8d0bc'; }}
          />

          {/* Text Stats */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', marginBottom: '20px' }}>
            <span style={{ fontSize: '12px', color: '#8a877c' }}>
              {wordsCount} words &bull; {charsCount} characters
            </span>
            <span style={{ fontSize: '11px', color: '#b8b09a' }}>
              Cmd + Enter to save
            </span>
          </div>

          {/* Multi-modal Attachment Hub */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
            
            {/* Voice Studio */}
            <div style={{
              background: '#f9f7f0',
              border: '1px solid #e2dac9',
              borderRadius: '16px',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {!isRecording ? (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="btn-vintage btn-vintage-secondary"
                    style={{ padding: '8px 14px', borderRadius: '999px', fontSize: '13px' }}
                  >
                    <Mic size={14} color="#5c8a5c" />
                    <span>{audioUrl ? 'Re-record Voice Note' : 'Record Voice Note'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopRecording}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      borderRadius: '999px',
                      border: 'none',
                      background: '#c25e5e',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <Square size={13} fill="#ffffff" />
                    <span>Stop ({formatSeconds(recordSeconds)})</span>
                  </button>
                )}

                {isRecording && (
                  <canvas
                    ref={canvasRef}
                    width={120}
                    height={26}
                    style={{ borderRadius: '4px', verticalAlign: 'middle' }}
                  />
                )}
              </div>

              {audioUrl && !isRecording && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <audio
                    ref={audioPlayerRef}
                    src={audioUrl}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => setIsPlaying(false)}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (isPlaying) {
                        audioPlayerRef.current?.pause();
                      } else {
                        audioPlayerRef.current?.play();
                      }
                    }}
                    className="btn-vintage btn-vintage-secondary"
                    style={{ padding: '6px 12px', borderRadius: '999px', fontSize: '12px' }}
                  >
                    {isPlaying ? <Pause size={13} /> : <Play size={13} />}
                    <span>{isPlaying ? 'Pause' : 'Play Voice'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAudioUrl('')}
                    title="Remove audio"
                    style={{ background: 'transparent', border: 'none', color: '#8a877c', cursor: 'pointer', padding: '4px' }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>

            {/* Photo Attachment */}
            <div style={{
              background: '#f9f7f0',
              border: '1px solid #e2dac9',
              borderRadius: '16px',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '999px',
                  background: '#ffffff',
                  border: '1px solid #d8d0bc',
                  color: '#2a2d25',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}>
                  <Camera size={14} color="#b8812f" />
                  <span>{photoUrl ? 'Change Photo' : 'Attach Photo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    style={{ display: 'none' }}
                  />
                </label>
                <span style={{ fontSize: '12px', color: '#8a877c' }}>
                  {photoUrl ? 'Photo attached' : 'A memory snapshot'}
                </span>
              </div>

              {photoUrl && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img
                    src={photoUrl}
                    alt="Memory preview"
                    style={{ width: '42px', height: '42px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #d8d0bc' }}
                  />
                  <button
                    type="button"
                    onClick={() => setPhotoUrl('')}
                    title="Remove photo"
                    style={{ background: 'transparent', border: 'none', color: '#8a877c', cursor: 'pointer', padding: '4px' }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* Action Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            {isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="btn-vintage btn-vintage-secondary"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              disabled={isSubmitting || (!text.trim() && !photoUrl && !audioUrl)}
              className="btn-vintage btn-vintage-primary"
              style={{ marginLeft: 'auto', padding: '12px 28px' }}
            >
              <span>{isSubmitting ? 'Saving...' : 'Save Today\'s Memory'}</span>
              <Send size={15} />
            </button>
          </div>
        </form>
      ) : (
        /* State B: Prompt Answered View */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="vintage-card" style={{ padding: '36px 32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={17} color="#5c8a5c" />
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#5c8a5c' }}>
                  Memory Sealed
                </span>
              </div>

              <button
                onClick={() => setIsEditing(true)}
                className="btn-vintage btn-vintage-secondary"
                style={{ padding: '6px 14px', borderRadius: '999px', fontSize: '12px' }}
              >
                <Edit3 size={13} />
                <span>Edit Reflection</span>
              </button>
            </div>

            {/* Answer Text in Lora serif */}
            {existingAnswer?.text && (
              <div style={{
                fontSize: '17px',
                lineHeight: 1.7,
                fontFamily: 'var(--font-serif-body)',
                color: '#2a2d25',
                whiteSpace: 'pre-wrap',
                marginBottom: '24px'
              }}>
                {existingAnswer.text}
              </div>
            )}

            {/* Attached Audio Note Playback */}
            {existingAnswer?.audio_url && (
              <div style={{
                background: '#f9f7f0',
                border: '1px solid #e2dac9',
                borderRadius: '16px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                marginBottom: '20px'
              }}>
                <audio
                  ref={audioPlayerRef}
                  src={existingAnswer.audio_url}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  style={{ display: 'none' }}
                />
                <button
                  onClick={() => {
                    if (isPlaying) {
                      audioPlayerRef.current?.pause();
                    } else {
                      audioPlayerRef.current?.play();
                    }
                  }}
                  className="btn-vintage btn-vintage-primary"
                  style={{ width: '40px', height: '40px', padding: 0, borderRadius: '50%' }}
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#2a2d25', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Mic size={14} color="#5c8a5c" />
                    <span>Voice Reflection</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#8a877c', marginTop: '2px' }}>
                    Click to listen to your voice on this day
                  </div>
                </div>
              </div>
            )}

            {/* Attached Photo Preview */}
            {existingAnswer?.photo_url && (
              <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid #d8d0bc', marginTop: '16px' }}>
                <img
                  src={existingAnswer.photo_url}
                  alt="Daily Memory"
                  style={{ width: '100%', maxHeight: '480px', objectFit: 'cover', display: 'block' }}
                />
              </div>
            )}
          </div>

          {/* Tomorrow Countdown Card */}
          <div className="vintage-card-subtle" style={{
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#ede7d8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Clock size={18} color="#b8812f" />
              </div>
              <div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#2a2d25' }}>
                  Next Reflection
                </span>
                <p style={{ margin: 0, fontSize: '12px', color: '#8a877c' }}>
                  Arrives at midnight in your local timezone
                </p>
              </div>
            </div>

            <div style={{
              fontFamily: "'Inter', monospace",
              fontSize: '15px',
              fontWeight: 600,
              color: '#757267',
              background: '#ffffff',
              padding: '6px 14px',
              borderRadius: '8px',
              border: '1px solid #d8d0bc'
            }}>
              {countdown.hours}h {countdown.minutes}m {countdown.seconds}s
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
