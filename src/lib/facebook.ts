const GRAPH = 'https://graph.facebook.com/v21.0'

export interface FacebookPostResult {
  postId?: string
  photoIds: string[]
  permalink?: string
  pageName?: string
}

export interface ResolvedPageAuth {
  pageId: string
  pageName: string
  /** Always a Page Access Token after resolution */
  accessToken: string
}

type GraphErrorBody = {
  error?: {
    message?: string
    type?: string
    code?: number
    error_subcode?: number
    fbtrace_id?: string
  }
  id?: string
  name?: string
  post_id?: string
  data?: Array<{
    id: string
    name: string
    access_token: string
  }>
}

function friendlyFacebookError(message: string): string {
  const lower = message.toLowerCase()

  if (lower.includes('publish_actions')) {
    return [
      'Facebook rejected this token: publish_actions is deprecated and cannot post.',
      'Use a Page Access Token (not a User token).',
      'In Meta Graph API Explorer, request pages_show_list, pages_manage_posts, and pages_read_engagement,',
      'then call GET /me/accounts and paste that Page access_token into Settings.',
    ].join(' ')
  }

  if (
    lower.includes('pages_read_engagement') ||
    lower.includes('page public content access') ||
    lower.includes('page public metadata access')
  ) {
    return [
      'This token is missing Page permissions.',
      'Generate a Page Access Token with pages_manage_posts + pages_read_engagement',
      '(and pages_show_list to list your pages). Do not use a personal User access token.',
    ].join(' ')
  }

  if (lower.includes('permission') || lower.includes('#200') || lower.includes('(#100)')) {
    return `${message} — Tip: Studio must post as your Facebook Page using a Page Access Token from /me/accounts.`
  }

  return message
}

async function graphFetch(path: string, init?: RequestInit): Promise<GraphErrorBody> {
  const res = await fetch(`${GRAPH}${path}`, init)
  const data = (await res.json()) as GraphErrorBody
  if (!res.ok || data.error) {
    throw new Error(
      friendlyFacebookError(
        data.error?.message ||
          'Facebook request failed. Check Page ID and access token.',
      ),
    )
  }
  return data
}

/**
 * Resolves credentials into a Page Access Token.
 * Accepts either:
 * - a Page Access Token (+ optional page id), or
 * - a User Access Token that can list pages via /me/accounts
 */
export async function resolvePageAuth(
  pageId: string,
  accessToken: string,
): Promise<ResolvedPageAuth> {
  const token = accessToken.trim()
  const configuredPageId = pageId.trim()
  if (!token) throw new Error('Paste a Facebook Page Access Token in Settings.')

  // 1) If this is already a Page token, /me returns the Page.
  try {
    const me = await graphFetch(
      `/me?fields=id,name&access_token=${encodeURIComponent(token)}`,
    )
    if (me.id && me.name) {
      if (configuredPageId && configuredPageId !== me.id) {
        // Token belongs to a different page than configured ID — still usable for that page
        return {
          pageId: me.id,
          pageName: me.name,
          accessToken: token,
        }
      }
      return {
        pageId: me.id,
        pageName: me.name,
        accessToken: token,
      }
    }
  } catch {
    // Not a page token (or missing permission) — try user /me/accounts next
  }

  // 2) User token: list managed pages and pick the matching Page token
  try {
    const accounts = await graphFetch(
      `/me/accounts?fields=id,name,access_token&limit=100&access_token=${encodeURIComponent(token)}`,
    )
    const pages = accounts.data ?? []
    if (!pages.length) {
      throw new Error(
        'No Facebook Pages found for this token. Use a Page Access Token from GET /me/accounts.',
      )
    }

    const match =
      (configuredPageId
        ? pages.find((p) => p.id === configuredPageId)
        : null) ?? pages[0]

    if (!match?.access_token) {
      throw new Error(
        'Could not read a Page Access Token from /me/accounts. Re-generate the token with pages_show_list.',
      )
    }

    return {
      pageId: match.id,
      pageName: match.name,
      accessToken: match.access_token,
    }
  } catch (err) {
    throw new Error(
      friendlyFacebookError(
        err instanceof Error
          ? err.message
          : 'Unable to resolve a Page Access Token.',
      ),
    )
  }
}

/** @deprecated Prefer resolvePageAuth — kept for Settings "Test Connection" */
export async function verifyFacebookPage(
  pageId: string,
  accessToken: string,
): Promise<{ id: string; name: string; accessToken: string }> {
  const resolved = await resolvePageAuth(pageId, accessToken)
  return {
    id: resolved.pageId,
    name: resolved.pageName,
    accessToken: resolved.accessToken,
  }
}

async function uploadUnpublishedPhoto(
  pageId: string,
  accessToken: string,
  blob: Blob,
): Promise<string> {
  const form = new FormData()
  form.append('source', blob, 'photo.jpg')
  form.append('published', 'false')
  form.append('access_token', accessToken)

  const data = await graphFetch(`/${encodeURIComponent(pageId)}/photos`, {
    method: 'POST',
    body: form,
  })
  if (!data.id) throw new Error('Facebook did not return a photo id.')
  return data.id
}

export async function postPhotosToFacebookPage(options: {
  pageId: string
  accessToken: string
  caption: string
  photos: Blob[]
  onProgress?: (current: number, total: number) => void
}): Promise<FacebookPostResult> {
  const { caption, photos, onProgress } = options

  // Always resolve to a Page token before posting (avoids publish_actions / user-token mistakes)
  const auth = await resolvePageAuth(options.pageId, options.accessToken)
  const { pageId, accessToken, pageName } = auth

  // Text-only post (no photos) — post directly to /feed
  if (!photos.length) {
    if (!caption.trim()) throw new Error('Write something before posting.')
    const form = new FormData()
    form.append('message', caption)
    form.append('access_token', accessToken)
    const feed = await graphFetch(`/${encodeURIComponent(pageId)}/feed`, {
      method: 'POST',
      body: form,
    })
    return { photoIds: [], postId: feed.id, pageName }
  }

  // Always resolve to a Page token before posting (avoids publish_actions / user-token mistakes)
  const auth = await resolvePageAuth(options.pageId, options.accessToken)
  const { pageId, accessToken, pageName } = auth

  if (photos.length === 1) {
    onProgress?.(1, 1)
    const form = new FormData()
    form.append('source', photos[0], 'photo.jpg')
    form.append('caption', caption)
    form.append('access_token', accessToken)
    form.append('published', 'true')
    const data = await graphFetch(`/${encodeURIComponent(pageId)}/photos`, {
      method: 'POST',
      body: form,
    })
    return {
      photoIds: data.id ? [data.id] : [],
      postId: data.post_id || data.id,
      pageName,
    }
  }

  const photoIds: string[] = []
  for (let i = 0; i < photos.length; i++) {
    onProgress?.(i + 1, photos.length)
    const id = await uploadUnpublishedPhoto(pageId, accessToken, photos[i])
    photoIds.push(id)
  }

  const form = new FormData()
  form.append('message', caption)
  form.append('access_token', accessToken)
  photoIds.forEach((id, index) => {
    form.append(`attached_media[${index}]`, JSON.stringify({ media_fbid: id }))
  })

  const feed = await graphFetch(`/${encodeURIComponent(pageId)}/feed`, {
    method: 'POST',
    body: form,
  })

  return {
    photoIds,
    postId: feed.id,
    pageName,
  }
}
