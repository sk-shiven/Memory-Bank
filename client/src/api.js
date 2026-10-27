const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export function getAuthHeaders() {
  const token = localStorage.getItem('token');
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export function isAuthenticated() {
  return Boolean(localStorage.getItem('token'));
}

export function logout() {
  localStorage.removeItem('token');
}

// -------------------------------------------------------------
// Auth Endpoints
// -------------------------------------------------------------

export async function loginWithPassword(username_or_email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
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
  const res = await fetch(`${API_BASE}/auth/register`, {
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

export async function loginDemoUser(email = 'shiven@example.com', name = 'Shiven Kathuria') {
  const res = await fetch(`${API_BASE}/auth/demo`, {
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
  const res = await fetch(`${API_BASE}/auth/google`, {
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
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    if (res.status === 401) {
      logout();
    }
    throw new Error('Failed to load user profile');
  }
  return res.json();
}

// -------------------------------------------------------------
// Questions Endpoints
// -------------------------------------------------------------

export async function fetchTodayQuestion() {
  const res = await fetch(`${API_BASE}/questions/today`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load today's question");
  return res.json();
}

export async function fetchQuestionById(questionId) {
  const res = await fetch(`${API_BASE}/questions/${questionId}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load question');
  return res.json();
}

// -------------------------------------------------------------
// Answers / Memories Endpoints
// -------------------------------------------------------------

export async function submitAnswer({ question_id, text, photo_url, audio_url }) {
  const res = await fetch(`${API_BASE}/answers`, {
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
  const res = await fetch(`${API_BASE}/answers/${answerId}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load memory');
  return res.json();
}

export async function updateAnswer(answerId, { text, photo_url, audio_url }) {
  const res = await fetch(`${API_BASE}/answers/${answerId}`, {
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
  const res = await fetch(`${API_BASE}/answers/${answerId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete memory');
  return res.json();
}

export async function uploadPhoto(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/answers/upload-photo`, {
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
  const res = await fetch(`${API_BASE}/answers/upload-voice`, {
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

  const res = await fetch(`${API_BASE}/timeline?${params.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load timeline');
  return res.json();
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

  const res = await fetch(`${API_BASE}/users/preferences`, {
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
  const res = await fetch(`${API_BASE}/users/push-token`, {
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
  const res = await fetch(`${API_BASE}/users/export`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to export user archive');
  return res.json();
}
