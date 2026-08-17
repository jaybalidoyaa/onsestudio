export function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  }
}

export function handleOptions(request: Request, origin: string): Response | null {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) })
  }
  return null
}

export function withCors(response: Response, origin: string): Response {
  const headers = new Headers(response.headers)
  for (const [k, v] of Object.entries(corsHeaders(origin))) {
    headers.set(k, v)
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}
