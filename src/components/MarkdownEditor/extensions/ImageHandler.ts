import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

export type ImageUploader = (file: File) => Promise<string>

export interface ImageHandlerOptions {
  /**
   * Resolves a dropped/pasted file to a URL. Defaults to a base64 data URI so
   * the editor works with no backend; swap it for a real upload endpoint and
   * documents stay lean.
   */
  upload: ImageUploader
  /** Files larger than this are rejected outright. Bytes. */
  maxFileSize: number
  onError: (error: Error) => void
}

const toDataUri: ImageUploader = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`))
    reader.readAsDataURL(file)
  })

/**
 * Paste and drag-and-drop support for images. Insertion happens at the drop
 * point (or the cursor, when pasting) and is deferred until the upload
 * resolves, so a slow endpoint never blocks typing.
 */
export const ImageHandler = Extension.create<ImageHandlerOptions>({
  name: 'imageHandler',

  addOptions() {
    return {
      upload: toDataUri,
      maxFileSize: 10 * 1024 * 1024,
      onError: (error) => console.error('[MarkdownEditor]', error),
    }
  },

  addProseMirrorPlugins() {
    const { upload, maxFileSize, onError } = this.options
    const editor = this.editor

    const insert = (files: File[], position: number | null) => {
      const images = files.filter((file) => file.type.startsWith('image/'))
      if (!images.length) return false

      images.forEach(async (file) => {
        if (file.size > maxFileSize) {
          onError(
            new Error(
              `"${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)}MB, over the ${(
                maxFileSize /
                1024 /
                1024
              ).toFixed(0)}MB limit`,
            ),
          )
          return
        }

        try {
          const src = await upload(file)
          const chain = editor.chain().focus()
          if (position !== null) chain.insertContentAt(position, { type: 'image', attrs: { src, alt: file.name } })
          else chain.setImage({ src, alt: file.name })
          chain.run()
        } catch (error) {
          onError(error instanceof Error ? error : new Error(String(error)))
        }
      })

      return true
    }

    return [
      new Plugin({
        key: new PluginKey('imageHandler'),
        props: {
          handlePaste(_view, event) {
            const files = Array.from(event.clipboardData?.files ?? [])
            if (!files.length) return false
            // Let the default handler win when the clipboard also carries HTML
            // (e.g. copying a rich-text block that happens to contain an image).
            if (event.clipboardData?.types.includes('text/html')) return false
            event.preventDefault()
            return insert(files, null)
          },

          handleDrop(view, event) {
            const files = Array.from(event.dataTransfer?.files ?? [])
            if (!files.length) return false

            const coordinates = view.posAtCoords({
              left: event.clientX,
              top: event.clientY,
            })

            event.preventDefault()
            return insert(files, coordinates?.pos ?? null)
          },
        },
      }),
    ]
  },
})

export default ImageHandler
