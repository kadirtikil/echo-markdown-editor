import { Extension } from '@tiptap/core'

/**
 * tiptap-markdown's own tight-list handling only covers `bulletList` and
 * `orderedList`, so task lists serialize with a blank line between every item.
 * Their serializer still goes through prosemirror-markdown's `renderList`,
 * which reads `node.attrs.tight` — supplying that attribute is enough.
 */
export const TightTaskList = Extension.create({
  name: 'tightTaskList',

  addGlobalAttributes() {
    return [
      {
        types: ['taskList'],
        attributes: {
          tight: {
            default: true,
            parseHTML: (element) =>
              element.getAttribute('data-tight') === 'true' || !element.querySelector('p'),
            renderHTML: (attributes) =>
              attributes.tight ? { 'data-tight': 'true' } : {},
          },
        },
      },
    ]
  },
})

export default TightTaskList
