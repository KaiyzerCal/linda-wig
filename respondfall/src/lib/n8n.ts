const BASE = import.meta.env.VITE_N8N_BASE_URL?.replace(/\/$/, '') ?? ''

export async function n8nPost<T = unknown>(
  path: string,
  body: unknown,
  extraHeaders?: Record<string, string>,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(text || `n8n request failed: ${res.status}`)
  }
  return res.json() as Promise<T>
}

export async function n8nGet<T = unknown>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE}${path}`)
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString())
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(text || `n8n request failed: ${res.status}`)
  }
  return res.json() as Promise<T>
}
