async function request(method, url, body) {
  const res = await fetch(`/api${url}`, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  get: (url) => request('GET', url),
  post: (url, body) => request('POST', url, body ?? {}),
  put: (url, body) => request('PUT', url, body),
  patch: (url, body) => request('PATCH', url, body),
  del: (url) => request('DELETE', url),
};

export const SUBJECT_COLOURS = {
  'maths': 'tone-primary',
  'english-language': 'tone-accent',
  'english-literature': 'tone-warn',
  'science': 'tone-danger',
};

export function daysUntil(date) {
  if (!date) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((new Date(`${date}T00:00:00`) - today) / 864e5);
}

export function formatDate(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
