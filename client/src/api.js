export async function request(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin', ...options,
    headers: { 'X-Requested-With': 'CodeArena', ...options.headers },
    signal: options.signal || AbortSignal.timeout(20000),
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error || 'Request failed.');
    error.status = response.status;
    throw error;
  }
  return data;
}
