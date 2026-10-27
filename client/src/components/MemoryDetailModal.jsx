import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Trash2, 
  Edit3, 
  Play, 
  Pause, 
  Mic, 
  AlertTriangle 
} from 'lucide-react';
import { fetchAnswerById, updateAnswer, deleteAnswer } from '../api';

export default function MemoryDetailModal({ answerId, onClose, onMemoryUpdated, onMemoryDeleted }) {
  const [memory, setMemory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Audio Playback
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const audioRef = useRef(null);

  const loadMemory = async () => {
    try {
      setLoading(true);
      const res = await fetchAnswerById(answerId);
      setMemory(res);
      setEditText(res.text || '');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (answerId) {
      loadMemory();
    }
  }, [answerId]);

  // Esc key listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showDeleteConfirm) {
          setShowDeleteConfirm(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDeleteConfirm, onClose]);

  const handleSaveEdit = async () => {
    try {
      setSaving(true);
      const updated = await updateAnswer(answerId, {
        text: editText.trim(),
        photo_url: memory.photo_url,
        audio_url: memory.audio_url
      });
      setMemory(updated);
      setIsEditing(false);
      if (onMemoryUpdated) onMemoryUpdated(updated);
    } catch (e) {
      alert('Failed to update reflection: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await deleteAnswer(answerId);
      if (onMemoryDeleted) onMemoryDeleted(answerId);
      onClose();
    } catch (e) {
      alert('Failed to delete reflection: ' + e.message);
    } finally {
      setDeleting(false);
    }
  };

  const toggleSpeed = () => {
    const speeds = [1, 1.25, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setPlaybackSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  if (!answerId) return null;

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
      zIndex: 2500
    }}>
      <div className="vintage-card" style={{
        maxWidth: '620px',
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

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#8a877c' }}>
            Loading reflection...
          </div>
        ) : !memory ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#8a877c' }}>
            Memory not found.
          </div>
        ) : (
          <div>
            {/* Header Meta */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span className="vintage-badge">
                Memory Focus
              </span>
              <span style={{ fontSize: '13px', color: '#8a877c' }}>
                {memory.created_at ? new Date(memory.created_at).toLocaleDateString(undefined, {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                }) : ''}
              </span>
            </div>

            {/* Answer Text in Lora Serif */}
            {!isEditing ? (
              <div style={{ marginBottom: '24px' }}>
                <p style={{
                  fontSize: '17px',
                  lineHeight: 1.7,
                  fontFamily: 'var(--font-serif-body)',
                  color: '#2a2d25',
                  whiteSpace: 'pre-wrap',
                  margin: 0
                }}>
                  {memory.text || <em style={{ color: '#8a877c' }}>No written text for this memory.</em>}
                </p>
              </div>
            ) : (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6e7262', marginBottom: '6px' }}>
                  Edit Written Reflection
                </label>
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={6}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '14px',
                    border: '1px solid #d8d0bc',
                    background: '#fcfaf5',
                    color: '#2a2d25',
                    fontSize: '16px',
                    lineHeight: 1.6,
                    fontFamily: 'var(--font-serif-body)',
                    outline: 'none'
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="btn-vintage btn-vintage-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={saving}
                    className="btn-vintage btn-vintage-primary"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}

            {/* Audio Voice Player */}
            {memory.audio_url && (
              <div style={{
                background: '#f9f7f0',
                border: '1px solid #e2dac9',
                borderRadius: '16px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '20px'
              }}>
                <audio
                  ref={audioRef}
                  src={memory.audio_url}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  style={{ display: 'none' }}
                />

                <button
                  onClick={() => {
                    if (isPlaying) {
                      audioRef.current?.pause();
                    } else {
                      audioRef.current?.play();
                    }
                  }}
                  className="btn-vintage btn-vintage-primary"
                  style={{ width: '38px', height: '38px', borderRadius: '50%', padding: 0 }}
                >
                  {isPlaying ? <Pause size={15} /> : <Play size={15} />}
                </button>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#2a2d25', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Mic size={14} color="#5c8a5c" />
                    <span>Voice Note Recording</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#8a877c' }}>
                    Audio reflection captured on this day
                  </div>
                </div>

                <button
                  onClick={toggleSpeed}
                  className="btn-vintage btn-vintage-secondary"
                  style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '6px' }}
                >
                  {playbackSpeed}x
                </button>
              </div>
            )}

            {/* Photo Attachment View */}
            {memory.photo_url && (
              <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid #d8d0bc', marginBottom: '24px' }}>
                <img
                  src={memory.photo_url}
                  alt="Reflection photo"
                  style={{ width: '100%', maxHeight: '440px', objectFit: 'contain', background: '#faf8f2', display: 'block' }}
                />
              </div>
            )}

            {/* Action Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px solid #ede8db',
              paddingTop: '18px',
              marginTop: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="btn-vintage btn-vintage-secondary"
                    style={{ padding: '8px 14px', fontSize: '13px' }}
                  >
                    <Edit3 size={14} />
                    <span>Edit</span>
                  </button>
                )}

                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '12px',
                    background: 'transparent',
                    border: '1px solid #e8dede',
                    color: '#c25e5e',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>
              </div>

              <span style={{ fontSize: '11px', color: '#8a877c' }}>
                Memory #{memory.id}
              </span>
            </div>

            {/* Delete Confirmation Safety Dialog */}
            {showDeleteConfirm && (
              <div style={{
                marginTop: '16px',
                padding: '16px',
                borderRadius: '14px',
                background: '#fdf3f3',
                border: '1px solid #f2cfcf',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c25e5e', fontWeight: 600, fontSize: '13px' }}>
                  <AlertTriangle size={16} />
                  <span>Are you sure you want to delete this memory?</span>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#8a877c', lineHeight: 1.5 }}>
                  This reflection will be permanently removed from your 365 bank. This action cannot be undone.
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="btn-vintage btn-vintage-secondary"
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                  >
                    Keep Memory
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '10px',
                      background: '#c25e5e',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {deleting ? 'Deleting...' : 'Yes, Delete'}
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
