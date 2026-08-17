export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

export function ok(data: unknown = { ok: true }): Response {
  return json(data, 200)
}

export function created(data: unknown): Response {
  return json(data, 201)
}

export function err(message: string, status = 400): Response {
  return json({ error: message }, status)
}

export function unauthorized(message = 'Unauthorized'): Response {
  return err(message, 401)
}

export function forbidden(message = 'Forbidden'): Response {
  return err(message, 403)
}

export function notFound(message = 'Not found'): Response {
  return err(message, 404)
}
