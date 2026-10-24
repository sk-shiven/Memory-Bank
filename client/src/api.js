const API_BASE = '/api';

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function fetchTodayQuestion() {
  const res = await fetch(`${API_BASE}/questions/today`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load today\'s question');
  return res.json();
}

export async function submitAnswer({ question_id, text, photo_url, audio_url }) {
  const res = await fetch(`${API_BASE}/answers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ question_id, text, photo_url, audio_url }),
  });
  if (!res.ok) throw new Error('Failed to submit answer');
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
  if (!res.ok) throw new Error('Failed to upload photo');
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
  if (!res.ok) throw new Error('Failed to upload voice recording');
  return res.json();
}

export async function fetchTimeline() {
  const res = await fetch(`${API_BASE}/timeline`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load timeline');
  return res.json();
}

export async function updatePreferences(notification_time_preference, push_token = null) {
  const res = await fetch(`${API_BASE}/users/preferences`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ notification_time_preference, push_token }),
  });
  if (!res.ok) throw new Error('Failed to update preferences');
  return res.json();
}

export async function loginDemoUser() {
  const res = await fetch(`${API_BASE}/auth/demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'shiven@example.com', name: 'Shiven Kathuria' }),
  });
  if (!res.ok) throw new Error('Failed to authenticate');
  const data = await res.json();
  if (data.access_token) {
    localStorage.setItem('token', data.access_token);
  }
  return data;
}
