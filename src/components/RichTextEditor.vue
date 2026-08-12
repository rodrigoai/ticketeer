<template>
  <div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500">
    <div
      class="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 px-2 py-2"
      role="toolbar"
      aria-label="Description formatting"
    >
      <select
        :value="currentBlock"
        class="mr-1 h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm font-medium text-slate-700 outline-none hover:bg-slate-50 focus:border-primary-500"
        aria-label="Text style"
        @mousedown="rememberSelection"
        @change="applyBlock($event.target.value)"
      >
        <option value="p">Paragraph</option>
        <option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
        <option value="blockquote">Quote</option>
        <option value="pre">Code block</option>
      </select>

      <span class="mx-1 h-6 w-px bg-slate-200" aria-hidden="true"></span>

      <button
        v-for="action in inlineActions"
        :key="action.command"
        type="button"
        class="editor-button"
        :class="{ 'editor-button-active': activeCommands[action.command] }"
        :title="action.label"
        :aria-label="action.label"
        :aria-pressed="Boolean(activeCommands[action.command])"
        @mousedown.prevent
        @click="runCommand(action.command)"
      >
        <span :class="action.textClass">{{ action.text }}</span>
      </button>

      <span class="mx-1 h-6 w-px bg-slate-200" aria-hidden="true"></span>

      <button type="button" class="editor-button" title="Bulleted list" aria-label="Bulleted list" @mousedown.prevent @click="runCommand('insertUnorderedList')">
        <i class="fas fa-list-ul"></i>
      </button>
      <button type="button" class="editor-button" title="Numbered list" aria-label="Numbered list" @mousedown.prevent @click="runCommand('insertOrderedList')">
        <i class="fas fa-list-ol"></i>
      </button>
      <button type="button" class="editor-button" title="Add link" aria-label="Add link" @mousedown.prevent @click="addLink">
        <i class="fas fa-link"></i>
      </button>
      <button type="button" class="editor-button" title="Remove link" aria-label="Remove link" @mousedown.prevent @click="runCommand('unlink')">
        <i class="fas fa-unlink"></i>
      </button>

      <span class="mx-1 h-6 w-px bg-slate-200" aria-hidden="true"></span>

      <button type="button" class="editor-button" title="Clear formatting" aria-label="Clear formatting" @mousedown.prevent @click="runCommand('removeFormat')">
        <i class="fas fa-eraser"></i>
      </button>
      <button type="button" class="editor-button" title="Undo" aria-label="Undo" @mousedown.prevent @click="runCommand('undo')">
        <i class="fas fa-undo"></i>
      </button>
      <button type="button" class="editor-button" title="Redo" aria-label="Redo" @mousedown.prevent @click="runCommand('redo')">
        <i class="fas fa-redo"></i>
      </button>
    </div>

    <div
      ref="editor"
      class="editor-surface rich-text-content min-h-48 px-4 py-3 text-slate-700 outline-none"
      contenteditable="true"
      role="textbox"
      aria-multiline="true"
      :aria-label="ariaLabel"
      :data-placeholder="placeholder"
      @focus="handleFocus"
      @input="syncValue"
      @keyup="rememberSelection"
      @mouseup="rememberSelection"
      @paste="handlePaste"
    ></div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  ariaLabel: {
    type: String,
    default: 'Event description'
  },
  placeholder: {
    type: String,
    default: 'Write the event description...'
  }
})

const emit = defineEmits(['update:modelValue'])

const editor = ref(null)
const savedRange = ref(null)
const currentBlock = ref('p')
const activeCommands = reactive({
  bold: false,
  italic: false,
  underline: false
})

const inlineActions = [
  { command: 'bold', label: 'Bold', text: 'B', textClass: 'font-bold' },
  { command: 'italic', label: 'Italic', text: 'I', textClass: 'italic font-serif' },
  { command: 'underline', label: 'Underline', text: 'U', textClass: 'underline' }
]

const normalizedEditorHtml = () => {
  const html = editor.value?.innerHTML?.trim() || ''
  return /^(<br\s*\/?\s*>|<p><br\s*\/?\s*><\/p>)$/i.test(html) ? '' : html
}

const syncValue = () => {
  emit('update:modelValue', normalizedEditorHtml())
  rememberSelection()
}

const restoreSelection = (range = savedRange.value) => {
  if (!range) return

  const selection = window.getSelection()
  selection.removeAllRanges()
  selection.addRange(range)
}

const updateToolbarState = () => {
  if (!editor.value || !editor.value.contains(window.getSelection()?.anchorNode)) return

  Object.keys(activeCommands).forEach((command) => {
    activeCommands[command] = document.queryCommandState(command)
  })

  const block = String(document.queryCommandValue('formatBlock') || '').toLowerCase().replace(/[<>]/g, '')
  currentBlock.value = ['p', 'h1', 'h2', 'h3', 'blockquote', 'pre'].includes(block) ? block : 'p'
}

const rememberSelection = () => {
  const selection = window.getSelection()
  if (!selection?.rangeCount || !editor.value?.contains(selection.anchorNode)) return

  savedRange.value = selection.getRangeAt(0).cloneRange()
  updateToolbarState()
}

const runCommand = (command, value = null) => {
  const range = savedRange.value?.cloneRange()
  editor.value?.focus()
  restoreSelection(range)
  document.execCommand(command, false, value)
  syncValue()
}

const applyBlock = (block) => {
  runCommand('formatBlock', block)
  currentBlock.value = block
}

const addLink = () => {
  restoreSelection()
  const url = window.prompt('Enter the link URL')
  if (url === null) return

  if (!url.trim()) {
    runCommand('unlink')
    return
  }

  runCommand('createLink', url.trim())
}

const handleFocus = () => {
  document.execCommand('defaultParagraphSeparator', false, 'p')
  rememberSelection()
}

const handlePaste = (event) => {
  event.preventDefault()
  const text = event.clipboardData?.getData('text/plain') || ''
  document.execCommand('insertText', false, text)
  syncValue()
}

const handleSelectionChange = () => {
  if (editor.value?.contains(document.activeElement)) {
    rememberSelection()
  }
}

watch(() => props.modelValue, (value) => {
  if (!editor.value || document.activeElement === editor.value) return
  const nextValue = value || ''
  if (editor.value.innerHTML !== nextValue) {
    editor.value.innerHTML = nextValue
  }
}, { immediate: true })

onMounted(() => {
  editor.value.innerHTML = props.modelValue || ''
  document.addEventListener('selectionchange', handleSelectionChange)
})

onBeforeUnmount(() => {
  document.removeEventListener('selectionchange', handleSelectionChange)
})
</script>

<style scoped>
.editor-button {
  align-items: center;
  border-radius: 0.5rem;
  color: rgb(71 85 105);
  display: inline-flex;
  font-size: 0.8rem;
  height: 2.25rem;
  justify-content: center;
  transition: background-color 150ms ease, color 150ms ease;
  width: 2.25rem;
}

.editor-button:hover {
  background: rgb(226 232 240);
  color: rgb(15 23 42);
}

.editor-button-active {
  background: rgb(224 242 254);
  color: rgb(3 105 161);
}

.editor-surface:empty::before {
  color: rgb(148 163 184);
  content: attr(data-placeholder);
  pointer-events: none;
}
</style>
