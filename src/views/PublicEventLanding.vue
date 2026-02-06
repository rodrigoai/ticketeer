<template>
  <div class="min-h-screen bg-slate-50">
    <div class="max-w-5xl mx-auto px-4 py-10">
      <div v-if="isLoading" class="rounded-3xl border border-slate-100 bg-white px-6 py-10 text-center shadow-md">
        <div class="inline-flex items-center gap-2 text-slate-600">
          <span class="h-4 w-4 rounded-full border-2 border-slate-600 border-t-transparent animate-spin"></span>
          Loading event...
        </div>
      </div>

      <div v-else-if="errorMessage" class="rounded-3xl border border-red-200 bg-red-50 px-6 py-10 text-center text-red-700">
        {{ errorMessage }}
      </div>

      <div v-else-if="!event" class="rounded-3xl border border-slate-200 bg-white px-6 py-10 text-center">
        Event not found.
      </div>

      <div v-else class="space-y-8">
        <div class="rounded-3xl overflow-hidden bg-white shadow-lg border border-slate-100">
          <img
            v-if="event.eventImageUrl"
            :src="event.eventImageUrl"
            :alt="event.title"
            class="w-full h-72 object-cover"
          />
          <div class="p-6 space-y-4">
            <div>
              <h1 class="text-3xl font-semibold text-slate-900">{{ event.title }}</h1>
              <p class="text-slate-500 mt-2" v-if="event.description">{{ event.description }}</p>
            </div>
            <div class="flex flex-wrap gap-4 text-sm text-slate-600">
              <span class="inline-flex items-center gap-2"><i class="fas fa-calendar"></i> {{ formattedDate }}</span>
              <span v-if="event.venue" class="inline-flex items-center gap-2"><i class="fas fa-map-marker-alt"></i> {{ event.venue }}</span>
            </div>
            <div class="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div class="text-sm text-slate-500" v-if="event.checkoutPageTitle">
                Checkout page: <span class="font-semibold text-slate-700">{{ event.checkoutPageTitle }}</span>
              </div>
              <a
                class="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold shadow-md transition"
                :class="checkoutUrl ? 'bg-primary-600 text-white hover:bg-primary-500' : 'bg-slate-200 text-slate-500 cursor-not-allowed'"
                :href="checkoutUrl || undefined"
              >
                <i class="fas fa-ticket-alt"></i> Buy Ticket
              </a>
            </div>
            <p v-if="!checkoutUrl" class="text-xs text-amber-600">Checkout is not configured for this event.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '@/composables/useApi'

const route = useRoute()
const { get } = useApi()

const event = ref(null)
const checkoutUrl = ref('')
const isLoading = ref(false)
const errorMessage = ref('')

const formattedDate = computed(() => {
  if (!event.value?.date) return ''
  try {
    return new Date(event.value.date).toLocaleString()
  } catch (error) {
    return event.value.date
  }
})

const loadEvent = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const data = await get(`/api/public/events/${route.params.id}`)
    event.value = data.event || null
    checkoutUrl.value = data.checkoutUrl || ''
  } catch (error) {
    errorMessage.value = error?.data?.message || error?.message || 'Failed to load event'
    event.value = null
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadEvent()
})
</script>
