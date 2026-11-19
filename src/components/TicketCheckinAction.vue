<template>
  <div class="min-w-0">
    <span v-if="ticket.checkedIn" class="text-sm font-semibold text-emerald-700" role="status">
      Checked in<span v-if="checkinTime"> · {{ checkinTime }}</span>
    </span>
    <button
      v-else
      type="button"
      class="min-h-9 rounded-md border border-emerald-200 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:border-emerald-400 hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-60 lg:min-h-8"
      :disabled="disabled || pending"
      :aria-label="`${pending ? 'Checking in' : 'Check in'} ticket #${ticket.identificationNumber}`"
      @click="$emit('check-in')"
    >
      {{ pending ? 'Checking in…' : 'Check in' }}
    </button>
    <p v-if="error" class="mt-1 text-xs text-rose-700" role="alert">{{ error }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatDateTimeLocalInput } from '@/utils/dateTime'

const props = defineProps({
  ticket: { type: Object, required: true },
  pending: Boolean,
  disabled: Boolean,
  error: String
})

defineEmits(['check-in'])

const checkinTime = computed(() => formatDateTimeLocalInput(props.ticket.checkedInAt).slice(11))
</script>
