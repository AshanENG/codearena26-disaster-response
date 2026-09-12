export async function request(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin', ...options,
    headers: { 'X-Requested-With': 'CodeArena', ...options.headers },
    signal: options.signal || AbortSignal.timeout(20000),
  });
  const text = await response.text();
  let data = {};
  if (text && text.trim().length > 0) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }
  if (!response.ok) {
    const error = new Error(data.error || `Request failed with status ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data;
}
