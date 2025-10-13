<template>
  <div class="min-vh-100 bg-light py-5 px-3">
    <div class="container" style="max-width: 24rem;">
      <!-- Loading State -->
      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-success" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-3 text-muted">Carregando informações do ticket...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="card text-bg-warning text-center rounded-4">
        <div class="card-body p-5">
          <div class="d-flex justify-content-center align-items-center bg-white bg-opacity-25 rounded-circle mx-auto mb-3" style="width: 4rem; height: 4rem;">
            <i class="fas fa-exclamation fs-3"></i>
          </div>
          <h2 class="h5 fw-bold mb-2">CÓDIGO NÃO ENCONTRADO</h2>
          <p class="small mb-0">Verifique novamente ou fale com a administração</p>
        </div>
      </div>

      <!-- Already Checked In -->
      <div v-else-if="ticketData && ticketData.ticket.checkedIn">
        <!-- Success Card -->
        <div class="card text-bg-success text-center rounded-4 mb-4">
          <div class="card-body p-5">
            <div class="d-flex justify-content-center align-items-center bg-white bg-opacity-25 rounded-circle mx-auto mb-3" style="width: 4rem; height: 4rem;">
              <svg width="2rem" height="2rem" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
              </svg>
            </div>
            <h2 class="h5 fw-bold mb-2">CHECKIN REALIZADO</h2>
            <p class="small mb-0">Checkin realizado {{ formatDateTimePortuguese(ticketData.ticket.checkedInAt) }}</p>
          </div>
        </div>

        <!-- Ticket Information -->
        <div class="mb-4">
          <div class="d-flex align-items-center mb-3">
            <svg width="1.5rem" height="1.5rem" class="me-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
            </svg>
            <span class="fw-medium text-secondary">Ticket número #{{ ticketData.ticket.identificationNumber }}</span>
          </div>
          
          <h3 class="h4 fw-bold text-dark mb-1">{{ ticketData.ticket.buyer || 'Nome do Comprador' }}</h3>
          <p class="text-muted mb-1">{{ ticketData.ticket.buyerDocument || '000.000.000-00' }}</p>
          <p class="text-muted mb-1">{{ ticketData.ticket.location || 'Local' }}</p>
          <p class="text-muted mb-0">{{ ticketData.ticket.description }}</p>
        </div>

        <!-- Event Information -->
        <div>
          <div class="d-flex align-items-center mb-3">
            <svg width="1.5rem" height="1.5rem" class="me-2" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/>
            </svg>
            <span class="fw-medium text-secondary">Informações do Evento</span>
          </div>
          
          <h3 class="h4 fw-bold text-dark mb-1">{{ ticketData.event.name }}</h3>
          <p class="text-muted mb-1">{{ ticketData.event.venue }}</p>
          <p class="text-muted fw-medium mb-0">{{ formatEventDateTime(ticketData.event.opening_datetime) }}</p>
        </div>
      </div>

      <!-- Check-in Confirmation -->
      <div v-else-if="ticketData && ticketData.canCheckin">
        <!-- Header -->
        <div class="text-center mb-4">
          <h1 class="h3 fw-bold text-success mb-2">CHECKIN</h1>
          <p class="text-muted">Verifique se os dados a seguir batem com a compra</p>
        </div>

        <!-- Ticket Information -->
        <div class="mb-4">
          <div class="d-flex align-items-center mb-3">
            <svg width="1.5rem" height="1.5rem" class="me-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
            </svg>
            <span class="fw-medium text-secondary">Ticket número #{{ ticketData.ticket.identificationNumber }}</span>
          </div>
          
          <h3 class="h4 fw-bold text-dark mb-1">{{ ticketData.ticket.buyer || 'Nome do Comprador' }}</h3>
          <p class="text-muted mb-1">{{ ticketData.ticket.buyerDocument || '000.000.000-00' }}</p>
          <p class="text-muted mb-1">{{ ticketData.ticket.location || 'Local' }}</p>
          <p class="text-muted mb-0">{{ ticketData.ticket.description }}</p>
        </div>

        <!-- Event Information -->
        <div class="mb-4">
          <div class="d-flex align-items-center mb-3">
            <svg width="1.5rem" height="1.5rem" class="me-2" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/>
            </svg>
            <span class="fw-medium text-secondary">Informações do Evento</span>
          </div>
          
          <h3 class="h4 fw-bold text-dark mb-1">{{ ticketData.event.name }}</h3>
          <p class="text-muted mb-1">{{ ticketData.event.venue }}</p>
          <p class="text-muted fw-medium mb-0">{{ formatEventDateTime(ticketData.event.opening_datetime) }}</p>
        </div>

        <!-- Check-in Button -->
        <button
          @click="confirmCheckin"
          :disabled="processing"
          class="btn btn-success btn-lg w-100 rounded-4 fw-semibold"
          type="button"
        >
          <span v-if="processing" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
          {{ processing ? 'Realizando Checkin...' : 'Realizar Checkin' }}
        </button>
      </div>

      <!-- Success State -->
      <div v-else-if="checkedInSuccess">
        <!-- Success Card -->
        <div class="card text-bg-success text-center rounded-4 mb-4">
          <div class="card-body p-5">
            <div class="d-flex justify-content-center align-items-center bg-white bg-opacity-25 rounded-circle mx-auto mb-3" style="width: 4rem; height: 4rem;">
              <svg width="2rem" height="2rem" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
              </svg>
            </div>
            <h2 class="h5 fw-bold mb-2">CHECKIN REALIZADO</h2>
            <p class="small mb-0">Checkin realizado {{ formatDateTimePortuguese(checkedInSuccess.ticket.checkedInAt) }}</p>
          </div>
        </div>

        <!-- Ticket Information -->
        <div class="mb-4">
          <div class="d-flex align-items-center mb-3">
            <svg width="1.5rem" height="1.5rem" class="me-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
            </svg>
            <span class="fw-medium text-secondary">Ticket número #{{ checkedInSuccess.ticket.identificationNumber }}</span>
          </div>
          
          <h3 class="h4 fw-bold text-dark mb-1">{{ checkedInSuccess.ticket.buyer || 'Nome do Comprador' }}</h3>
          <p class="text-muted mb-1">{{ checkedInSuccess.ticket.buyerDocument || '000.000.000-00' }}</p>
          <p class="text-muted mb-1">{{ checkedInSuccess.ticket.location || 'Local' }}</p>
          <p class="text-muted mb-0">{{ checkedInSuccess.ticket.description }}</p>
        </div>

        <!-- Event Information -->
        <div>
          <div class="d-flex align-items-center mb-3">
            <svg width="1.5rem" height="1.5rem" class="me-2" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/>
            </svg>
            <span class="fw-medium text-secondary">Informações do Evento</span>
          </div>
          
          <h3 class="h4 fw-bold text-dark mb-1">{{ checkedInSuccess.event.name }}</h3>
          <p class="text-muted mb-1">{{ checkedInSuccess.event.venue }}</p>
          <p class="text-muted fw-medium mb-0">{{ formatEventDateTime(checkedInSuccess.event.opening_datetime) }}</p>
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
            // Update the ticket data to show already checked in
            await fetchTicketStatus()
            return
          }
          throw new Error(data.message || 'Failed to process check-in')
        }
        
        if (data.success) {
          checkedInSuccess.value = data
          ticketData.value = null // Hide the confirmation form
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

    const formatDateTime = (dateString) => {
      if (!dateString) return ''
      
      const date = new Date(dateString)
      return date.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
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
      formatDateTime,
      formatDateTimePortuguese,
      formatEventDateTime
    }
  }
}
</script>

<style scoped>
/* Add any custom styles if needed */
</style>