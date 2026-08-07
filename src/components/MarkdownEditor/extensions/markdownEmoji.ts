import Emoji, { gitHubEmojis, type EmojiStorage } from '@tiptap/extension-emoji'
import type { Node as PMNode } from '@tiptap/pm/model'
import type { MarkdownSerializerState } from 'tiptap-markdown'

/**
 * Emoji nodes have no markdown serializer of their own, so tiptap-markdown
 * falls back to writing them as raw HTML — a whole
 * `<span data-type="emoji"><img src="https://cdn…"></span>` in place of a
 * single character. That survives a round-trip, but it means saving a document
 * containing 🚀 writes a CDN image tag into the stored markdown.
 *
 * This serializes back to the character the user actually typed. GitHub's
 * custom emoji (`:octocat:`, `:atom:`) have no Unicode equivalent, so those
 * fall back to their shortcode, which is the portable spelling.
 */

const UNICODE_BY_NAME = new Map(
  gitHubEmojis.filter((item) => item.emoji).map((item) => [item.name, item.emoji as string]),
)

export const MarkdownEmoji = Emoji.extend({
  addStorage(): EmojiStorage {
    // Cast because the storage gains a `markdown` slot that EmojiStorage,
    // which knows nothing about tiptap-markdown, does not declare.
    return {
      ...(this.parent?.() as EmojiStorage),
      markdown: {
        serialize(state: MarkdownSerializerState, node: PMNode) {
          const name = node.attrs.name as string
          state.text(UNICODE_BY_NAME.get(name) ?? `:${name}:`, false)
        },
        parse: {
          // Unicode emoji in the source are matched by the extension itself.
        },
      },
    } as EmojiStorage
  },
})

export default MarkdownEmoji
