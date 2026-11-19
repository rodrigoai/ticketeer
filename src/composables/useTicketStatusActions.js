import { reactive, ref } from 'vue'
import { useApi } from '@/composables/useApi'

export const ticketStatusActions = {
  checkin: {
    endpoint: 'checkin',
    status: 'checkedIn',
    timestamp: 'checkedInAt',
    label: 'Check in',
    pendingLabel: 'Checking in',
    completedLabel: 'Checked in',
    errorMessage: 'Check-in failed. Try again.',
    confirm: count => `Check in ${count} selected ${count === 1 ? 'ticket' : 'tickets'}?`
  },
  pickup: {
    endpoint: 'accessory-pickup',
    status: 'accessoryCollected',
    timestamp: 'accessoryCollectedAt',
    label: 'Pick up kit',
    pendingLabel: 'Marking pickup',
    completedLabel: 'Picked up',
    errorMessage: 'Kit pickup failed. Try again.',
    confirm: count => `Mark ${count} selected ${count === 1 ? 'kit' : 'kits'} as picked up?`
  }
}

export function useTicketStatusActions(eventId) {
  const { post } = useApi()
  const pending = ref(null)
  const rowErrors = reactive({ checkin: {}, pickup: {} })
  const groupErrors = reactive({ checkin: {}, pickup: {} })

  const isPending = (mode, id) => pending.value?.mode === mode && pending.value.ids.includes(id)

  const clearErrors = (mode) => {
    rowErrors[mode] = {}
    groupErrors[mode] = {}
  }

  const runAction = async (mode, ids, groupKey) => {
    if (!ids.length || pending.value) return

    const action = ticketStatusActions[mode]
    pending.value = { mode, ids }
    delete groupErrors[mode][groupKey]
    ids.forEach(id => delete rowErrors[mode][id])

    try {
      const response = await post(`/api/events/${eventId.value}/${action.endpoint}/tickets`, { ticketIds: ids })
      return response.tickets
    } catch (error) {
      const message = error.message || action.errorMessage
      if (groupKey !== undefined) groupErrors[mode][groupKey] = message
      else rowErrors[mode][ids[0]] = message
    } finally {
      pending.value = null
    }
  }

  return { runAction, pending, isPending, rowErrors, groupErrors, clearErrors }
}
