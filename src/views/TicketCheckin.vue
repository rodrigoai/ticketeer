<template>
  <div class="min-h-screen bg-slate-50 py-8 px-4">
    <div class="max-w-xl mx-auto space-y-6">
      <!-- Loading State -->
      <div v-if="loading" class="rounded-3xl border border-slate-100 bg-white px-6 py-10 text-center shadow-md">
        <div class="inline-flex items-center gap-2 text-slate-600">
          <span class="h-4 w-4 rounded-full border-2 border-slate-600 border-t-transparent animate-spin"></span>
          Carregando informações do ticket...
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="rounded-3xl bg-amber-400 text-amber-900 px-6 py-10 text-center shadow-lg">
        <div class="flex justify-center items-center bg-white/25 rounded-full mx-auto mb-3 w-16 h-16">
          <i class="fas fa-exclamation text-2xl"></i>
        </div>
        <h2 class="text-lg font-semibold mb-2">CÓDIGO NÃO ENCONTRADO</h2>
        <p class="text-sm">Verifique novamente ou fale com a administração</p>
      </div>

      <!-- Already Checked In -->
      <div v-else-if="ticketData && ticketData.ticket.checkedIn" class="space-y-6">
        <!-- Success Card -->
        <div class="rounded-3xl bg-emerald-500 text-white px-6 py-10 text-center shadow-lg">
          <div class="flex justify-center items-center bg-white/25 rounded-full mx-auto mb-3 w-16 h-16">
            <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
            </svg>
          </div>
          <h2 class="text-lg font-semibold mb-2">CHECKIN REALIZADO</h2>
          <p class="text-sm text-white/80">Checkin realizado {{ formatDateTimePortuguese(ticketData.ticket.checkedInAt) }}</p>
        </div>

        <!-- Ticket Information -->
        <div class="rounded-3xl border border-slate-100 bg-white px-6 py-6 shadow-sm space-y-4">
          <div class="flex items-center gap-2 text-slate-500">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
            </svg>
            <span class="text-sm font-medium">Ticket número #{{ ticketData.ticket.identificationNumber }}</span>
          </div>
          
          <div>
            <h3 class="text-xl font-semibold text-slate-900">{{ ticketData.ticket.buyer || 'Nome do Comprador' }}</h3>
            <p class="text-slate-500">{{ ticketData.ticket.buyerDocument || '000.000.000-00' }}</p>
            <p class="text-slate-500">{{ ticketData.ticket.location || 'Local' }}</p>
            <p class="text-slate-500">{{ ticketData.ticket.description }}</p>
            <p class="text-slate-700 font-semibold">Mesa: {{ ticketData.ticket.table }}</p>
          </div>
        </div>

        <!-- Event Information -->
        <div class="rounded-3xl border border-slate-100 bg-white px-6 py-6 shadow-sm space-y-4">
          <div class="flex items-center gap-2 text-slate-500">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/>
            </svg>
            <span class="text-sm font-medium">Informações do Evento</span>
          </div>
          
          <div>
            <h3 class="text-xl font-semibold text-slate-900">{{ ticketData.event.name }}</h3>
            <p class="text-slate-500">{{ ticketData.event.venue }}</p>
            <p class="text-slate-700 font-medium">{{ formatEventDateTime(ticketData.event.opening_datetime) }}</p>
          </div>
        </div>
      </div>

      <!-- Check-in Confirmation -->
      <div v-else-if="ticketData && ticketData.canCheckin" class="space-y-6">
        <!-- Header -->
        <div class="rounded-3xl border border-slate-100 bg-white px-6 py-6 text-center shadow-sm">
          <h1 class="text-2xl font-semibold text-emerald-600 mb-2">CHECKIN</h1>
          <p class="text-sm text-slate-500">Verifique se os dados a seguir batem com a compra</p>
        </div>

        <!-- Ticket Information -->
        <div class="rounded-3xl border border-slate-100 bg-white px-6 py-6 shadow-sm space-y-4">
          <div class="flex items-center gap-2 text-slate-500">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
            </svg>
            <span class="text-sm font-medium">Ticket número #{{ ticketData.ticket.identificationNumber }}</span>
          </div>
          
          <div>
            <h3 class="text-xl font-semibold text-slate-900">{{ ticketData.ticket.buyer || 'Nome do Comprador' }}</h3>
            <p class="text-slate-500">{{ ticketData.ticket.buyerDocument || '000.000.000-00' }}</p>
            <p class="text-slate-500">{{ ticketData.ticket.location || 'Local' }}</p>
            <p class="text-slate-500">{{ ticketData.ticket.description }}</p>
            <p class="text-slate-700 font-semibold">Mesa: {{ ticketData.ticket.table }}</p>
          </div>
        </div>

        <!-- Event Information -->
        <div class="rounded-3xl border border-slate-100 bg-white px-6 py-6 shadow-sm space-y-4">
          <div class="flex items-center gap-2 text-slate-500">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/>
            </svg>
            <span class="text-sm font-medium">Informações do Evento</span>
          </div>
          
          <div>
            <h3 class="text-xl font-semibold text-slate-900">{{ ticketData.event.name }}</h3>
            <p class="text-slate-500">{{ ticketData.event.venue }}</p>
            <p class="text-slate-700 font-medium">{{ formatEventDateTime(ticketData.event.opening_datetime) }}</p>
          </div>
        </div>

        <!-- Check-in Button -->
        <button
          @click="confirmCheckin"
          :disabled="processing"
          class="w-full rounded-full bg-emerald-500 px-6 py-4 text-lg font-semibold text-white shadow-md hover:bg-emerald-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          type="button"
        >
          <span v-if="processing" class="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
          {{ processing ? 'Realizando Checkin...' : 'Realizar Checkin' }}
        </button>
      </div>

      <!-- Success State -->
      <div v-else-if="checkedInSuccess" class="space-y-6">
        <!-- Success Card -->
        <div class="rounded-3xl bg-emerald-500 text-white px-6 py-10 text-center shadow-lg">
          <div class="flex justify-center items-center bg-white/25 rounded-full mx-auto mb-3 w-16 h-16">
            <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
            </svg>
          </div>
          <h2 class="text-lg font-semibold mb-2">CHECKIN REALIZADO</h2>
          <p class="text-sm text-white/80">Checkin realizado {{ formatDateTimePortuguese(checkedInSuccess.ticket.checkedInAt) }}</p>
        </div>

        <!-- Ticket Information -->
        <div class="rounded-3xl border border-slate-100 bg-white px-6 py-6 shadow-sm space-y-4">
          <div class="flex items-center gap-2 text-slate-500">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
            </svg>
            <span class="text-sm font-medium">Ticket número #{{ checkedInSuccess.ticket.identificationNumber }}</span>
          </div>
          
          <div>
            <h3 class="text-xl font-semibold text-slate-900">{{ checkedInSuccess.ticket.buyer || 'Nome do Comprador' }}</h3>
            <p class="text-slate-500">{{ checkedInSuccess.ticket.buyerDocument || '000.000.000-00' }}</p>
            <p class="text-slate-500">{{ checkedInSuccess.ticket.location || 'Local' }}</p>
            <p class="text-slate-500">{{ checkedInSuccess.ticket.description }}</p>
          </div>
        </div>

        <!-- Event Information -->
        <div class="rounded-3xl border border-slate-100 bg-white px-6 py-6 shadow-sm space-y-4">
          <div class="flex items-center gap-2 text-slate-500">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/>
            </svg>
            <span class="text-sm font-medium">Informações do Evento</span>
          </div>
          
          <div>
            <h3 class="text-xl font-semibold text-slate-900">{{ checkedInSuccess.event.name }}</h3>
            <p class="text-slate-500">{{ checkedInSuccess.event.venue }}</p>
            <p class="text-slate-700 font-medium">{{ formatEventDateTime(checkedInSuccess.event.opening_datetime) }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'

export default {
  name: 'TicketCheckin',
  setup() {
    const route = useRoute()
    const hash = ref(route.params.hash)
    
    const loading = ref(true)
    const processing = ref(false)
    const error = ref(null)
    const ticketData = ref(null)
    const checkedInSuccess = ref(null)

    const fetchTicketStatus = async () => {
      try {
        loading.value = true
        error.value = null
        
        const response = await fetch(`/api/public/checkin/${hash.value}`)
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.message || 'Failed to load ticket information')
        }
        
        ticketData.value = data
      } catch (err) {
        console.error('Error fetching ticket status:', err)
        error.value = err.message || 'Failed to load ticket information'
      } finally {
        loading.value = false
      }
    }

    const confirmCheckin = async () => {
      try {
        processing.value = true
        
        const response = await fetch(`/api/public/checkin/${hash.value}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        })
        
        const data = await response.json()
        
        if (!response.ok) {
          if (data.alreadyCheckedIn) {
            await fetchTicketStatus()
            return
          }
          throw new Error(data.message || 'Failed to process check-in')
        }
        
        if (data.success) {
          checkedInSuccess.value = data
          ticketData.value = null
        } else {
          throw new Error(data.message || 'Check-in failed')
        }
      } catch (err) {
        console.error('Error processing check-in:', err)
        error.value = err.message || 'Failed to process check-in'
      } finally {
        processing.value = false
      }
    }

    const formatDateTimePortuguese = (dateString) => {
      if (!dateString) return ''
      
      const date = new Date(dateString)
      const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
      const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
      
      const weekday = weekdays[date.getDay()]
      const day = date.getDate()
      const month = months[date.getMonth()]
      const year = date.getFullYear()
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      
      return `${weekday}, ${day} de ${month} de ${year} às ${hours}:${minutes}`
    }

    const formatEventDateTime = (dateString) => {
      if (!dateString) return ''
      
      const date = new Date(dateString)
      const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
      const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
      
      const weekday = weekdays[date.getDay()]
      const day = date.getDate()
      const month = months[date.getMonth()]
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      
      return `${weekday}, ${day} ${month} às ${hours}h`
    }

    onMounted(() => {
      if (hash.value) {
        fetchTicketStatus()
      } else {
        error.value = 'Invalid check-in link'
        loading.value = false
      }
    })

    return {
      loading,
      processing,
      error,
      ticketData,
      checkedInSuccess,
      fetchTicketStatus,
      confirmCheckin,
      formatDateTimePortuguese,
      formatEventDateTime
    }
  }
}
</script>

<style scoped>
/* Tailwind handles all styling */
</style>