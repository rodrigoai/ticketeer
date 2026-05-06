<template>
  <div class="min-h-screen bg-slate-50 pb-24 lg:pb-0">
    <div class="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 lg:flex-row lg:items-start">
      <div class="min-w-0 flex-1 space-y-8">
        <div v-if="isLoading" class="rounded-3xl border border-slate-100 bg-white px-6 py-10 text-center shadow-md">
          <div class="inline-flex items-center gap-2 text-slate-600">
            <span class="h-4 w-4 rounded-full border-2 border-slate-600 border-t-transparent animate-spin"></span>
            Carregando evento...
          </div>
        </div>

        <div v-else-if="errorMessage" class="rounded-3xl border border-red-200 bg-red-50 px-6 py-10 text-center text-red-700">
          {{ errorMessage }}
        </div>

        <div v-else-if="!event" class="rounded-3xl border border-slate-200 bg-white px-6 py-10 text-center">
          Evento não encontrado.
        </div>

        <template v-else>
          <div class="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-lg">
            <img
              v-if="mobileHeroImageUrl"
              :src="mobileHeroImageUrl"
              :alt="event.title"
              class="h-72 w-full object-cover sm:hidden"
            />
            <img
              v-if="desktopHeroImageUrl"
              :src="desktopHeroImageUrl"
              :alt="event.title"
              class="hidden h-72 w-full object-cover sm:block"
            />
            <div class="space-y-4 p-6">
              <div class="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                <span>{{ event.saleMode === SALE_MODES.CHECKOUT ? 'Checkout' : 'Shopping Cart' }}</span>
                <span v-if="event.saleMode === SALE_MODES.SHOPPING_CART" class="rounded-full bg-slate-100 px-3 py-1 text-[0.65rem] text-slate-600">
                  Reserva de {{ event.reservationExpiresInMinutes }} min
                </span>
              </div>
              <div>
                <h1 class="text-3xl font-semibold text-slate-900">{{ event.title }}</h1>
                <p v-if="event.description" class="mt-2 text-slate-500">{{ event.description }}</p>
              </div>
              <div class="flex flex-wrap gap-4 text-sm text-slate-600">
                <span class="inline-flex items-center gap-2"><i class="fas fa-calendar"></i> {{ formattedDate }}</span>
                <span v-if="event.venue" class="inline-flex items-center gap-2"><i class="fas fa-map-marker-alt"></i> {{ event.venue }}</span>
              </div>
              <div v-if="event.saleMode === SALE_MODES.CHECKOUT" class="border-t border-slate-100 pt-4 text-sm text-slate-500">
                <div v-if="event.checkoutPageTitle">
                  Página de checkout: <span class="font-semibold text-slate-700">{{ event.checkoutPageTitle }}</span>
                </div>
                <p v-if="!checkoutBaseUrl" class="mt-1 text-xs text-amber-600">Checkout não está configurado para este evento.</p>
              </div>
            </div>
          </div>

          <section v-if="event.eventMapUrl" class="space-y-3">
            <div class="flex items-end justify-between gap-4">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Mapa Do Evento</p>
                <h2 class="mt-1 text-xl font-semibold text-slate-900">Veja a disposição do espaço</h2>
              </div>
              <button
                type="button"
                class="hidden rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 sm:inline-flex"
                @click="openMapPreview"
              >
                Ampliar mapa
              </button>
            </div>

            <button
              type="button"
              class="group block w-full overflow-hidden rounded-[2rem] bg-white p-3 text-left shadow-lg ring-1 ring-slate-200/70 transition hover:shadow-xl"
              @click="openMapPreview"
            >
              <div class="overflow-hidden rounded-[1.5rem] bg-slate-100">
                <img
                  :src="event.eventMapUrl"
                  :alt="`${event.title} map`"
                  class="h-auto w-full object-contain md:h-[220px] md:object-cover md:object-top"
                >
              </div>
              <div class="flex items-center justify-between gap-3 px-2 pb-1 pt-3 text-sm text-slate-500">
                <span>Toque para ampliar e ver os detalhes do mapa.</span>
                <span class="inline-flex items-center gap-2 font-semibold text-slate-700">
                  Abrir
                  <i class="fas fa-expand-alt text-xs"></i>
                </span>
              </div>
            </button>
          </section>

          <section v-if="event.saleMode === SALE_MODES.CHECKOUT" class="space-y-4">
            <div class="flex items-center justify-between">
              <h2 class="text-xl font-semibold text-slate-900">Ingressos</h2>
              <span v-if="ticketGroups.length" class="text-xs text-slate-500">{{ ticketGroups.length }} opção(ões)</span>
            </div>

            <div v-if="ticketGroups.length === 0" class="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-8 text-center text-slate-500">
              Nenhum ingresso disponível para venda no momento.
            </div>

            <div v-else class="grid gap-4">
              <div
                v-for="group in ticketGroups"
                :key="group.key"
                class="relative overflow-hidden rounded-2xl border border-slate-100 bg-white px-6 py-5 shadow-sm"
              >
                <span
                  class="absolute inset-y-0 left-0 w-2"
                  :style="{ backgroundColor: resolveGroupColor(group.color) }"
                ></span>
                <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div class="pl-3">
                    <div class="flex flex-wrap items-center gap-2">
                      <h3 class="text-lg font-semibold text-slate-900">{{ group.description }}</h3>
                      <span
                        v-if="group.activePricingTier"
                        class="rounded-full bg-amber-100 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-amber-700"
                      >
                        {{ group.activePricingTier.name }}
                      </span>
                    </div>
                    <p v-if="group.tables?.length" class="text-sm text-slate-500">Mesas {{ group.tables.join(', ') }}</p>
                    <p v-if="group.activePrice !== null" class="text-sm text-slate-500">Valor: {{ formatCurrency(group.activePrice) }}</p>
                  </div>
                  <div class="flex flex-wrap items-center gap-4">
                    <div class="text-sm text-slate-500" v-if="group.availableCount !== null">
                      {{ group.availableCount }} disponível(is)
                    </div>
                    <a
                      class="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold shadow-md transition"
                      :class="group.canBuy ? 'bg-primary-600 text-white hover:bg-primary-500' : 'bg-slate-200 text-slate-500 cursor-not-allowed'"
                      :href="group.canBuy ? group.checkoutUrl : undefined"
                      :aria-disabled="!group.canBuy"
                    >
                      <i class="fas fa-ticket-alt"></i> Comprar
                    </a>
                  </div>
                </div>
                <p v-if="group.availableCount === 0" class="mt-3 text-xs text-amber-600">Esgotado</p>
              </div>
            </div>
          </section>

          <section v-else class="space-y-6">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-xl font-semibold text-slate-900">Selecione seus lugares</h2>
                <p class="text-sm text-slate-500">Escolha um ou mais ingressos disponíveis. O carrinho é atualizado automaticamente.</p>
              </div>
              <span class="text-xs text-slate-500">{{ shoppingCartGroups.length }} grupo(s)</span>
            </div>

            <div v-if="shoppingCartGroups.length === 0" class="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-8 text-center text-slate-500">
              Nenhum ingresso disponível para venda no momento.
            </div>

            <div v-else class="space-y-5">
              <div
                v-for="group in shoppingCartGroups"
                :key="group.key"
                class="relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-5 shadow-sm"
              >
                <span
                  class="absolute inset-y-0 left-0 w-2"
                  :style="{ backgroundColor: resolveGroupColor(group.color) }"
                ></span>
                <button
                  type="button"
                  class="flex w-full items-center justify-between gap-4 pl-3 text-left"
                  @click="toggleGroupExpansion(group.key)"
                >
                  <div>
                    <div class="flex flex-wrap items-center gap-2">
                      <h3 class="text-lg font-semibold text-slate-900">{{ group.description }}</h3>
                      <span
                        v-if="group.activePricingTier"
                        class="rounded-full bg-amber-100 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-amber-700"
                      >
                        {{ group.activePricingTier.name }}
                      </span>
                    </div>
                    <p class="text-sm text-slate-500">
                      <span class="block sm:inline">{{ group.tabled ? 'Venda por mesa' : 'Venda por ingresso' }}</span>
                      <span class="hidden sm:inline mx-2">•</span>
                      <span class="block sm:inline">{{ group.availableCount }} disponível(is)</span>
                    </p>
                  </div>
                  <div class="flex items-center gap-3">
                    <div class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      {{ group.tabled ? `${group.totalCount} mesa(s)` : `${group.seatCount} assento(s)` }}
                    </div>
                    <span class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50">
                      <i :class="expandedGroupKeys.includes(group.key) ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"></i>
                    </span>
                  </div>
                </button>

                <div v-if="expandedGroupKeys.includes(group.key)" class="mt-4 grid grid-cols-2 gap-3 pl-3 xl:grid-cols-4">
                  <button
                    v-for="unit in group.units"
                    :key="unit.key"
                    type="button"
                    class="rounded-2xl border px-4 py-3 text-left transition"
                    :class="ticketUnitClass(unit)"
                    :disabled="!unit.isAvailable || isSubmittingCart"
                    @click="toggleSelectionUnit(unit)"
                  >
                    <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p class="text-xs font-semibold uppercase tracking-[0.2em]">{{ unit.label }}</p>
                        <p class="mt-1 text-sm font-semibold">{{ unit.subtitle }}</p>
                        <p v-if="unit.detailLine" class="text-sm font-semibold">{{ unit.detailLine }}</p>
                      </div>
                      <span class="text-[0.65rem] font-semibold uppercase sm:text-right">
                        {{ unitStatusLabel(unit) }}
                      </span>
                    </div>
                    <p class="mt-2 text-xs opacity-80">{{ formatCurrency(unit.totalPrice) }}</p>
                    <p v-if="unit.locationLabel" class="mt-1 text-xs opacity-80">{{ unit.locationLabel }}</p>
                  </button>
                </div>
              </div>
            </div>
          </section>
        </template>
      </div>

      <aside v-if="event && event.saleMode === SALE_MODES.SHOPPING_CART" class="hidden w-full shrink-0 lg:sticky lg:top-6 lg:block lg:w-[360px]">
        <div class="space-y-5 rounded-3xl border border-slate-100 bg-white p-5 shadow-lg">
          <div>
            <h2 class="text-xl font-semibold text-slate-900">Seu carrinho</h2>
            <p class="mt-1 text-sm text-slate-500">Revise os ingressos selecionados e informe seus dados para continuar.</p>
          </div>

          <div v-if="cartError" class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {{ cartError }}
          </div>

          <div v-if="cartSuccessMessage" class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {{ cartSuccessMessage }}
          </div>

          <div v-if="selectedTickets.length === 0" class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            Nenhum ingresso selecionado ainda.
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="unit in selectedUnits"
              :key="unit.key"
              class="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
            >
              <div>
                <p class="text-sm font-semibold text-slate-900">{{ unit.description }}</p>
                <p class="text-xs text-slate-500">{{ unit.subtitle }}</p>
                <p class="mt-1 text-sm text-slate-700">{{ formatCurrency(unit.totalPrice) }}</p>
              </div>
              <button
                type="button"
                class="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-white"
                @click="removeSelectionUnit(unit.key)"
              >
                Remover
              </button>
            </div>
          </div>

            <div class="space-y-3 border-t border-slate-100 pt-4">
            <div class="flex items-center justify-between text-sm text-slate-500">
              <span>Total de ingressos</span>
              <span>{{ selectedTickets.length }}</span>
            </div>
            <div class="flex items-center justify-between text-sm text-slate-500">
              <span>Itens no carrinho</span>
              <span>{{ selectedUnits.length }}</span>
            </div>
            <div class="flex items-center justify-between text-base font-semibold text-slate-900">
              <span>Total</span>
              <span>{{ formatCurrency(cartTotal) }}</span>
            </div>
          </div>

          <div class="space-y-4 border-t border-slate-100 pt-4">
            <div>
              <label class="mb-2 block text-sm font-semibold text-slate-700">Nome</label>
              <input
                v-model="customer.name"
                type="text"
                class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-primary-500 focus:ring-primary-500"
                placeholder="Seu nome completo"
              >
            </div>
            <div>
              <label class="mb-2 block text-sm font-semibold text-slate-700">E-mail</label>
              <input
                v-model="customer.email"
                type="email"
                class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-primary-500 focus:ring-primary-500"
                placeholder="voce@email.com"
              >
            </div>
            <div>
              <label class="mb-2 block text-sm font-semibold text-slate-700">Telefone</label>
              <input
                :value="customer.phone"
                type="tel"
                class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-primary-500 focus:ring-primary-500"
                placeholder="(11) 99999-9999"
                @input="handlePhoneInput"
              >
            </div>
          </div>

          <button
            type="button"
            class="inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold shadow-md transition disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            :class="canSubmitCart ? 'bg-primary-600 text-white hover:bg-primary-500' : 'bg-slate-200 text-slate-500'"
            :disabled="!canSubmitCart || isSubmittingCart"
            @click="submitCart"
          >
            <span v-if="isSubmittingCart" class="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
            <i v-else class="fas fa-lock"></i>
            {{ isSubmittingCart ? 'Preparando pagamento...' : 'Pagar' }}
          </button>
        </div>
      </aside>
    </div>

    <Teleport to="body">
      <div
        v-if="event && event.saleMode === SALE_MODES.SHOPPING_CART"
        class="lg:hidden"
      >
        <div class="pointer-events-none fixed inset-x-0 bottom-0 z-40 p-4">
          <div class="pointer-events-auto flex items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white/95 px-4 py-3 shadow-2xl backdrop-blur">
            <div class="min-w-0">
              <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Carrinho</p>
              <p class="text-sm font-semibold text-slate-900">{{ selectedUnits.length }} item(ns) • {{ formatCurrency(cartTotal) }}</p>
            </div>
            <button
              type="button"
              class="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
              :disabled="isSubmittingCart"
              @click="openMobileCart"
            >
              <i class="fas fa-shopping-cart"></i>
              Ver carrinho
            </button>
          </div>
        </div>

        <div
          v-if="isMobileCartOpen"
          class="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm"
          @click.self="closeMobileCart"
        >
          <div class="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-hidden rounded-t-[2rem] bg-white shadow-2xl">
            <div class="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 class="text-xl font-semibold text-slate-900">Seu carrinho</h2>
                <p class="mt-1 text-sm text-slate-500">Revise os ingressos selecionados e informe seus dados para continuar.</p>
              </div>
              <button
                type="button"
                class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50"
                @click="closeMobileCart"
              >
                <i class="fas fa-times"></i>
              </button>
            </div>

            <div class="max-h-[calc(85vh-88px)] space-y-5 overflow-y-auto px-5 py-5">
              <div v-if="cartError" class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {{ cartError }}
              </div>

              <div v-if="cartSuccessMessage" class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {{ cartSuccessMessage }}
              </div>

              <div v-if="selectedTickets.length === 0" class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Nenhum ingresso selecionado ainda.
              </div>

              <div v-else class="space-y-3">
                <div
                  v-for="unit in selectedUnits"
                  :key="unit.key"
                  class="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
                >
                  <div>
                    <p class="text-sm font-semibold text-slate-900">{{ unit.description }}</p>
                    <p class="text-xs text-slate-500">{{ unit.subtitle }}</p>
                    <p class="mt-1 text-sm text-slate-700">{{ formatCurrency(unit.totalPrice) }}</p>
                  </div>
                  <button
                    type="button"
                    class="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-white"
                    @click="removeSelectionUnit(unit.key)"
                  >
                    Remover
                  </button>
                </div>
              </div>

              <div class="space-y-3 border-t border-slate-100 pt-4">
                <div class="flex items-center justify-between text-sm text-slate-500">
                  <span>Total de ingressos</span>
                  <span>{{ selectedTickets.length }}</span>
                </div>
                <div class="flex items-center justify-between text-sm text-slate-500">
                  <span>Itens no carrinho</span>
                  <span>{{ selectedUnits.length }}</span>
                </div>
                <div class="flex items-center justify-between text-base font-semibold text-slate-900">
                  <span>Total</span>
                  <span>{{ formatCurrency(cartTotal) }}</span>
                </div>
              </div>

              <div class="space-y-4 border-t border-slate-100 pt-4">
                <div>
                  <label class="mb-2 block text-sm font-semibold text-slate-700">Nome</label>
                  <input
                    v-model="customer.name"
                    type="text"
                    class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-primary-500 focus:ring-primary-500"
                    placeholder="Seu nome completo"
                  >
                </div>
                <div>
                  <label class="mb-2 block text-sm font-semibold text-slate-700">E-mail</label>
                  <input
                    v-model="customer.email"
                    type="email"
                    class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-primary-500 focus:ring-primary-500"
                    placeholder="voce@email.com"
                  >
                </div>
                <div>
                  <label class="mb-2 block text-sm font-semibold text-slate-700">Telefone</label>
                  <input
                    :value="customer.phone"
                    type="tel"
                    class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-primary-500 focus:ring-primary-500"
                    placeholder="(11) 99999-9999"
                    @input="handlePhoneInput"
                  >
                </div>
              </div>

              <button
                type="button"
                class="inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold shadow-md transition disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                :class="canSubmitCart ? 'bg-primary-600 text-white hover:bg-primary-500' : 'bg-slate-200 text-slate-500'"
                :disabled="!canSubmitCart || isSubmittingCart"
                @click="submitCart"
              >
                <span v-if="isSubmittingCart" class="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                <i v-else class="fas fa-lock"></i>
                {{ isSubmittingCart ? 'Preparando pagamento...' : 'Pagar' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="isMapPreviewOpen && event?.eventMapUrl"
        class="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm"
        @click.self="closeMapPreview"
      >
        <button
          type="button"
          class="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
          @click="closeMapPreview"
        >
          <i class="fas fa-times"></i>
        </button>
        <img
          :src="event.eventMapUrl"
          :alt="`${event.title} map preview`"
          class="max-h-[90vh] w-full max-w-6xl object-contain"
        >
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '@/composables/useApi'
import { formatPhoneMask, isCustomerInfoValid, sumCartTickets } from '@/utils/cart'

const SALE_MODES = {
  CHECKOUT: 'checkout',
  SHOPPING_CART: 'shopping_cart'
}

const route = useRoute()
const { get, post } = useApi()

const event = ref(null)
const checkoutBaseUrl = ref('')
const tickets = ref([])
const ticketGroupsFromApi = ref([])
const isLoading = ref(false)
const errorMessage = ref('')
const isSubmittingCart = ref(false)
const cartError = ref('')
const cartSuccessMessage = ref('')
const selectedUnitKeys = ref([])
const expandedGroupKeys = ref([])
const isMobileCartOpen = ref(false)
const isMapPreviewOpen = ref(false)
const customer = ref({
  name: '',
  email: '',
  phone: ''
})

const formattedDate = computed(() => {
  if (!event.value?.date) return ''
  try {
    return new Date(event.value.date).toLocaleString('pt-BR')
  } catch (error) {
    return event.value.date
  }
})

const desktopHeroImageUrl = computed(() => {
  return event.value?.eventImageUrl || event.value?.mobileEventImageUrl || ''
})

const mobileHeroImageUrl = computed(() => {
  return event.value?.mobileEventImageUrl || event.value?.eventImageUrl || ''
})

const formatCurrency = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return ''
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value))
}

const resolveGroupColor = (value) => {
  const normalized = String(value || '').trim()
  return /^#[0-9A-Fa-f]{6}$/.test(normalized) ? normalized : '#cbd5e1'
}

const encodeMetaValue = (value) => {
  if (value === null || value === undefined) return ''
  return btoa(String(value)).replace(/=+$/, '')
}

const buildCheckoutUrl = (baseUrl, eventId, tableNumber) => {
  if (!baseUrl || !eventId) return ''
  const params = new URLSearchParams()
  params.set('meta.eventId', encodeMetaValue(eventId))
  if (tableNumber !== null && tableNumber !== undefined) {
    params.set('meta.tableNumber', encodeMetaValue(tableNumber))
  }
  return `${baseUrl}?${params.toString()}`
}

const ticketGroups = computed(() => {
  if (ticketGroupsFromApi.value.length) {
    return ticketGroupsFromApi.value.map((group) => {
      const groupCheckoutUrl = group.checkoutUrl || buildCheckoutUrl(checkoutBaseUrl.value, event.value?.id, null)
      const canBuy = Boolean(groupCheckoutUrl) && group.availableCount > 0

      return {
        ...group,
        checkoutUrl: groupCheckoutUrl,
        canBuy
      }
    })
  }

  return []
})

const shoppingCartGroups = computed(() => {
  const groups = new Map()

  tickets.value.forEach((ticket) => {
    const key = ticket.description || 'Ticket'
    if (!groups.has(key)) {
      const storedGroup = ticketGroupsFromApi.value.find((group) => group.key === key)
      groups.set(key, {
        key,
        description: ticket.description || 'Ticket',
        price: storedGroup?.activePrice ?? ticket.price ?? 0,
        activePricingTier: storedGroup?.activePricingTier || null,
        color: storedGroup?.color || null,
        totalCount: 0,
        availableCount: 0,
        seatCount: 0,
        tabled: false,
        tickets: []
      })
    }

    const group = groups.get(key)
    group.seatCount += 1
    if (ticket.table !== null && ticket.table !== undefined) {
      group.tabled = true
    }
    group.tickets.push(ticket)
  })

  return Array.from(groups.values())
    .map((group) => {
      const sortedTickets = group.tickets.slice().sort((a, b) => a.identificationNumber - b.identificationNumber)
      const unitsMap = new Map()

      sortedTickets.forEach((ticket) => {
        const unitKey = ticket.table !== null && ticket.table !== undefined
          ? `table:${group.key}:${ticket.table}`
          : `ticket:${ticket.id}`

        if (!unitsMap.has(unitKey)) {
          unitsMap.set(unitKey, {
            key: unitKey,
            description: group.description,
            label: ticket.table !== null && ticket.table !== undefined ? `Mesa ${ticket.table}` : 'Ingresso',
            subtitle: ticket.table !== null && ticket.table !== undefined
              ? `${sortedTickets.filter((item) => item.table === ticket.table).length} lugares`
              : `Assento #${ticket.identificationNumber}`,
            tickets: [],
            totalPrice: 0,
            isAvailable: true,
            isReserved: false,
            locationLabel: ''
          })
        }

        const unit = unitsMap.get(unitKey)
        unit.tickets.push(ticket)
        unit.totalPrice += Number(group.price) || 0
        unit.isAvailable = unit.isAvailable && Boolean(ticket.isAvailable)
        unit.isReserved = unit.isReserved || Boolean(ticket.isReserved)
      })

      const units = Array.from(unitsMap.values()).map((unit) => {
        const locations = Array.from(new Set(unit.tickets.map((ticket) => ticket.location).filter(Boolean)))
        return {
          ...unit,
          subtitle: unit.tickets.length > 1
            ? `${unit.tickets.length} lugares`
            : unit.subtitle,
          detailLine: unit.tickets.length > 1
            ? `#${unit.tickets[0].identificationNumber} a #${unit.tickets[unit.tickets.length - 1].identificationNumber}`
            : '',
          locationLabel: locations.length ? locations.join(', ') : ''
        }
      })

      return {
        ...group,
        units,
        totalCount: units.length,
        availableCount: units.filter((unit) => unit.isAvailable).length
      }
    })
    .sort((a, b) => a.tickets[0]?.identificationNumber - b.tickets[0]?.identificationNumber)
})

const allSelectionUnits = computed(() => shoppingCartGroups.value.flatMap((group) => group.units))

const selectedUnits = computed(() => {
  const selectedSet = new Set(selectedUnitKeys.value)
  return allSelectionUnits.value.filter((unit) => selectedSet.has(unit.key))
})

const selectedTickets = computed(() => {
  return selectedUnits.value.flatMap((unit) => unit.tickets)
})

const cartTotal = computed(() => sumCartTickets(selectedTickets.value))
const canSubmitCart = computed(() => selectedTickets.value.length > 0 && isCustomerInfoValid(customer.value))

const ticketUnitClass = (unit) => {
  if (!unit.isAvailable) {
    return 'border-slate-200 bg-slate-100 text-slate-400'
  }

  if (selectedUnitKeys.value.includes(unit.key)) {
    return 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm'
  }

  return 'border-slate-200 bg-white text-slate-700 hover:border-primary-300 hover:bg-primary-50/40'
}

const unitStatusLabel = (unit) => {
  if (unit.isAvailable) return selectedUnitKeys.value.includes(unit.key) ? 'Selecionado' : 'Disponível'
  if (unit.isReserved) return 'Reservado'
  return 'Indisponível'
}

const toggleSelectionUnit = (unit) => {
  if (!unit.isAvailable || isSubmittingCart.value) return

  if (selectedUnitKeys.value.includes(unit.key)) {
    selectedUnitKeys.value = selectedUnitKeys.value.filter((key) => key !== unit.key)
    return
  }

  selectedUnitKeys.value = [...selectedUnitKeys.value, unit.key]
}

const removeSelectionUnit = (unitKey) => {
  selectedUnitKeys.value = selectedUnitKeys.value.filter((key) => key !== unitKey)
}

const toggleGroupExpansion = (groupKey) => {
  if (expandedGroupKeys.value.includes(groupKey)) {
    expandedGroupKeys.value = expandedGroupKeys.value.filter((key) => key !== groupKey)
    return
  }

  expandedGroupKeys.value = [...expandedGroupKeys.value, groupKey]
}

const handlePhoneInput = (event) => {
  customer.value.phone = formatPhoneMask(event.target.value)
}

const openMobileCart = () => {
  isMobileCartOpen.value = true
}

const closeMobileCart = () => {
  isMobileCartOpen.value = false
}

const openMapPreview = () => {
  isMapPreviewOpen.value = true
}

const closeMapPreview = () => {
  isMapPreviewOpen.value = false
}

const loadEvent = async () => {
  isLoading.value = true
  errorMessage.value = ''
  cartError.value = ''
  cartSuccessMessage.value = ''

  try {
    const data = await get(`/api/public/events/${route.params.id}`)
    event.value = data.event || null
    checkoutBaseUrl.value = data.checkoutBaseUrl || ''
    tickets.value = data.tickets || []
    ticketGroupsFromApi.value = data.ticketGroups || []
    expandedGroupKeys.value = []
  } catch (error) {
    errorMessage.value = error?.data?.message || error?.message || 'Failed to load event'
    event.value = null
    tickets.value = []
    ticketGroupsFromApi.value = []
  } finally {
    isLoading.value = false
  }
}

const submitCart = async () => {
  if (!canSubmitCart.value || !event.value) return

  isSubmittingCart.value = true
  cartError.value = ''
  cartSuccessMessage.value = ''

  try {
    const response = await post(`/api/public/events/${event.value.id}/cart-checkout`, {
      ticketIds: selectedTickets.value.map((ticket) => ticket.id),
      customer: customer.value
    })

    const paymentLink = response?.cart?.link
    if (!paymentLink) {
      throw new Error('Payment link not returned by Nova.Money')
    }

    cartSuccessMessage.value = 'Carrinho criado. Redirecionando para o pagamento...'
    window.location.href = paymentLink
  } catch (error) {
    cartError.value = error?.data?.message || error?.message || 'Não foi possível iniciar o pagamento.'
    const previouslySelectedKeys = [...selectedUnitKeys.value]
    await loadEvent()
    selectedUnitKeys.value = allSelectionUnits.value
      .filter((unit) => previouslySelectedKeys.includes(unit.key) && unit.isAvailable)
      .map((unit) => unit.key)
  } finally {
    isSubmittingCart.value = false
  }
}

onMounted(() => {
  loadEvent()
})

watch([isMobileCartOpen, isMapPreviewOpen], ([isCartOpen, isPreviewOpen]) => {
  document.body.style.overflow = isCartOpen || isPreviewOpen ? 'hidden' : ''
})

onBeforeUnmount(() => {
  document.body.style.overflow = ''
})
</script>
