<template>
  <div class="min-h-screen bg-slate-50 text-slate-900">
    <div v-if="isLoading" class="mx-auto max-w-3xl px-6 py-20" role="status">
      <p class="text-lg">Confirmando sua compra...</p>
    </div>
    <section v-else-if="error" class="mx-auto max-w-3xl space-y-5 px-6 py-20" role="alert">
      <h1 class="text-2xl font-semibold">Não foi possível confirmar sua compra</h1>
      <p>{{ error }}</p>
      <button class="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white" @click="loadPurchase">
        Tentar novamente
      </button>
    </section>
    <template v-else-if="purchase">
      <header class="mx-auto max-w-7xl px-6 pb-6 pt-10" aria-live="polite">
        <p class="mb-2 text-sm font-semibold text-emerald-700">Pagamento confirmado</p>
        <h1 class="text-3xl font-semibold">Compra realizada com sucesso</h1>
        <p v-if="needsOwners" class="mt-3 text-slate-600">Agora, confirme os dados dos titulares para receber os ingressos.</p>
      </header>

      <BuyerConfirmation
        v-if="needsOwners"
        :order-hash="purchase.confirmationHash"
        @completed="ownersCompleted"
      />

      <section v-else class="mx-auto max-w-3xl space-y-6 px-6 pb-16">
        <img v-if="purchase.event.eventImageUrl" :src="purchase.event.eventImageUrl" :alt="purchase.event.name" class="max-h-72 w-full rounded-2xl object-cover">
        <div>
          <h2 class="text-2xl font-semibold">{{ purchase.event.name }}</h2>
          <p v-if="purchase.event.venue" class="mt-1 text-slate-600">{{ purchase.event.venue }}</p>
          <p class="mt-4" role="status">{{ emailMessage }}</p>
        </div>
        <article v-for="ticket in purchase.tickets" :key="ticket.identificationNumber" class="flex flex-col gap-6 border-t border-slate-200 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="text-sm text-slate-500">Ingresso #{{ ticket.identificationNumber }}</p>
            <h3 class="mt-1 text-xl font-semibold">{{ ticket.description }}</h3>
            <p v-if="ticket.location" class="mt-2">{{ ticket.location }}</p>
            <p v-if="ticket.table">Mesa {{ ticket.table }}</p>
          </div>
          <img :src="ticket.qrCode" :alt="`QR code do ingresso ${ticket.identificationNumber}`" class="h-48 w-48 self-center">
        </article>
        <RouterLink :to="`/event/${route.params.hash}`" class="inline-block rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white">Voltar ao evento</RouterLink>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useApi } from '@/composables/useApi'
import BuyerConfirmation from './BuyerConfirmation.vue'

const route = useRoute()
const { post } = useApi()
const isLoading = ref(true)
const error = ref('')
const purchase = ref(null)
const ownerEmailResult = ref(null)
const needsOwners = computed(() => purchase.value?.totalTickets > 1 && !purchase.value.isCompleted)
const emailMessage = computed(() => {
  if (ownerEmailResult.value) {
    return ownerEmailResult.value.failed
      ? 'Os ingressos estão disponíveis abaixo. Não foi possível enviar todos os emails; entre em contato com a organização.'
      : 'Os ingressos foram enviados para o email de cada titular. Confira também a caixa de spam.'
  }
  if (purchase.value?.totalTickets > 1) return 'Os ingressos estão disponíveis abaixo. Confira também o email de cada titular.'
  if (purchase.value?.qrEmailSent === true) return 'Seu ingresso foi enviado por email. Confira também a caixa de spam.'
  if (purchase.value?.qrEmailSent === false) return 'Seu ingresso está disponível abaixo. Não foi possível enviar o email; entre em contato com a organização.'
  return 'Seu ingresso está disponível abaixo. O envio por email está sendo processado.'
})

async function loadPurchase() {
  isLoading.value = true
  error.value = ''
  try {
    const response = await post(`/api/public/events/${encodeURIComponent(route.params.hash)}/purchases/${encodeURIComponent(route.params.purchaseId)}/confirm`, {})
    purchase.value = response.purchase
  } catch (err) {
    error.value = err.message || 'Tente novamente ou entre em contato com a organização.'
  } finally {
    isLoading.value = false
  }
}

async function ownersCompleted(result) {
  ownerEmailResult.value = result.qrCodeEmails || result.result?.qrCodeEmails || null
  await loadPurchase()
}

onMounted(loadPurchase)
</script>
