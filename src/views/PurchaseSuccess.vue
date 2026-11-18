<template>
  <div class="purchase-page">
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
      <header class="success-header" aria-live="polite">
        <span class="success-seal" aria-hidden="true">
          <svg viewBox="0 0 64 64" fill="none"><path d="m32 3 6 4 7-1 4 6 7 2 1 7 4 6-3 7 1 7-6 4-2 7-7 1-6 4-7-3-7 1-4-6-7-2-1-7-4-6 3-7-1-7 6-4 2-7 7-1z" fill="currentColor"/><path d="m21 32 8 8 15-19" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </span>
        <p class="success-eyebrow">Pagamento confirmado</p>
        <h1>{{ needsOwners ? 'Sua compra está garantida.' : 'Tudo certo. Nos vemos lá!' }}</h1>
        <p v-if="needsOwners" class="success-description">Falta só um passo: confirme quem vai usar cada ingresso.</p>
        <p v-else class="success-description">{{ emailMessage }}</p>
      </header>

      <BuyerConfirmation
        v-if="needsOwners"
        :order-hash="purchase.confirmationHash"
        @completed="ownersCompleted"
      />

      <section v-else class="ticket-section" aria-label="Seus ingressos">
        <div class="ticket-grid">
          <article v-for="(ticket, index) in purchase.tickets" :key="ticket.identificationNumber" class="ticket" :style="{ '--ticket-index': index }">
            <div class="ticket-cover" :class="{ 'ticket-cover-empty': !eventImage }">
              <img v-if="eventImage" :src="eventImage" :alt="purchase.event.name" class="ticket-event-image">
              <span v-else class="ticket-brand">ticketeer<span>seu próximo encontro</span></span>
            </div>
            <div class="ticket-heading">
              <p class="ticket-category">{{ ticket.description }}</p>
              <h2>{{ purchase.event.name }}</h2>
              <span class="ticket-number">Ingresso #{{ ticket.identificationNumber }}</span>
            </div>
            <div class="ticket-perforation" aria-hidden="true"></div>
            <dl class="ticket-details">
              <div><dt>Data</dt><dd>{{ eventDate }}</dd></div>
              <div class="ticket-detail-right"><dt>Horário</dt><dd>{{ eventTime }}<small>Horário de Brasília</small></dd></div>
              <div><dt>Local</dt><dd>{{ purchase.event.venue || 'A confirmar' }}</dd></div>
              <div class="ticket-detail-right"><dt>Assento / mesa</dt><dd>{{ [ticket.location, ticket.table ? `Mesa ${ticket.table}` : ''].filter(Boolean).join(' · ') || 'Livre' }}</dd></div>
            </dl>
            <div class="ticket-owner">
              <span class="owner-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="3.5"/><path d="M5 21v-3a7 7 0 0 1 14 0v3"/></svg></span>
              <div><p class="owner-label">Titular do ingresso</p><p class="owner-name">{{ ticket.buyer || 'Titular a confirmar' }}</p><p class="owner-email"><span>Email de envio: </span>{{ ticket.buyerEmail || 'Email não informado' }}</p></div>
            </div>
            <div class="ticket-perforation" aria-hidden="true"></div>
            <div class="ticket-admission">
              <img :src="ticket.qrCode" :alt="`QR code do ingresso ${ticket.identificationNumber}`" class="ticket-qr">
              <p>Seu acesso começa aqui.</p>
              <span>Apresente este QR code na entrada do evento.</span>
            </div>
            <div class="ticket-actions">
              <a :href="ticketUrl(ticket, 'pdf')" class="save-pdf" :aria-label="`Salvar ingresso ${ticket.identificationNumber} em PDF`">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M5 16v4h14v-4" stroke-linecap="round" stroke-linejoin="round"/></svg>
                Salvar em PDF
              </a>
              <a v-for="platform in walletPlatforms" :key="platform" :href="ticketUrl(ticket, platform)" class="save-wallet" :aria-label="`Adicionar ingresso ${ticket.identificationNumber} à ${platform === 'apple' ? 'Apple Wallet' : 'Google Wallet'}`">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 6h15v14H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12v2M14 11h7v5h-7z" stroke-linejoin="round"/><circle cx="17" cy="13.5" r=".7" fill="currentColor"/></svg>
                Adicionar à {{ platform === 'apple' ? 'Apple Wallet' : 'Google Wallet' }}
              </a>
            </div>
          </article>
          </div>
        <p class="ticket-offline-note">Salve seu ingresso para acessar mesmo sem internet.</p>
        <RouterLink :to="`/event/${route.params.hash}`" class="back-to-event">Voltar ao evento <span aria-hidden="true">↗</span></RouterLink>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useApi } from '@/composables/useApi'
import BuyerConfirmation from './BuyerConfirmation.vue'
import { getWalletPlatforms } from '@/utils/wallet'

const route = useRoute()
const { post } = useApi()
const isLoading = ref(true)
const error = ref('')
const purchase = ref(null)
const ownerEmailResult = ref(null)
const needsOwners = computed(() => purchase.value?.totalTickets > 1 && !purchase.value.isCompleted)
const eventImage = computed(() => purchase.value?.event.mobileEventImageUrl || purchase.value?.event.eventImageUrl || '')
const dateFormatter = options => {
  const date = purchase.value?.event.date
  return date && !Number.isNaN(new Date(date).getTime())
    ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', ...options }).format(new Date(date))
    : 'A confirmar'
}
const eventDate = computed(() => dateFormatter({ day: '2-digit', month: 'short', year: 'numeric' }))
const eventTime = computed(() => dateFormatter({ hour: '2-digit', minute: '2-digit' }))
const walletPlatforms = computed(() => getWalletPlatforms(typeof navigator === 'undefined' ? {} : navigator, purchase.value?.wallet))
const ticketUrl = (ticket, format) => `/api/public/events/${encodeURIComponent(route.params.hash)}/purchases/${encodeURIComponent(route.params.purchaseId)}/tickets/${ticket.id}/${format}`
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

<style scoped>
.purchase-page { min-height: 100vh; background: #f5f6fb; color: #182033; padding-bottom: 56px; }
.success-header { max-width: 660px; margin: 0 auto; padding: 52px 24px 34px; text-align: center; animation: success-in .45s ease-out both; }
.success-seal { display: grid; place-items: center; width: 80px; height: 80px; margin: 0 auto 18px; border-radius: 50%; background: #e4f8ec; color: #26b65a; }
.success-seal svg { width: 60px; height: 60px; animation: seal-in .5s cubic-bezier(.2,.8,.3,1.3) both; }
.success-eyebrow { font-size: 12px; letter-spacing: .11em; text-transform: uppercase; font-weight: 650; color: #20804a; margin-bottom: 10px; }
.success-header h1 { font-size: clamp(25px, 4vw, 34px); font-weight: 700; letter-spacing: -.035em; line-height: 1.2; margin: 0; }
.success-description { font-size: 14px; line-height: 1.7; max-width: 490px; margin: 14px auto 0; color: #667085; }
.ticket-section { max-width: 1016px; padding: 0 24px; margin: 0 auto; text-align: center; }
.ticket-grid { display: flex; align-items: flex-start; flex-wrap: wrap; justify-content: center; gap: 30px; }
.ticket { width: 100%; max-width: 440px; min-width: 0; padding: 10px 10px 24px; border: 1px solid #e8eaf2; background: white; border-radius: 28px; text-align: left; box-shadow: 0 12px 36px #172b5910; animation: success-in .5s ease-out both; animation-delay: calc(var(--ticket-index) * 60ms); }
.ticket-cover { height: 166px; overflow: hidden; border-radius: 19px; background: #3346cf; }
.ticket-cover-empty { display: grid; place-items: center; }
.ticket-event-image { width: 100%; height: 100%; object-fit: cover; }
.ticket-brand { color: white; font-size: 37px; letter-spacing: -.05em; font-weight: 750; }
.ticket-brand span { display: block; font-size: 11px; font-weight: 450; letter-spacing: .13em; margin-top: 4px; text-align: center; }
.ticket-heading { padding: 24px 20px 20px; }
.ticket-category { color: #5261c4; font-size: 11px; font-weight: 650; letter-spacing: .06em; text-transform: uppercase; margin: 0 0 7px; overflow-wrap: anywhere; }
.ticket-heading h2 { font-size: 23px; font-weight: 700; line-height: 1.3; letter-spacing: -.035em; margin: 0 0 8px; overflow-wrap: anywhere; }
.ticket-number { color: #697386; font-size: 12px; }
.ticket-perforation { position: relative; border-top: 1px dashed #c6cde5; margin: 0 18px; }
.ticket-perforation::before, .ticket-perforation::after { content: ''; position: absolute; top: -12px; height: 23px; width: 23px; background: #f5f6fb; border-radius: 50%; }
.ticket-perforation::before { left: -40px; box-shadow: inset -1px 0 #e8eaf2; }
.ticket-perforation::after { right: -40px; box-shadow: inset 1px 0 #e8eaf2; }
.ticket-details { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr); gap: 22px 20px; margin: 0; padding: 22px 20px; }
.ticket-details dt { color: #697386; font-size: 12px; font-weight: 400; margin-bottom: 5px; }
.ticket-details dd { font-size: 13px; line-height: 1.5; font-weight: 600; margin: 0; overflow-wrap: anywhere; }
.ticket-details small { display: block; font-weight: 400; color: #697386; font-size: 10px; }
.ticket-detail-right { text-align: right; }
.ticket-owner { display: flex; align-items: flex-start; gap: 11px; margin: 0 20px 23px; border-top: 1px solid #f0f1f5; padding-top: 18px; }
.ticket-owner > div { min-width: 0; }
.owner-icon { color: #7c86a8; padding-top: 3px; }
.owner-icon svg { width: 22px; height: 22px; }
.owner-label { color: #697386; font-size: 11px; margin: 0 0 3px; }
.owner-name { font-size: 14px; font-weight: 650; margin: 0 0 3px; overflow-wrap: anywhere; }
.owner-email { font-size: 11px; color: #667085; margin: 0; overflow-wrap: anywhere; line-height: 1.6; }
.owner-email span { color: #697386; }
.ticket-admission { text-align: center; padding: 20px 12px; }
.ticket-qr { display: block; width: 158px; height: 158px; margin: 0 auto 12px; }
.ticket-admission p { font-size: 12px; font-weight: 650; margin: 0 0 4px; }
.ticket-admission > span { font-size: 11px; color: #697386; }
.ticket-actions { padding: 0 20px; display: grid; gap: 9px; }
.ticket-actions a { display: flex; align-items: center; justify-content: center; gap: 9px; min-height: 46px; padding: 10px 14px; border-radius: 11px; font-size: 13px; font-weight: 600; text-decoration: none; transition: background .15s, transform .15s; }
.ticket-actions svg { width: 19px; height: 19px; flex-shrink: 0; }
.save-pdf { color: white; background: #3346cf; }
.save-pdf:hover { color: white; background: #2636ac; transform: translateY(-1px); }
.save-wallet { color: white; background: #17191f; }
.save-wallet:hover { color: white; background: #333641; transform: translateY(-1px); }
.ticket-actions a:focus-visible, .back-to-event:focus-visible { outline: 3px solid #7d8cf3; outline-offset: 4px; }
.ticket-offline-note { margin: 25px 0 16px; font-size: 12px; color: #697386; }
.back-to-event { color: #535d78; font-size: 13px; font-weight: 550; text-decoration: none; }
.back-to-event span { margin-left: 6px; }
@keyframes success-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
@keyframes seal-in { from { transform: scale(.75); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@media (max-width: 480px) { .success-header { padding-top: 32px; padding-bottom: 27px; } .success-seal { width: 70px; height: 70px; } .success-seal svg { width: 53px; height: 53px; } .ticket-section { padding: 0 18px; } .ticket-cover { height: 144px; } .ticket-heading { padding: 21px 16px 18px; } .ticket-heading h2 { font-size: 21px; } .ticket-details { padding: 21px 16px; gap: 20px 12px; } .ticket-owner { margin-left: 16px; margin-right: 16px; } .ticket-actions { padding: 0 16px; } }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }
</style>
