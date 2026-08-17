import type { Env } from '../types'

/** Upload a blob to R2 and return the key. */
export async function putObject(
  env: Env,
  key: string,
  data: ArrayBuffer | Uint8Array,
  contentType: string,
): Promise<string> {
  await env.BUCKET.put(key, data, { httpMetadata: { contentType } })
  return key
}

/** Return a signed-URL-style ephemeral response for an R2 object.
 *  Cloudflare Workers can serve R2 objects directly — we stream the body. */
export async function getObject(env: Env, key: string): Promise<Response | null> {
  const obj = await env.BUCKET.get(key)
  if (!obj) return null
  const headers = new Headers()
  if (obj.httpMetadata?.contentType) {
    headers.set('Content-Type', obj.httpMetadata.contentType)
  }
  headers.set('Cache-Control', 'private, max-age=3600')
  return new Response(obj.body, { headers })
}

/** Delete a single R2 object. */
export async function deleteObject(env: Env, key: string): Promise<void> {
  await env.BUCKET.delete(key)
}

/** Delete all R2 objects whose keys start with a given prefix. */
export async function deletePrefix(env: Env, prefix: string): Promise<void> {
  let cursor: string | undefined
  do {
    const list = await env.BUCKET.list({ prefix, cursor, limit: 1000 })
    if (list.objects.length > 0) {
      await env.BUCKET.delete(list.objects.map((o) => o.key))
    }
    cursor = list.truncated ? list.cursor : undefined
  } while (cursor)
}
