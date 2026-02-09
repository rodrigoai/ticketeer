<script setup lang="ts">
import { useAuth0 } from '@auth0/auth0-vue';
import { useRouter } from 'vue-router';
import { watchEffect, ref } from 'vue';

const { loginWithRedirect, isAuthenticated, isLoading } = useAuth0();
const router = useRouter();

const isTermsModalOpen = ref(false);

const toggleTermsModal = () => {
  isTermsModalOpen.value = !isTermsModalOpen.value;
};

watchEffect(() => {
  if (!isLoading.value && isAuthenticated.value) {
    router.push('/dashboard');
  }
});

const handleLogin = () => {
  loginWithRedirect();
};

const handleSignUp = () => {
  loginWithRedirect({
    authorizationParams: {
      screen_hint: 'signup',
    },
  });
};
</script>

<template>
  <div class="landing-page bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 italic-primary transition-colors duration-300">
    <!-- Custom Landing Page Header -->
    <header class="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-20">
          <div class="flex items-center gap-2">
            <div class="w-10 h-10 bg-[#635BFF] rounded-lg flex items-center justify-center">
              <span class="material-icons-round text-white">confirmation_number</span>
            </div>
            <span class="text-2xl font-extrabold tracking-tight text-[#635BFF]">Ticketeer</span>
          </div>

          <div class="flex items-center gap-4">
            <div v-if="!isLoading" class="flex items-center gap-3">
              <button 
                @click="handleLogin"
                class="px-5 py-2 text-sm font-semibold text-slate-600 hover:text-[#635BFF] transition"
              >
                Entrar
              </button>
              <button 
                @click="handleSignUp"
                class="px-5 py-2.5 bg-[#635BFF] text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-200 hover:scale-[1.02] active:scale-[0.98] transition"
              >
                Criar Conta
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Hero Section -->
    <section class="pt-40 pb-20 px-4">
      <div class="max-w-7xl mx-auto">
        <div class="grid lg:grid-cols-2 gap-12 items-center">
          <div class="space-y-8">
            <div class="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-[#635BFF] rounded-full text-sm font-semibold">
              <span class="flex h-2 w-2 rounded-full bg-[#635BFF] animate-pulse"></span>
              Gestão Inteligente de Eventos
            </div>
            <h1 class="text-5xl lg:text-7xl font-extrabold tracking-tight leading-tight">
              A plataforma completa para <span class="text-[#635BFF] italic">vender ingressos</span> e operar eventos.
            </h1>
            <p class="text-xl text-slate-600 leading-relaxed max-w-xl">
              Tudo sob controle: do mapa de mesas ao check-in facial. Menos taxas, mais tecnologia e total liberdade para o organizador.
            </p>
            <div class="flex flex-col sm:flex-row gap-4">
              <button @click="handleSignUp" class="px-8 py-4 bg-[#635BFF] text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2">
                Criar meu evento agora
                <span class="material-icons-round">rocket_launch</span>
              </button>
              <a 
                href="https://api.whatsapp.com/send?phone=5512997560110" 
                target="_blank"
                class="px-8 py-4 bg-white text-slate-800 font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition flex items-center justify-center gap-2"
              >
                Falar com especialista
              </a>
            </div>
          </div>
          <div class="relative">
            <div class="absolute -inset-4 bg-indigo-100/50 rounded-3xl blur-3xl -z-10"></div>
            <div class="bg-white p-6 rounded-2xl shadow-2xl border border-slate-200">
              <div class="flex items-center justify-between mb-8">
                <div class="flex gap-2">
                  <div class="w-3 h-3 rounded-full bg-red-400"></div>
                  <div class="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div class="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <div class="text-xs font-mono text-slate-400">dashboard_preview.v3</div>
              </div>
              <div class="space-y-6">
                <div class="grid grid-cols-2 gap-4">
                  <div class="p-4 bg-slate-50 rounded-xl">
                    <p class="text-xs text-slate-500 uppercase font-bold tracking-wider">Vendas Hoje</p>
                    <h3 class="text-2xl font-bold text-[#635BFF]">R$ 17.110,00</h3>
                  </div>
                  <div class="p-4 bg-slate-50 rounded-xl">
                    <p class="text-xs text-slate-500 uppercase font-bold tracking-wider">Tickets</p>
                    <h3 class="text-2xl font-bold text-green-500">62 vendidos</h3>
                  </div>
                </div>
                <div class="h-48 bg-slate-50 rounded-xl overflow-hidden relative">
                  <div class="absolute bottom-0 left-0 right-0 h-3/4 flex items-end justify-between px-6 pb-4">
                    <div class="w-8 bg-indigo-200 h-20 rounded-t-lg"></div>
                    <div class="w-8 bg-indigo-300 h-32 rounded-t-lg"></div>
                    <div class="w-8 bg-indigo-100 h-16 rounded-t-lg"></div>
                    <div class="w-8 bg-indigo-500 h-40 rounded-t-lg"></div>
                    <div class="w-8 bg-indigo-200 h-24 rounded-t-lg"></div>
                    <div class="w-8 bg-indigo-400 h-36 rounded-t-lg"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Why Section -->
    <section class="py-24 bg-slate-900 text-white overflow-hidden relative">
      <div class="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-indigo-500/20 rounded-full blur-[120px]"></div>
      <div class="max-w-7xl mx-auto px-4 relative z-10">
        <div class="grid lg:grid-cols-2 gap-20 items-center">
          <div>
            <h2 class="text-4xl font-bold mb-6 leading-tight">
              Chega de plataformas que <span class="text-red-400 italic">atrapalham</span> seu evento
            </h2>
            <ul class="space-y-6">
              <li class="flex items-start gap-4">
                <span class="material-icons-round text-red-400 mt-1">block</span>
                <div>
                  <h4 class="font-bold text-lg">Taxas abusivas que cortam seu lucro</h4>
                  <p class="text-slate-400">Por que pagar 10% se você pode investir esse dinheiro em marketing?</p>
                </div>
              </li>
              <li class="flex items-start gap-4">
                <span class="material-icons-round text-red-400 mt-1">block</span>
                <div>
                  <h4 class="font-bold text-lg">Dashboards lentos e confusos</h4>
                  <p class="text-slate-400">Informação que chega atrasada impede tomadas de decisão rápidas.</p>
                </div>
              </li>
              <li class="flex items-start gap-4">
                <span class="material-icons-round text-red-400 mt-1">block</span>
                <div>
                  <h4 class="font-bold text-lg">Check-in manual e demorado</h4>
                  <p class="text-slate-400">Fila na entrada é a pior primeira impressão que seu cliente pode ter.</p>
                </div>
              </li>
            </ul>
          </div>
          <div class="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-sm">
            <h3 class="text-2xl font-bold mb-8 flex items-center gap-3">
              <span class="material-icons-round text-green-400">verified</span>
              A Nova Experiência Ticketeer
            </h3>
            <div class="grid grid-cols-1 gap-6">
              <div class="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
                <div class="w-12 h-12 bg-green-400/20 text-green-400 rounded-lg flex items-center justify-center">
                  <span class="material-icons-round">payments</span>
                </div>
                <div>
                  <p class="font-bold">Checkout Instantâneo</p>
                  <p class="text-xs text-slate-400">Conversão 3x maior que a média do mercado.</p>
                </div>
              </div>
              <div class="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
                <div class="w-12 h-12 bg-indigo-400/20 text-indigo-400 rounded-lg flex items-center justify-center">
                  <span class="material-icons-round">query_stats</span>
                </div>
                <div>
                  <p class="font-bold">Dados em Tempo Real</p>
                  <p class="text-xs text-slate-400">Acompanhe cada centavo e cada entrada no exato momento.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section id="features" class="py-24 px-4 bg-slate-50">
      <div class="max-w-7xl mx-auto">
        <div class="text-center mb-16">
          <h2 class="text-4xl font-extrabold mb-4 tracking-tight">Recursos poderosos para sua gestão</h2>
          <p class="text-slate-600 max-w-2xl mx-auto">Desenvolvemos cada ferramenta pensando no dia a dia real de quem faz o evento acontecer.</p>
        </div>
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div class="group bg-white p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 hover:-translate-y-2 transition duration-300">
            <div class="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#635BFF] group-hover:text-white transition-colors">
              <span class="material-icons-round">local_activity</span>
            </div>
            <h3 class="text-xl font-bold mb-4">Venda de Ingressos</h3>
            <p class="text-slate-600 leading-relaxed">Páginas de vendas otimizadas para mobile e integradas com redes sociais para máxima conversão.</p>
          </div>
          <div class="group bg-white p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 hover:-translate-y-2 transition duration-300">
            <div class="w-14 h-14 bg-green-50 text-green-600 rounded-xl flex items-center justify-center mb-6 group-hover:bg-green-600 group-hover:text-white transition-colors">
              <span class="material-icons-round">account_balance_wallet</span>
            </div>
            <h3 class="text-xl font-bold mb-4">Nova.Money Integration</h3>
            <p class="text-slate-600 leading-relaxed">Liquidação automática e taxas reduzidas. Receba seus valores com rapidez e segurança total.</p>
          </div>
          <div class="group bg-white p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 hover:-translate-y-2 transition duration-300">
            <div class="w-14 h-14 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <span class="material-icons-round">table_restaurant</span>
            </div>
            <h3 class="text-xl font-bold mb-4">Mapas de Mesas</h3>
            <p class="text-slate-600 leading-relaxed">Crie mapas interativos para que seu público escolha o lugar exato onde quer ficar.</p>
          </div>
          <div class="group bg-white p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 hover:-translate-y-2 transition duration-300">
            <div class="w-14 h-14 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center mb-6 group-hover:bg-orange-600 group-hover:text-white transition-colors">
              <span class="material-icons-round">qr_code_scanner</span>
            </div>
            <h3 class="text-xl font-bold mb-4">Check-in Ultra Rápido</h3>
            <p class="text-slate-600 leading-relaxed">App dedicado para leitura de QR Codes em segundos, mesmo em ambientes com baixa conexão.</p>
          </div>
          <div class="group bg-white p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 hover:-translate-y-2 transition duration-300">
            <div class="w-14 h-14 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-6 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <span class="material-icons-round">inventory_2</span>
            </div>
            <h3 class="text-xl font-bold mb-4">Controle de Kit</h3>
            <p class="text-slate-600 leading-relaxed">Gerencie a entrega de camisas, brindes e pulseiras de forma organizada e digitalizada.</p>
          </div>
          <div class="group bg-white p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 hover:-translate-y-2 transition duration-300">
            <div class="w-14 h-14 bg-pink-50 text-pink-600 rounded-xl flex items-center justify-center mb-6 group-hover:bg-pink-600 group-hover:text-white transition-colors">
              <span class="material-icons-round">wallet</span>
            </div>
            <h3 class="text-xl font-bold mb-4">Ingressos Digitais</h3>
            <p class="text-slate-600 leading-relaxed">Apple Wallet, Google Pay e PDFs dinâmicos para facilitar a vida do seu cliente final.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- For Who Section -->
    <section class="py-24 bg-white">
      <div class="max-w-7xl mx-auto px-4">
        <h2 class="text-4xl font-extrabold text-center mb-16">Para quem é o Ticketeer?</h2>
        <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div class="bg-slate-50 p-6 rounded-2xl border border-slate-200">
            <img alt="Shows e Concertos" class="w-full h-40 object-cover rounded-xl mb-6 shadow-md" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDrvonSj9yxLrmLCHP6wOZXbW3hf_VWO30dzHfHnEh7C8qj-ytLWZFvokLUHjON4Uw6agJeEpzLHxMkDB4qShJqLUo9WR_SO89M_fA2mQTSZ5CHslKphgpsuwXsJNedIxhInXPjD9cJ-4kWYqngDkVi1c8sYZ42Q9NtgfBt2L3TEgdTCDMNtUToaNhlIVznoSyOGgG-TFk2UoehF9L7GYp2gQfIEa1oAhT4A4lZNOVXZDYFD8dMxmpJnJbeqbPUGJHBYjBEKHIRpeU"/>
            <h4 class="font-bold text-lg mb-2">Shows e Festivais</h4>
            <p class="text-sm text-slate-500">Escalabilidade para milhares de acessos simultâneos.</p>
          </div>
          <div class="bg-slate-50 p-6 rounded-2xl border border-slate-200">
            <img alt="Corporativo" class="w-full h-40 object-cover rounded-xl mb-6 shadow-md" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDwxOI52f8MCrW3sGc2ZrZnX1KIV6TkNJ4VE2AXSks2Xb6kVUBmBnIlgj_2cIVgpTWX3o4nPcXwxWEHTKSV_0xnSvPFU7tSeVnAbDlt-ev7RQi26pEG8Dl-q5IrgKK16CvK5kLwlp-hzEkgGAOR0sx7fqgOOYKXqYO3vejQUk3xkKu4GLdherY5Dgip1Lr8J48Ygc7n5AFZQzscqXAUbLVgCbbGfuUubib2nLe5z4yAH8W094EoFpeQWC4u7b5HCR2WV_yG6HETNNU"/>
            <h4 class="font-bold text-lg mb-2">Eventos Corporativos</h4>
            <p class="text-sm text-slate-500">Controle de participantes e emissão automática de certificados.</p>
          </div>
          <div class="bg-slate-50 p-6 rounded-2xl border border-slate-200">
            <img alt="Esportes" class="w-full h-40 object-cover rounded-xl mb-6 shadow-md" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBs2i87xHUUq2thu9UmNOT-hldN9PvoAOZkTBsC43ER7DB-_K3Rwjo8ppV5l5tQf9CZkc4aPpT128a_b3JWyz4KuoCB-QsPZJirB3Wkf7XeJuoMeODA7HLDp14PI2zWk6ByyebT1i46twNTV3RPRKDEIyjvGQg8MXv_eo5-O_QbgpAsxje2Df6MtV1pOw9G4g8Nm9ScptCWi4RrHT4N5qXoTzfRTQlxkdRpTXXjZvi_unwCLgww-oe0DYl6zWFJd_vZeB0zRzxJFlM"/>
            <h4 class="font-bold text-lg mb-2">Corridas e Esportes</h4>
            <p class="text-sm text-slate-500">Gestão de inscrições por categorias e entrega de kits.</p>
          </div>
          <div class="bg-slate-50 p-6 rounded-2xl border border-slate-200">
            <img alt="Social" class="w-full h-40 object-cover rounded-xl mb-6 shadow-md" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA7DKGOmY5L8smzZfKpgylRBQF7JZxy843unbwbK6OZi6xDTGAAsT8sdX395aqxxH9E0MvVjrDg2zho9Plx4_4mxkd1SO3axaaEQiP1pdkDx9otr1hL0jAY6zin_2pwcNuTiUlJbIQIrORu5TjOBeVtTgniRTxdHrqj6eReaceFO-vMRNC7IggXUDt9qbUDZ8Q_oUxFCERZ6qgRUL96NdIRQrCcJNzuOTzGcQVWbMSnZAlnD-0qG9L8IR4cAEhQR4qrjQ2YzifK2BQ"/>
            <h4 class="font-bold text-lg mb-2">Festas e Baladas</h4>
            <p class="text-sm text-slate-500">Listas VIP, promoters e vendas de camarotes exclusivos.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="bg-[#635BFF] pt-24 pb-12 text-white overflow-hidden relative">
      <div class="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] bg-white/10 rounded-full blur-[120px] -z-0"></div>
      <div class="max-w-7xl mx-auto px-4 relative z-10">
        <div class="text-center mb-20">
          <h2 class="text-4xl lg:text-6xl font-extrabold mb-8">Menos taxa. Mais controle.<br/>Mais tranquilidade.</h2>
          <div class="flex flex-col sm:flex-row gap-6 justify-center">
            <button @click="handleSignUp" class="px-10 py-5 bg-white text-[#635BFF] font-bold rounded-2xl shadow-2xl hover:bg-slate-50 transition transform hover:scale-105">
              Criar meu evento agora
            </button>
            <a 
              href="https://api.whatsapp.com/send?phone=5512997560110" 
              target="_blank"
              class="px-10 py-5 bg-[#635BFF] border-2 border-white/30 text-white font-bold rounded-2xl hover:bg-white/10 transition inline-flex items-center justify-center"
            >
              Falar com um especialista
            </a>
          </div>
        </div>
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-12 py-12 border-t border-white/20">
          <div>
            <div class="flex items-center gap-2 mb-6">
              <div class="w-8 h-8 bg-white text-[#635BFF] rounded-lg flex items-center justify-center">
                <span class="material-icons-round text-sm">confirmation_number</span>
              </div>
              <span class="text-xl font-bold">Ticketeer</span>
            </div>
            <p class="text-white/60 text-sm leading-relaxed">
              Líder em soluções tecnológicas para gestão de eventos e bilhetagem inteligente na América Latina.
            </p>
          </div>
          <div>
            <h5 class="font-bold mb-6">Plataforma</h5>
            <ul class="space-y-4 text-white/60 text-sm">
              <li><a class="hover:text-white transition" href="#features">Funcionalidades</a></li>
              <li><a class="hover:text-white transition" href="https://nova.money" target="_blank">Nova.Money</a></li>
            </ul>
          </div>
          <div>
            <h5 class="font-bold mb-6">Suporte</h5>
            <ul class="space-y-4 text-white/60 text-sm">
              <li><a class="hover:text-white transition" href="https://www.nova.money/conteudo/iniciando-com-o-nova" target="_blank">Central de Ajuda</a></li>
              <li><a class="hover:text-white transition" href="https://nova33-4639.postman.co/workspace/My-Workspace~12d056b4-5dfd-4de2-8d4a-ca0fcc862745/collection/5018390-f1c2aea0-3fe3-4800-a3cd-56564fdd3407?action=share&creator=5018390" target="_blank">API para Devs</a></li>
              <li><button @click="toggleTermsModal" class="hover:text-white transition text-left">Termos de Uso</button></li>
            </ul>
          </div>
          <div>
            <h5 class="font-bold mb-6">Redes Sociais</h5>
            <div class="flex gap-4">
              <a class="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition" href="https://www.facebook.com/appnovamoney?_rdc=2&_rdr#" target="_blank">
                <span class="material-icons-round text-lg">facebook</span>
              </a>
              <a class="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition" href="https://www.instagram.com/nova.money.oficial/" target="_blank">
                <span class="material-icons-round text-lg">camera_alt</span>
              </a>
              <a class="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition" href="https://www.linkedin.com/company/42409431/admin/dashboard/" target="_blank">
                <span class="material-icons-round text-lg">work</span>
              </a>
            </div>
          </div>
        </div>
        <div class="text-center pt-8 border-t border-white/10 text-white/40 text-xs">
          © 2024 Ticketeer Inc. Todos os direitos reservados.
        </div>
      </div>
    </footer>

    <!-- Termos de Uso Modal -->
    <div v-if="isTermsModalOpen" class="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div @click="toggleTermsModal" class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"></div>
      <div class="bg-white w-full max-w-2xl rounded-3xl shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[80vh]">
        <div class="p-8 border-b border-slate-100 flex justify-between items-center">
          <h3 class="text-2xl font-bold">Termos de Uso</h3>
          <button @click="toggleTermsModal" class="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center transition">
            <span class="material-icons-round text-slate-400">close</span>
          </button>
        </div>
        <div class="p-8 overflow-y-auto prose prose-slate">
          <p class="text-slate-600 leading-relaxed mb-4">
            Bem-vindo ao Ticketeer. Ao utilizar nossa plataforma, você concorda com os seguintes termos:
          </p>
          <h4 class="font-bold text-slate-900 mb-2">1. Uso da Plataforma</h4>
          <p class="text-slate-600 leading-relaxed mb-4">
            O Ticketeer fornece ferramentas para gestão de eventos e venda de ingressos. O organizador é responsável pela veracidade das informações e pela realização do evento.
          </p>
          <h4 class="font-bold text-slate-900 mb-2">2. Taxas e Pagamentos</h4>
          <p class="text-slate-600 leading-relaxed mb-4">
            As taxas aplicáveis são informadas no momento da criação do evento. Os pagamentos são processados de forma segura e os repasses seguem os prazos estabelecidos.
          </p>
          <h4 class="font-bold text-slate-900 mb-2">3. Privacidade e Dados</h4>
          <p class="text-slate-600 leading-relaxed mb-4">
            Seus dados são protegidos conforme nossa Política de Privacidade e a LGPD. Não compartilhamos informações sensíveis com terceiros sem consentimento.
          </p>
          <h4 class="font-bold text-slate-900 mb-2">4. Cancelamento e Reembolsos</h4>
          <p class="text-slate-600 leading-relaxed mb-4">
            A política de reembolso é definida por cada organizador, respeitando o Código de Defesa do Consumidor.
          </p>
          <p class="text-slate-400 text-sm italic mt-8">
            Última atualização: 09 de Fevereiro de 2026.
          </p>
        </div>
        <div class="p-8 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button @click="toggleTermsModal" class="px-8 py-3 bg-[#635BFF] text-white font-bold rounded-xl hover:scale-[1.02] active:scale-[0.98] transition">
            Entendi
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.landing-page {
  font-family: 'Inter', sans-serif;
}

.italic-primary .italic {
  font-style: italic;
}
</style>
