const MAX_IMAGE_DIMENSION = 8000
const MAX_FILE_BYTES = 80 * 1024 * 1024
const THUMB_SIZE = 240

export class ImageLoadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImageLoadError'
  }
}

export function revokeUrl(url?: string | null) {
  if (url?.startsWith('blob:')) {
    URL.revokeObjectURL(url)
  }
}

export function createObjectUrl(blob: Blob): string {
  return URL.createObjectURL(blob)
}

export async function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  const url = createObjectUrl(blob)
  try {
    const img = await loadImageFromUrl(url)
    return img
  } finally {
    // Keep URL if caller needs it; we revoke only when loading fails mid-flight
  }
}

export function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => resolve(img)
    img.onerror = () =>
      reject(
        new ImageLoadError(
          'Unable to process this photograph. Please try another image.',
        ),
      )
    img.src = url
  })
}

export async function readImageDimensions(
  blob: Blob,
): Promise<{ width: number; height: number; image: HTMLImageElement; url: string }> {
  if (blob.size > MAX_FILE_BYTES) {
    throw new ImageLoadError(
      'This image is too large for the browser to process. Try a smaller file.',
    )
  }

  const url = createObjectUrl(blob)
  try {
    const image = await loadImageFromUrl(url)
    if (
      image.naturalWidth > MAX_IMAGE_DIMENSION ||
      image.naturalHeight > MAX_IMAGE_DIMENSION
    ) {
      revokeUrl(url)
      throw new ImageLoadError(
        'This image exceeds the maximum supported dimensions.',
      )
    }
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      image,
      url,
    }
  } catch (err) {
    revokeUrl(url)
    throw err
  }
}

export async function createThumbnailBlob(
  source: Blob | HTMLImageElement,
  size = THUMB_SIZE,
): Promise<Blob> {
  const image =
    source instanceof HTMLImageElement
      ? source
      : (await readImageDimensions(source)).image

  const scale = Math.min(1, size / Math.max(image.naturalWidth, image.naturalHeight))
  const w = Math.max(1, Math.round(image.naturalWidth * scale))
  const h = Math.max(1, Math.round(image.naturalHeight * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new ImageLoadError('Unable to create thumbnail.')
  ctx.drawImage(image, 0, 0, w, h)

  return canvasToBlob(canvas, 'image/jpeg', 0.82)
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type = 'image/jpeg',
  quality = 0.92,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new ImageLoadError('Failed to render image.'))
          return
        }
        resolve(blob)
      },
      type,
      quality,
    )
  })
}

export async function detectTransparency(blob: Blob): Promise<boolean> {
  if (blob.type === 'image/jpeg') return false
  if (blob.type === 'image/svg+xml') return true

  try {
    const { image, url } = await readImageDimensions(blob)
    const canvas = document.createElement('canvas')
    const sample = 64
    const scale = Math.min(1, sample / Math.max(image.naturalWidth, image.naturalHeight))
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) {
      revokeUrl(url)
      return blob.type === 'image/png'
    }
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    let transparent = false
    for (let i = 3; i < data.length; i += 16) {
      if (data[i] < 250) {
        transparent = true
        break
      }
    }
    revokeUrl(url)
    return transparent
  } catch {
    return blob.type === 'image/png' || blob.type === 'image/svg+xml'
  }
}

export function applyCssFilters(adjustments: {
  brightness: number
  contrast: number
  exposure: number
  saturation: number
}): string {
  const brightness = 1 + adjustments.brightness / 100 + adjustments.exposure / 200
  const contrast = 1 + adjustments.contrast / 100
  const saturation = 1 + adjustments.saturation / 100
  return `brightness(${brightness}) contrast(${contrast}) saturate(${saturation})`
}
