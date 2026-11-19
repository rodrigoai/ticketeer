<template>
  <div class="min-w-0">
    <span
      v-if="ticket[action.status]"
      class="text-sm font-semibold"
      :class="mode === 'pickup' ? 'text-sky-800' : 'text-emerald-700'"
      role="status"
    >
      {{ action.completedLabel }}<span v-if="recordedTime"> · {{ recordedTime }}</span>
    </span>
    <button
      v-else
      type="button"
      class="min-h-9 rounded-md border px-2.5 py-1 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60 lg:min-h-8"
      :class="mode === 'pickup'
        ? 'border-sky-200 text-sky-800 hover:border-sky-400 hover:bg-sky-50 focus-visible:outline-sky-700'
        : 'border-emerald-200 text-emerald-800 hover:border-emerald-400 hover:bg-emerald-50 focus-visible:outline-emerald-700'"
      :disabled="disabled || pending"
      :aria-label="`${pending ? action.pendingLabel : action.label}${mode === 'pickup' ? ' for' : ''} ticket #${ticket.identificationNumber}`"
      @click="$emit('submit')"
    >
      {{ pending ? `${action.pendingLabel}…` : action.label }}
    </button>
    <p v-if="error" class="mt-1 text-xs text-rose-700" role="alert">{{ error }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatDateTimeLocalInput } from '@/utils/dateTime'
import { ticketStatusActions } from '@/composables/useTicketStatusActions'

const props = defineProps({
  ticket: { type: Object, required: true },
  mode: { type: String, required: true },
  pending: Boolean,
  disabled: Boolean,
  error: String
})

defineEmits(['submit'])

const action = computed(() => ticketStatusActions[props.mode])
const recordedTime = computed(() => formatDateTimeLocalInput(props.ticket[action.value.timestamp]).slice(11))
</script>
