export async function api(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const error = new Error(data?.error || `Erreur (${res.status})`);
    error.status = res.status;
    throw error;
  }
  return data;
}

