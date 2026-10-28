const API_BASE = import.meta.env.VITE_API_BASE || '/api';

// In-memory responses for demo user (ephemeral: strictly evaporates on browser refresh)
const demoAnswers = new Map(); // question_id (string) -> answer object
let isDemoAccount = false;

export function isDemoUser() {
  if (isDemoAccount) return true;
  const token = localStorage.getItem('token');
  if (!token) return false;
  try {
    const parts = token.split('.');
    if (parts.length >= 2) {
      const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(b64));
      if (payload.email === 'demo@example.com') {
        isDemoAccount = true;
        return true;
      }
    }
  } catch {
    // Ignore decoding errors
  }
  return false;
}

export function getAuthHeaders() {
  const token = localStorage.getItem('token');
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export function handleApi404(url, errorDetail = 'Endpoint or resource not found') {
  const err = new Error(`[404 Not Found] API Error at ${url || 'resource'}: ${errorDetail}`);
  console.error(err);
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('app:404', { detail: { url, message: errorDetail } }));
      if (window.location.pathname !== '/404') {
        window.history.pushState({ is404: true }, '', '/404');
      }
    } catch {
      window.location.href = '/404';
    }
  }
  return err;
}

export async function apiFetch(url, options = {}) {
  const res = await fetch(url, options);
  if (res.status === 404) {
    const errData = await res.clone().json().catch(() => ({}));
    const message = errData.detail || 'The requested resource was not found.';
    const err = handleApi404(url, message);
    throw err;
  }
  return res;
}

export function isAuthenticated() {
  return Boolean(localStorage.getItem('token'));
}

export function logout() {
  localStorage.removeItem('token');
  demoAnswers.clear();
  isDemoAccount = false;
  // Clear any local reflection drafts on logout
  try {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('draft_')) {
        localStorage.removeItem(key);
      }
    });
  } catch {}
}

// -------------------------------------------------------------
// Auth Endpoints
// -------------------------------------------------------------

export async function loginWithPassword(username_or_email, password) {
  const res = await apiFetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username_or_email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Invalid username/email or password');
  }
  const data = await res.json();
  if (data.access_token) {
    localStorage.setItem('token', data.access_token);
  }
  return data;
}

export async function registerWithPassword(email, password, name = 'Memory Explorer') {
  const res = await apiFetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Registration failed');
  }
  const data = await res.json();
  if (data.access_token) {
    localStorage.setItem('token', data.access_token);
  }
  return data;
}

export async function loginDemoUser(email = 'demo@example.com', name = 'Demo User') {
  demoAnswers.clear();
  isDemoAccount = true;
  const res = await apiFetch(`${API_BASE}/auth/demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name }),
  });
  if (!res.ok) throw new Error('Failed to authenticate demo session');
  const data = await res.json();
  if (data.access_token) {
    localStorage.setItem('token', data.access_token);
  }
  return data;
}

export async function loginGoogleUser(idToken) {
  const res = await apiFetch(`${API_BASE}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential: idToken, token: idToken }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Google authentication failed');
  }
  const data = await res.json();
  if (data.access_token) {
    localStorage.setItem('token', data.access_token);
  }
  return data;
}

export async function fetchCurrentUser() {
  const res = await apiFetch(`${API_BASE}/auth/me`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    if (res.status === 401) {
      logout();
    }
    throw new Error('Failed to load user profile');
  }
  const data = await res.json();
  if (data.email === 'demo@example.com') {
    isDemoAccount = true;
    data.name = data.name || 'Demo User';
    // For demo users, streak reflects active in-memory reflections
    data.streak_count = demoAnswers.size;
  }
  return data;
}

// -------------------------------------------------------------
// Questions Endpoints
// -------------------------------------------------------------

export async function fetchTodayQuestion() {
  const res = await apiFetch(`${API_BASE}/questions/today`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load today's question");
  const data = await res.json();
  if (isDemoUser() && data?.id) {
    const memAns = demoAnswers.get(String(data.id));
    data.answer = memAns || null;
  }
  return data;
}

export async function fetchQuestionById(questionId) {
  const res = await apiFetch(`${API_BASE}/questions/${questionId}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load question');
  const data = await res.json();
  if (isDemoUser() && data?.id) {
    const memAns = demoAnswers.get(String(data.id));
    data.answer = memAns || null;
  }
  return data;
}

// -------------------------------------------------------------
// Answers / Memories Endpoints
// -------------------------------------------------------------

export async function submitAnswer({ question_id, text, photo_url, audio_url }) {
  if (isDemoUser()) {
    const qKey = String(question_id);
    const existing = demoAnswers.get(qKey);
    const answerObj = {
      id: existing ? existing.id : Date.now(),
      question_id: Number(question_id),
      text: text || '',
      photo_url: photo_url || null,
      audio_url: audio_url || null,
      created_at: existing ? existing.created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    demoAnswers.set(qKey, answerObj);
    return answerObj;
  }

  const res = await apiFetch(`${API_BASE}/answers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ question_id, text, photo_url, audio_url }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to submit answer');
  }
  return res.json();
}

export async function fetchAnswerById(answerId) {
  if (isDemoUser()) {
    for (const ans of demoAnswers.values()) {
      if (String(ans.id) === String(answerId)) {
        return ans;
      }
    }
  }
  const res = await apiFetch(`${API_BASE}/answers/${answerId}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load memory');
  return res.json();
}

export async function updateAnswer(answerId, { text, photo_url, audio_url }) {
  if (isDemoUser()) {
    for (const [qKey, ans] of demoAnswers.entries()) {
      if (String(ans.id) === String(answerId)) {
        const updated = {
          ...ans,
          text: text !== undefined ? text : ans.text,
          photo_url: photo_url !== undefined ? photo_url : ans.photo_url,
          audio_url: audio_url !== undefined ? audio_url : ans.audio_url,
          updated_at: new Date().toISOString(),
        };
        demoAnswers.set(qKey, updated);
        return updated;
      }
    }
  }

  const res = await apiFetch(`${API_BASE}/answers/${answerId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ text, photo_url, audio_url }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update memory');
  }
  return res.json();
}

export async function deleteAnswer(answerId) {
  if (isDemoUser()) {
    for (const [qKey, ans] of demoAnswers.entries()) {
      if (String(ans.id) === String(answerId)) {
        demoAnswers.delete(qKey);
        return { status: 'deleted', id: answerId };
      }
    }
  }

  const res = await apiFetch(`${API_BASE}/answers/${answerId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete memory');
  return res.json();
}

export async function uploadPhoto(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiFetch(`${API_BASE}/answers/upload-photo`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to upload photo');
  }
  return res.json();
}

export async function uploadVoice(blob, filename = 'voice_memory.webm') {
  const formData = new FormData();
  formData.append('file', blob, filename);
  const res = await apiFetch(`${API_BASE}/answers/upload-voice`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to upload voice recording');
  }
  return res.json();
}

// -------------------------------------------------------------
// Timeline & Calendar Endpoints
// -------------------------------------------------------------

export async function fetchTimeline({ page = 1, limit = 20, format = null, theme = null, search = null } = {}) {
  const params = new URLSearchParams();
  if (page) params.append('page', page);
  if (limit) params.append('limit', limit);
  if (format && format !== 'all') params.append('format', format);
  if (theme) params.append('theme', theme);
  if (search && search.trim()) params.append('search', search.trim());

  const res = await apiFetch(`${API_BASE}/timeline?${params.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load timeline');
  const data = await res.json();

  if (isDemoUser()) {
    // For demo user, database answers are excluded.
    // Overlay in-memory responses onto the timeline questions.
    let list = (data.memories || []).map((item) => {
      const qKey = String(item.question_id);
      const memAns = demoAnswers.get(qKey);
      if (memAns) {
        return {
          ...item,
          answered: true,
          answer: memAns,
        };
      }
      return {
        ...item,
        answered: false,
        answer: null,
      };
    });

    if (format && format !== 'all') {
      list = list.filter((item) => {
        if (!item.answered || !item.answer) return false;
        if (format === 'photo') return Boolean(item.answer.photo_url);
        if (format === 'audio') return Boolean(item.answer.audio_url);
        if (format === 'text') return Boolean(item.answer.text);
        return true;
      });
    }

    if (search && search.trim()) {
      const query = search.trim().toLowerCase();
      list = list.filter((item) => {
        const qText = (item.question_text || '').toLowerCase();
        const aText = (item.answer?.text || '').toLowerCase();
        return qText.includes(query) || aText.includes(query);
      });
    }

    data.memories = list;
    data.total_memories = demoAnswers.size;
  }

  return data;
}

// -------------------------------------------------------------
// User Preferences & Data Sovereignty
// -------------------------------------------------------------

export async function updatePreferences({
  notification_time_preference = null,
  preferred_journaling_time = null,
  timezone = null,
  interests = null,
  push_token = null,
}) {
  const payload = {};
  if (notification_time_preference !== null) payload.notification_time_preference = notification_time_preference;
  if (preferred_journaling_time !== null) payload.preferred_journaling_time = preferred_journaling_time;
  if (timezone !== null) payload.timezone = timezone;
  if (interests !== null) payload.interests = interests;
  if (push_token !== null) payload.push_token = push_token;

  const res = await apiFetch(`${API_BASE}/users/preferences`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update preferences');
  }
  return res.json();
}

export async function registerPushToken(push_token) {
  const res = await apiFetch(`${API_BASE}/users/push-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ push_token }),
  });
  if (!res.ok) throw new Error('Failed to register push token');
  return res.json();
}

export async function exportUserData() {
  const res = await apiFetch(`${API_BASE}/users/export`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to export user archive');
  const data = await res.json();

  if (isDemoUser()) {
    if (data.user) {
      data.user.name = data.user.name || 'Demo User';
      data.user.email = 'demo@example.com';
    }
    let count = 0;
    if (data.memories && Array.isArray(data.memories)) {
      data.memories = data.memories.map((m) => {
        const qKey = String(m.question_id || m.id);
        const memAns = demoAnswers.get(qKey);
        if (memAns) {
          count++;
          return {
            ...m,
            answer: {
              id: memAns.id,
              text: memAns.text,
              photo_url: memAns.photo_url,
              audio_url: memAns.audio_url,
              created_at: memAns.created_at,
            },
          };
        }
        return { ...m, answer: null };
      });
    }
    if (data.stats) {
      data.stats.total_memories_saved = count;
      data.stats.current_streak = count;
    }
  }

  return data;
}
