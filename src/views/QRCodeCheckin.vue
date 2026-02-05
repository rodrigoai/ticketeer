<template>
  <div class="min-h-screen bg-slate-50 py-8 px-4">
    <div class="max-w-xl mx-auto space-y-6">
      <!-- Back Button -->
      <div>
        <button @click="goBack" class="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 transition font-medium">
          <i class="fas fa-arrow-left"></i>
          <span>Voltar</span>
        </button>
      </div>

      <!-- Scanning State -->
      <div v-if="!scannedHash" class="animate-fade-in space-y-6">
        <!-- Header Card -->
        <div class="bg-white rounded-3xl shadow-sm p-6 text-center border border-slate-100">
          <h1 class="text-2xl font-bold text-emerald-600 mb-2">CHECKIN</h1>
          <p class="text-slate-500 text-sm">Verifique se os dados a seguir batem com a compra</p>
        </div>

        <!-- Camera Preview (if using device camera) -->
        <div v-if="showCamera" class="rounded-3xl overflow-hidden shadow-lg border border-slate-100 relative bg-black aspect-[4/3]">
          <div id="qr-reader" class="absolute inset-0 w-full h-full"></div>
        </div>

        <!-- QR Code Icon (shown when camera is not active) -->
        <div v-else class="flex justify-center py-4">
          <div class="qr-icon-wrapper text-slate-900 animate-pulse">
            <svg width="206" height="206" viewBox="0 0 206 206" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
              <rect x="103" y="103" width="103" height="103" rx="12" fill="currentColor"/>
              <rect x="116" y="116" width="25" height="25" rx="4" fill="white"/>
              <rect x="155" y="116" width="25" height="25" rx="4" fill="white"/>
              <rect x="116" y="155" width="25" height="25" rx="4" fill="white"/>
              <rect x="155" y="155" width="25" height="25" rx="4" fill="white"/>
              <rect x="20" y="20" width="166" height="166" rx="24" stroke="currentColor" stroke-width="8"/>
              <path d="M60 60L80 80M80 60L60 80" stroke="currentColor" stroke-width="8" stroke-linecap="round"/>
              <path d="M146 60L166 80M166 60L146 80" stroke="currentColor" stroke-width="8" stroke-linecap="round"/>
              <path d="M60 146L80 166" stroke="currentColor" stroke-width="8" stroke-linecap="round"/>
              <rect x="90" y="165" width="26" height="10" rx="5" fill="currentColor"/>
            </svg>
          </div>
        </div>

        <!-- Scan Button -->
        <button 
          @click="startScanning" 
          :disabled="scanning"
          class="w-full rounded-full bg-emerald-500 py-4 text-white text-lg font-semibold shadow-md hover:bg-emerald-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          type="button"
        >
          <span v-if="scanning" class="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
          {{ scanning ? 'Escaneando...' : 'Ler QRCODE' }}
        </button>

        <!-- Manual Entry Link -->
        <div class="text-center">
          <button @click="showManualEntry" class="text-slate-500 hover:text-slate-700 text-sm font-medium underline-offset-4 hover:underline">
            Inserir código manualmente
          </button>
        </div>
      </div>

      <!-- Manual Entry Modal -->
      <div v-if="showManual" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" @click.self="closeManualEntry">
        <div class="bg-white rounded-3xl shadow-xl w-full max-w-sm p-6 space-y-4">
          <h3 class="text-lg font-bold text-slate-900">Inserir Código Manualmente</h3>
          <input 
            v-model="manualHash" 
            type="text" 
            class="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
            placeholder="Cole o código do ticket"
            @keyup.enter="submitManualHash"
          />
          <div class="flex gap-3">
            <button @click="closeManualEntry" class="flex-1 rounded-xl border border-slate-200 py-3 text-slate-600 font-medium hover:bg-slate-50 transition">
              Cancelar
            </button>
            <button @click="submitManualHash" class="flex-1 rounded-xl bg-emerald-500 py-3 text-white font-medium hover:bg-emerald-600 transition disabled:opacity-50 disabled:cursor-not-allowed" :disabled="!manualHash.trim()">
              Confirmar
            </button>
          </div>
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="error" class="rounded-3xl bg-amber-50 border border-amber-100 p-4 text-amber-800 text-center animate-fade-in flex items-center justify-center gap-2">
        <i class="fas fa-exclamation-triangle"></i>
        <span class="text-sm font-medium">{{ error }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Html5Qrcode } from 'html5-qrcode'

export default {
  name: 'QRCodeCheckin',
  setup() {
    const router = useRouter()
    
    const scanning = ref(false)
    const scannedHash = ref(null)
    const error = ref(null)
    const showCamera = ref(false)
    const showManual = ref(false)
    const manualHash = ref('')
    const videoElement = ref(null)
    
    let html5QrCode = null
    let stream = null

    const goBack = () => {
      stopCamera()
      router.back()
    }

    const startScanning = async () => {
      try {
        error.value = null
        scanning.value = true
        showCamera.value = true

        // Wait for next tick to ensure DOM element exists
        await new Promise(resolve => setTimeout(resolve, 100))

        // Initialize QR Code scanner
        html5QrCode = new Html5Qrcode("qr-reader")
        
        const config = { fps: 10, qrbox: { width: 250, height: 250 } }
        
        // Request camera permission and start scanning
        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          onScanSuccess,
          onScanError
        )
      } catch (err) {
        console.error('Error starting scanner:', err)
        
        // Provide more specific error messages
        if (err.name === 'NotAllowedError' || err.message?.includes('Permission denied')) {
          error.value = 'Permissão de câmera negada. Por favor, permita o acesso à câmera nas configurações do navegador.'
        } else if (err.name === 'NotFoundError' || err.message?.includes('camera')) {
          error.value = 'Nenhuma câmera encontrada no dispositivo.'
        } else {
          error.value = 'Não foi possível acessar a câmera. Verifique as permissões.'
        }
        
        scanning.value = false
        showCamera.value = false
      }
    }

    const onScanSuccess = (decodedText) => {
      // Extract hash from URL or use directly
      let hash = decodedText
      
      // If it's a full URL, extract the hash
      if (decodedText.includes('/checkin/')) {
        const parts = decodedText.split('/checkin/')
        hash = parts[1] || decodedText
      }
      
      // Remove any query parameters
      hash = hash.split('?')[0]
      
      scannedHash.value = hash
      stopCamera()
      
      // Redirect to check-in page with the scanned hash
      router.push({ name: 'TicketCheckin', params: { hash } })
    }

    const onScanError = (errorMessage) => {
      // Ignore scanning errors (they happen constantly while scanning)
      // console.log('Scan error:', errorMessage)
    }

    const stopCamera = async () => {
      if (html5QrCode) {
        try {
          await html5QrCode.stop()
          html5QrCode.clear()
        } catch (err) {
          console.error('Error stopping scanner:', err)
        }
      }
      
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
      
      showCamera.value = false
      scanning.value = false
    }

    const showManualEntry = () => {
      showManual.value = true
    }

    const closeManualEntry = () => {
      showManual.value = false
      manualHash.value = ''
    }

    const submitManualHash = () => {
      if (manualHash.value.trim()) {
        let hash = manualHash.value.trim()
        
        // If it's a full URL, extract the hash
        if (hash.includes('/checkin/')) {
          const parts = hash.split('/checkin/')
          hash = parts[1] || hash
        }
        
        // Remove any query parameters
        hash = hash.split('?')[0]
        
        router.push({ name: 'TicketCheckin', params: { hash } })
      }
    }

    onMounted(() => {
      // Camera permission must be requested via user interaction
      // Auto-starting can cause permission issues
    })

    onUnmounted(() => {
      stopCamera()
    })

    return {
      scanning,
      scannedHash,
      error,
      showCamera,
      showManual,
      manualHash,
      videoElement,
      goBack,
      startScanning,
      showManualEntry,
      closeManualEntry,
      submitManualHash
    }
  }
}
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
