import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { EditorState, Transaction } from '@tiptap/pm/state'
import type { Node as PMNode } from '@tiptap/pm/model'

export interface SearchMatch {
  from: number
  to: number
}

export interface SearchAndReplaceOptions {
  matchClass: string
  currentClass: string
}

export interface SearchAndReplaceStorage {
  searchTerm: string
  replaceTerm: string
  caseSensitive: boolean
  regex: boolean
  wholeWord: boolean
  matches: SearchMatch[]
  currentIndex: number
}

declare module '@tiptap/core' {
  interface Storage {
    searchAndReplace: SearchAndReplaceStorage
  }

  interface Commands<ReturnType> {
    searchAndReplace: {
      setSearchTerm: (term: string) => ReturnType
      setReplaceTerm: (term: string) => ReturnType
      setSearchOptions: (
        options: Partial<Pick<SearchAndReplaceStorage, 'caseSensitive' | 'regex' | 'wholeWord'>>,
      ) => ReturnType
      nextMatch: () => ReturnType
      previousMatch: () => ReturnType
      replaceCurrent: () => ReturnType
      replaceAll: () => ReturnType
      clearSearch: () => ReturnType
    }
  }
}

export const searchPluginKey = new PluginKey('searchAndReplace')

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildRegex(storage: SearchAndReplaceStorage): RegExp | null {
  if (!storage.searchTerm) return null

  let source = storage.regex ? storage.searchTerm : escapeRegExp(storage.searchTerm)
  if (storage.wholeWord) source = `\\b(?:${source})\\b`

  try {
    return new RegExp(source, storage.caseSensitive ? 'gu' : 'gui')
  } catch {
    // An in-progress regex like "foo(" should simply match nothing, not throw.
    return null
  }
}

/**
 * Walks the document's text nodes and maps regex hits back to document
 * positions. Text is gathered per text-block so a match cannot span blocks.
 */
function findMatches(doc: PMNode, regex: RegExp | null): SearchMatch[] {
  if (!regex) return []

  const matches: SearchMatch[] = []

  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true

    let text = ''
    const offsets: number[] = []

    node.forEach((child, offset) => {
      if (child.isText) {
        const content = child.text ?? ''
        for (let i = 0; i < content.length; i += 1) {
          offsets.push(pos + 1 + offset + i)
        }
        text += content
      } else {
        // Atoms (images, math, emoji) occupy one position but no searchable text.
        offsets.push(pos + 1 + offset)
        text += '￼'
      }
    })

    regex.lastIndex = 0
    let match = regex.exec(text)

    while (match !== null) {
      if (match[0].length > 0) {
        const from = offsets[match.index]
        const to = offsets[match.index + match[0].length - 1] + 1
        if (from !== undefined && to !== undefined) matches.push({ from, to })
      } else {
        regex.lastIndex += 1
      }
      match = regex.exec(text)
    }

    return false
  })

  return matches
}

export const SearchAndReplace = Extension.create<SearchAndReplaceOptions, SearchAndReplaceStorage>({
  name: 'searchAndReplace',

  addOptions() {
    return {
      matchClass: 'me-search-match',
      currentClass: 'me-search-match--current',
    }
  },

  addStorage() {
    return {
      searchTerm: '',
      replaceTerm: '',
      caseSensitive: false,
      regex: false,
      wholeWord: false,
      matches: [],
      currentIndex: 0,
    }
  },

  addCommands() {
    const refresh = (state: EditorState, tr: Transaction) => {
      const storage = this.storage
      storage.matches = findMatches(state.doc, buildRegex(storage))
      if (storage.currentIndex >= storage.matches.length) storage.currentIndex = 0
      tr.setMeta(searchPluginKey, true)
    }

    const scrollToCurrent = (): void => {
      requestAnimationFrame(() => {
        this.editor.view.dom
          .querySelector(`.${this.options.currentClass}`)
          ?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      })
    }

    return {
      setSearchTerm:
        (term) =>
        ({ state, tr, dispatch }) => {
          this.storage.searchTerm = term
          this.storage.currentIndex = 0
          if (dispatch) {
            refresh(state, tr)
            dispatch(tr)
          }
          return true
        },

      setReplaceTerm: (term) => () => {
        this.storage.replaceTerm = term
        return true
      },

      setSearchOptions:
        (options) =>
        ({ state, tr, dispatch }) => {
          Object.assign(this.storage, options)
          this.storage.currentIndex = 0
          if (dispatch) {
            refresh(state, tr)
            dispatch(tr)
          }
          return true
        },

      nextMatch:
        () =>
        ({ tr, dispatch }) => {
          const total = this.storage.matches.length
          if (!total) return false
          this.storage.currentIndex = (this.storage.currentIndex + 1) % total
          if (dispatch) {
            dispatch(tr.setMeta(searchPluginKey, true))
            scrollToCurrent()
          }
          return true
        },

      previousMatch:
        () =>
        ({ tr, dispatch }) => {
          const total = this.storage.matches.length
          if (!total) return false
          this.storage.currentIndex = (this.storage.currentIndex - 1 + total) % total
          if (dispatch) {
            dispatch(tr.setMeta(searchPluginKey, true))
            scrollToCurrent()
          }
          return true
        },

      replaceCurrent:
        () =>
        ({ state, tr, dispatch }) => {
          const match = this.storage.matches[this.storage.currentIndex]
          if (!match) return false
          if (dispatch) {
            tr.insertText(this.storage.replaceTerm, match.from, match.to)
            refresh(state.apply(tr), tr)
            dispatch(tr)
          }
          return true
        },

      replaceAll:
        () =>
        ({ state, tr, dispatch }) => {
          const matches = this.storage.matches
          if (!matches.length) return false
          if (dispatch) {
            // Back to front so earlier replacements don't shift later offsets.
            for (let i = matches.length - 1; i >= 0; i -= 1) {
              tr.insertText(this.storage.replaceTerm, matches[i].from, matches[i].to)
            }
            this.storage.currentIndex = 0
            refresh(state.apply(tr), tr)
            dispatch(tr)
          }
          return true
        },

      clearSearch:
        () =>
        ({ tr, dispatch }) => {
          this.storage.searchTerm = ''
          this.storage.matches = []
          this.storage.currentIndex = 0
          if (dispatch) dispatch(tr.setMeta(searchPluginKey, true))
          return true
        },
    }
  },

  addProseMirrorPlugins() {
    const extension = this

    return [
      new Plugin({
        key: searchPluginKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, old) {
            const forced = tr.getMeta(searchPluginKey)
            if (!tr.docChanged && !forced) return old

            const storage = extension.storage
            if (tr.docChanged) {
              storage.matches = findMatches(tr.doc, buildRegex(storage))
              if (storage.currentIndex >= storage.matches.length) storage.currentIndex = 0
            }

            if (!storage.matches.length) return DecorationSet.empty

            const decorations = storage.matches.map((match, index) =>
              Decoration.inline(match.from, match.to, {
                class:
                  index === storage.currentIndex
                    ? `${extension.options.matchClass} ${extension.options.currentClass}`
                    : extension.options.matchClass,
              }),
            )

            return DecorationSet.create(tr.doc, decorations)
          },
        },
        props: {
          decorations(state) {
            return this.getState(state)
          },
        },
      }),
    ]
  },
})

export default SearchAndReplace
