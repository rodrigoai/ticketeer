import { Html5QrcodeSupportedFormats } from 'html5-qrcode'

export const qrScannerOptions = {
  formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
  experimentalFeatures: {
    useBarCodeDetectorIfSupported: true
  }
}

export const createQrScannerConfig = () => ({
  fps: 15,
  aspectRatio: 1,
  videoConstraints: {
    facingMode: { ideal: 'environment' },
    width: { ideal: 1280 },
    height: { ideal: 720 },
    advanced: [{ focusMode: 'continuous' }]
  },
  qrbox: (viewfinderWidth, viewfinderHeight) => {
    const minEdge = Math.min(viewfinderWidth, viewfinderHeight)
    const edge = Math.floor(Math.min(Math.max(minEdge * 0.82, 260), 420))

    return { width: edge, height: edge }
  }
})
