<template>
  <div class="min-vh-100 bg-light py-4 px-3">
    <div class="container" style="max-width: 640px;">
      <!-- Back Button -->
      <div class="mb-3">
        <button @click="goBack" class="btn btn-link text-success p-0 text-decoration-none">
          <i class="fas fa-arrow-left me-2"></i>
          <span class="fw-medium">Voltar</span>
        </button>
      </div>

      <!-- Scanning State -->
      <div v-if="!scannedHash" class="fade-in">
        <!-- Header Card -->
        <div class="bg-white rounded-4 shadow-sm text-center p-4 mb-3">
          <h1 class="h3 fw-bold text-success mb-2">RETIRADA DE KIT</h1>
          <p class="text-muted mb-0 small">Escaneie o QR code do ticket para registrar a retirada do kit</p>
        </div>

        <!-- Camera Preview (if using device camera) -->
        <div v-if="showCamera" class="mb-3">
          <div id="qr-reader-accessory" class="camera-container rounded-4 overflow-hidden shadow-sm"></div>
        </div>

        <!-- QR Code Icon (shown when camera is not active) -->
        <div v-else class="d-flex justify-content-center mb-3">
          <div class="qr-icon-wrapper">
            <svg width="206" height="206" viewBox="0 0 206 206" fill="none" xmlns="http://www.w3.org/2000/svg">
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
          class="btn btn-success btn-lg w-100 rounded-4 fw-semibold py-3"
          type="button"
        >
          <span v-if="scanning" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
          {{ scanning ? 'Escaneando...' : 'Ler QRCODE' }}
        </button>

        <!-- Manual Entry Link -->
        <div class="text-center mt-3">
          <button @click="showManualEntry" class="btn btn-link text-muted text-decoration-none small">
            Inserir código manualmente
          </button>
        </div>
      </div>

      <!-- Manual Entry Modal -->
      <div v-if="showManual" class="modal-overlay fade-in" @click.self="closeManualEntry">
        <div class="modal-content bg-white rounded-4 shadow-lg p-4">
          <h3 class="h5 fw-bold mb-3">Inserir Código Manualmente</h3>
          <input 
            v-model="manualHash" 
            type="text" 
            class="form-control mb-3" 
            placeholder="Cole o código do ticket"
            @keyup.enter="submitManualHash"
          />
          <div class="d-flex gap-2">
            <button @click="closeManualEntry" class="btn btn-outline-secondary flex-fill">
              Cancelar
            </button>
            <button @click="submitManualHash" class="btn btn-success flex-fill" :disabled="!manualHash.trim()">
              Confirmar
            </button>
          </div>
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="error" class="alert alert-warning rounded-4 text-center fade-in mt-3">
        <i class="fas fa-exclamation-triangle me-2"></i>
        <div class="small">{{ error }}</div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Html5Qrcode } from 'html5-qrcode'

export default {
  name: 'QRCodeAccessoryPickup',
  setup() {
    const router = useRouter()
    
    const scanning = ref(false)
    const scannedHash = ref(null)
    const error = ref(null)
    const showCamera = ref(false)
    const showManual = ref(false)
    const manualHash = ref('')
    
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
        html5QrCode = new Html5Qrcode("qr-reader-accessory")
        
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
      
      // If it's a full URL, extract the hash for accessory-pickup
      if (decodedText.includes('/accessory-pickup/')) {
        const parts = decodedText.split('/accessory-pickup/')
        hash = parts[1] || decodedText
      } else if (decodedText.includes('/checkin/')) {
        // Also support check-in URLs as they use the same hash
        const parts = decodedText.split('/checkin/')
        hash = parts[1] || decodedText
      }
      
      // Remove any query parameters
      hash = hash.split('?')[0]
      
      scannedHash.value = hash
      stopCamera()
      
      // Redirect to accessory pickup page with the scanned hash
      router.push({ name: 'TicketAccessoryPickup', params: { hash } })
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
        if (hash.includes('/accessory-pickup/')) {
          const parts = hash.split('/accessory-pickup/')
          hash = parts[1] || hash
        } else if (hash.includes('/checkin/')) {
          const parts = hash.split('/checkin/')
          hash = parts[1] || hash
        }
        
        // Remove any query parameters
        hash = hash.split('?')[0]
        
        router.push({ name: 'TicketAccessoryPickup', params: { hash } })
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
.qr-icon-wrapper {
  width: 206px;
  height: 206px;
  color: #1c1a27;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.camera-container {
  position: relative;
  background: #000;
  width: 100%;
  min-height: 300px;
  max-height: 500px;
}

/* Make camera take more space on mobile */
@media (min-width: 576px) {
  .camera-container {
    aspect-ratio: 4/3;
  }
}

/* Full viewport height on small screens when camera is active */
@media (max-width: 575px) {
  .camera-container {
    min-height: 400px;
  }
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050;
  padding: 1rem;
}

.modal-content {
  max-width: 400px;
  width: 100%;
}

.fade-in {
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

/* Responsive adjustments */
@media (max-width: 575px) {
  .qr-icon-wrapper {
    width: 160px;
    height: 160px;
  }
  
  .qr-icon-wrapper svg {
    width: 100%;
    height: 100%;
  }
}
</style>
