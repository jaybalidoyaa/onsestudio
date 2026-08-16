import type { FrameConfig, PhotoAdjustments } from '../types'
import { applyCssFilters, canvasToBlob, loadImageFromUrl } from './image'

export interface CompositeInput {
  photoUrl: string
  frameUrl: string | null
  width: number
  height: number
  adjustments: PhotoAdjustments
  frameConfig: FrameConfig
  outputType?: 'image/jpeg' | 'image/png'
  quality?: number
  includeSafeArea?: boolean
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
) {
  const scale = Math.max(dw / img.naturalWidth, dh / img.naturalHeight)
  const sw = dw / scale
  const sh = dh / scale
  const sx = (img.naturalWidth - sw) / 2
  const sy = (img.naturalHeight - sh) / 2
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
}

function drawContain(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
) {
  const scale = Math.min(dw / img.naturalWidth, dh / img.naturalHeight)
  const w = img.naturalWidth * scale
  const h = img.naturalHeight * scale
  const x = dx + (dw - w) / 2
  const y = dy + (dh - h) / 2
  ctx.drawImage(img, x, y, w, h)
}

function getFrameRect(
  canvasW: number,
  canvasH: number,
  frameW: number,
  frameH: number,
  config: FrameConfig,
) {
  const scalePct = config.scale / 100
  let w: number
  let h: number

  switch (config.fitMode) {
    case 'stretch':
      w = canvasW * scalePct
      h = canvasH * scalePct
      break
    case 'cover': {
      const scale =
        Math.max(canvasW / frameW, canvasH / frameH) * scalePct
      w = frameW * scale
      h = frameH * scale
      break
    }
    case 'contain':
    case 'fit-photo': {
      const scale =
        Math.min(canvasW / frameW, canvasH / frameH) * scalePct
      w = frameW * scale
      h = frameH * scale
      break
    }
    case 'fit-frame':
    default: {
      // Fit frame to full canvas while preserving aspect ratio (may letterbox)
      const scale =
        Math.min(canvasW / frameW, canvasH / frameH) * scalePct
      // Prefer covering the canvas with the frame design without distorting
      const coverScale =
        Math.max(canvasW / frameW, canvasH / frameH) * scalePct
      // Default professional behavior: cover canvas with frame overlay
      w = frameW * coverScale
      h = frameH * coverScale
      // If scale was explicitly reduced, use contain-based scale
      if (scalePct < 1) {
        w = frameW * scale
        h = frameH * scale
      }
      break
    }
  }

  let x = (canvasW - w) / 2 + config.offsetX
  let y = (canvasH - h) / 2 + config.offsetY

  if (config.position === 'top') y = 0 + config.offsetY
  if (config.position === 'bottom') y = canvasH - h + config.offsetY
  if (config.position === 'custom') {
    x = config.offsetX
    y = config.offsetY
  }

  return { x, y, w, h }
}

export async function compositePhoto(input: CompositeInput): Promise<Blob> {
  const photo = await loadImageFromUrl(input.photoUrl)
  const canvas = document.createElement('canvas')
  canvas.width = input.width || photo.naturalWidth
  canvas.height = input.height || photo.naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Unable to create rendering context.')

  // Background
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Photo with adjustments
  ctx.save()
  ctx.filter = applyCssFilters(input.adjustments)
  const rotation = ((input.adjustments.rotation % 360) + 360) % 360

  if (rotation !== 0) {
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate((rotation * Math.PI) / 180)
    // For 90/270, swap effective draw size
    if (rotation === 90 || rotation === 270) {
      drawCover(ctx, photo, -canvas.height / 2, -canvas.width / 2, canvas.height, canvas.width)
    } else {
      drawCover(ctx, photo, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height)
    }
  } else if (input.adjustments.crop) {
    const c = input.adjustments.crop
    ctx.drawImage(
      photo,
      c.x,
      c.y,
      c.width,
      c.height,
      0,
      0,
      canvas.width,
      canvas.height,
    )
  } else {
    drawCover(ctx, photo, 0, 0, canvas.width, canvas.height)
  }
  ctx.restore()

  // Optional sharpness via slight unsharp (approximation: redraw with contrast)
  if (input.adjustments.sharpness > 0) {
    ctx.save()
    ctx.globalAlpha = input.adjustments.sharpness / 200
    ctx.filter = 'contrast(1.2)'
    drawCover(ctx, photo, 0, 0, canvas.width, canvas.height)
    ctx.restore()
  }

  // Frame overlay
  if (input.frameUrl) {
    const frame = await loadImageFromUrl(input.frameUrl)
    const rect = getFrameRect(
      canvas.width,
      canvas.height,
      frame.naturalWidth,
      frame.naturalHeight,
      input.frameConfig,
    )
    ctx.save()
    ctx.globalAlpha = Math.max(0, Math.min(1, input.frameConfig.opacity / 100))
    if (input.frameConfig.fitMode === 'stretch') {
      ctx.drawImage(frame, rect.x, rect.y, rect.w, rect.h)
    } else {
      ctx.drawImage(frame, rect.x, rect.y, rect.w, rect.h)
    }
    ctx.restore()
  }

  // Safe area guides (preview only)
  if (input.includeSafeArea) {
    const inset = Math.round(Math.min(canvas.width, canvas.height) * 0.06)
    ctx.save()
    ctx.strokeStyle = 'rgba(232, 184, 74, 0.7)'
    ctx.lineWidth = Math.max(2, Math.round(canvas.width / 800))
    ctx.setLineDash([12, 8])
    ctx.strokeRect(inset, inset, canvas.width - inset * 2, canvas.height - inset * 2)
    ctx.restore()
  }

  const type = input.outputType ?? 'image/jpeg'
  const quality = (input.quality ?? 95) / 100
  return canvasToBlob(canvas, type, quality)
}

export async function renderPreviewDataUrl(
  input: CompositeInput,
  maxEdge = 1600,
): Promise<string> {
  const photo = await loadImageFromUrl(input.photoUrl)
  const scale = Math.min(1, maxEdge / Math.max(photo.naturalWidth, photo.naturalHeight))
  const width = Math.round(photo.naturalWidth * scale)
  const height = Math.round(photo.naturalHeight * scale)
  const blob = await compositePhoto({
    ...input,
    width,
    height,
    includeSafeArea: input.includeSafeArea,
  })
  return URL.createObjectURL(blob)
}

export { drawCover, drawContain, getFrameRect }
