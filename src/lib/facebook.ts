const GRAPH = 'https://graph.facebook.com/v21.0'

export interface FacebookPostResult {
  postId?: string
  photoIds: string[]
  permalink?: string
}

async function graphFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${GRAPH}${path}`, init)
  const data = (await res.json()) as {
    error?: { message?: string }
    id?: string
    post_id?: string
  }
  if (!res.ok || data.error) {
    throw new Error(
      data.error?.message ||
        'Facebook request failed. Check Page ID and access token.',
    )
  }
  return data
}

export async function verifyFacebookPage(
  pageId: string,
  accessToken: string,
): Promise<{ id: string; name: string }> {
  const data = await graphFetch(
    `/${encodeURIComponent(pageId)}?fields=id,name&access_token=${encodeURIComponent(accessToken)}`,
  )
  return { id: data.id!, name: (data as { name?: string }).name || pageId }
}

async function uploadUnpublishedPhoto(
  pageId: string,
  accessToken: string,
  blob: Blob,
  caption?: string,
): Promise<string> {
  const form = new FormData()
  form.append('source', blob, 'photo.jpg')
  form.append('published', 'false')
  form.append('access_token', accessToken)
  if (caption) form.append('caption', caption)

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
  const { pageId, accessToken, caption, photos, onProgress } = options
  if (!pageId.trim() || !accessToken.trim()) {
    throw new Error('Configure Facebook Page ID and access token in Settings.')
  }
  if (!photos.length) throw new Error('Select at least one photograph to post.')

  // Single photo: publish directly with caption
  if (photos.length === 1) {
    onProgress?.(1, 1)
    const form = new FormData()
    form.append('source', photos[0], 'photo.jpg')
    form.append('caption', caption)
    form.append('access_token', accessToken)
    const data = await graphFetch(`/${encodeURIComponent(pageId)}/photos`, {
      method: 'POST',
      body: form,
    })
    return {
      photoIds: data.id ? [data.id] : [],
      postId: data.post_id || data.id,
    }
  }

  // Multi-photo: unpublished uploads + feed post
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
  }
}
