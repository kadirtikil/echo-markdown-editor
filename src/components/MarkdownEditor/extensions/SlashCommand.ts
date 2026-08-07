import { Extension, type Editor, type Range } from '@tiptap/core'
import Suggestion, { type SuggestionOptions } from '@tiptap/suggestion'
import { VueRenderer } from '@tiptap/vue-3'
import { computePosition, flip, shift, offset, type VirtualElement } from '@floating-ui/dom'
import SlashMenu from '../SlashMenu.vue'
import { slashCommands, type SlashCommandItem } from '../commands'

export interface SlashCommandOptions {
  suggestion: Omit<SuggestionOptions<SlashCommandItem>, 'editor'>
}

interface MenuRef {
  onKeyDown?: (props: { event: KeyboardEvent }) => boolean
}

export const SlashCommand = Extension.create<SlashCommandOptions>({
  name: 'slashCommand',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        startOfLine: false,
        allowSpaces: false,

        items: ({ query }): SlashCommandItem[] => {
          const needle = query.toLowerCase().trim()
          if (!needle) return slashCommands

          return slashCommands.filter(
            (item) =>
              item.title.toLowerCase().includes(needle) ||
              item.keywords.some((keyword) => keyword.includes(needle)),
          )
        },

        command: ({ editor, range, props }: { editor: Editor; range: Range; props: SlashCommandItem }) => {
          props.command({ editor, range })
        },

        render: () => {
          let component: VueRenderer | null = null
          let element: HTMLElement | null = null
          let cleanup: (() => void) | null = null

          const position = (clientRect: (() => DOMRect | null) | null | undefined) => {
            if (!element || !clientRect) return

            const reference: VirtualElement = {
              getBoundingClientRect: () => clientRect() ?? new DOMRect(),
            }

            computePosition(reference, element, {
              placement: 'bottom-start',
              middleware: [offset(6), flip({ padding: 8 }), shift({ padding: 8 })],
            }).then(({ x, y }) => {
              if (!element) return
              Object.assign(element.style, { left: `${x}px`, top: `${y}px` })
            })
          }

          return {
            onStart: (props) => {
              component = new VueRenderer(SlashMenu, {
                props,
                editor: props.editor,
              })

              element = component.element as HTMLElement
              element.style.position = 'absolute'
              element.style.zIndex = '60'
              document.body.appendChild(element)

              position(props.clientRect)

              const reposition = () => position(props.clientRect)
              window.addEventListener('scroll', reposition, true)
              window.addEventListener('resize', reposition)
              cleanup = () => {
                window.removeEventListener('scroll', reposition, true)
                window.removeEventListener('resize', reposition)
              }
            },

            onUpdate: (props) => {
              component?.updateProps(props)
              position(props.clientRect)
            },

            onKeyDown: (props) => {
              if (props.event.key === 'Escape') {
                element?.remove()
                return true
              }
              return (component?.ref as MenuRef | undefined)?.onKeyDown?.(props) ?? false
            },

            onExit: () => {
              cleanup?.()
              cleanup = null
              element?.remove()
              element = null
              component?.destroy()
              component = null
            },
          }
        },
      },
    }
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ]
  },
})

export default SlashCommand
