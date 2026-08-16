import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import type { IncidentMetadata } from '../types'
import { buildAlbumZipName, buildExportFilename } from './utils'

export interface ExportablePhoto {
  filename?: string
  blob: Blob
  index: number
}

export async function downloadBlob(blob: Blob, filename: string) {
  saveAs(blob, filename)
}

export async function exportPhotosAsZip(
  photos: ExportablePhoto[],
  metadata: Pick<IncidentMetadata, 'title' | 'address' | 'date'> & {
    location?: string
  },
  zipName?: string,
) {
  const zip = new JSZip()
  const ext = (blob: Blob) =>
    blob.type === 'image/png' ? 'png' : 'jpg'

  for (const photo of photos) {
    const name =
      photo.filename ||
      buildExportFilename(
        photo.index,
        {
          title: metadata.title,
          address: metadata.address,
          location: metadata.location,
          date: metadata.date,
        },
        ext(photo.blob),
      )
    zip.file(name, photo.blob)
  }

  const content = await zip.generateAsync({ type: 'blob' })
  const name =
    zipName ||
    buildAlbumZipName(metadata.title, metadata.date)
  saveAs(content, name)
}

export async function exportSinglePhoto(
  blob: Blob,
  index: number,
  metadata: Pick<IncidentMetadata, 'title' | 'address' | 'date'> & {
    location?: string
  },
) {
  const ext = blob.type === 'image/png' ? 'png' : 'jpg'
  const filename = buildExportFilename(
    index,
    {
      title: metadata.title,
      address: metadata.address,
      location: metadata.location,
      date: metadata.date,
    },
    ext,
  )
  await downloadBlob(blob, filename)
}
