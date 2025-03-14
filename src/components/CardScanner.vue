<template>
  <div class="card-scanner">
    <div class="scanner-container">
      <video ref="videoElement" autoplay playsinline></video>
      <canvas ref="canvasElement" class="scanner-canvas"></canvas>
      
      <div class="guide-container">
        <div class="guide-frame">
          <div class="corner top-left"></div>
          <div class="corner top-right"></div>
          <div class="corner bottom-left"></div>
          <div class="corner bottom-right"></div>
          
          <!-- Added alignment guides -->
          <div class="alignment-guide horizontal-top"></div>
          <div class="alignment-guide horizontal-bottom"></div>
          <div class="alignment-guide vertical-left"></div>
          <div class="alignment-guide vertical-right"></div>
          
          <!-- Added target regions with labels -->
          <div class="target-region photo-region">
            <span class="region-label">Photo</span>
          </div>
          <div class="target-region name-region">
            <span class="region-label">Name</span>
          </div>
          <div class="target-region id-region">
            <span class="region-label">ID</span>
          </div>
          <div class="target-region barcode-region">
            <span class="region-label">Barcode</span>
          </div>
        </div>
        <p class="guide-text">Align your student ID card within the frame</p>
        <p class="guide-tip">Make sure all corners are visible</p>
      </div>
    </div>

    <div v-if="isCameraReady" class="scanner-actions">
      <div class="brightness-controls">
        <button @click="adjustBrightness(-0.1)" class="brightness-btn">
          <i class="fas fa-sun"></i> -
        </button>
        <button @click="adjustBrightness(0.1)" class="brightness-btn">
          <i class="fas fa-sun"></i> +
        </button>
      </div>
      <button @click="capturePhoto" class="capture-btn">
        <i class="fas fa-camera"></i> Take Photo
      </button>
      <p class="scanner-help">Position your ID card within the frame and tap the button to capture</p>
    </div>

    <div v-if="isProcessing" class="processing-overlay">
      <div class="loading-spinner"></div>
      <p>Processing image...</p>
      <p class="processing-step">{{ processingStep }}</p>
    </div>

    <div v-if="!isCameraReady && !error" class="scanner-loading">
      <div class="loading-spinner"></div>
      <p>Initializing camera...</p>
    </div>

    <div v-if="error" class="scanner-error message error">
      <p><i class="fas fa-exclamation-triangle"></i> {{ error }}</p>
      <button @click="initCamera" class="mt-2">Try Again</button>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { extractCardData } from '../utils/cardProcessor'

export default {
  name: 'CardScanner',
  emits: ['card-scanned'],
  
  setup(props, { emit }) {
    const videoElement = ref(null)
    const canvasElement = ref(null)
    const isCameraReady = ref(false)
    const isProcessing = ref(false)
    const error = ref('')
    const processingStep = ref('')
    const brightness = ref(1.0)
    
    let stream = null
    
    const initCamera = async () => {
      isProcessing.value = false
      error.value = ''
      
      try {
        if (stream) {
          stopCamera()
        }
        
        // First try to get the environment camera (rear)
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { exact: 'environment' },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
              advanced: [{ zoom: 2 }] // Try to enable zoom if available
            },
            audio: false
          })
        } catch (err) {
          console.log('Could not access environment camera, trying any camera')
          // If that fails, try any camera
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: 'environment', // Prefer back camera
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            },
            audio: false
          })
        }
        
        if (videoElement.value) {
          videoElement.value.srcObject = stream
          videoElement.value.onloadedmetadata = () => {
            isCameraReady.value = true
            
            // Apply any saved brightness settings
            applyBrightnessFilter()
            
            // Start preview analysis to provide feedback
            startPreviewAnalysis()
          }
        }
      } catch (err) {
        console.error('Error accessing camera:', err)
        error.value = `Unable to access camera: ${err.message}`
      }
    }
    
    const stopCamera = () => {
      if (stream) {
        for (const track of stream.getTracks()) {
          track.stop()
        }
        stream = null
      }
      
      stopPreviewAnalysis()
      isCameraReady.value = false
    }
    
    // Continuous preview analysis to provide feedback
    let previewAnalysisInterval = null
    const startPreviewAnalysis = () => {
      previewAnalysisInterval = setInterval(() => {
        if (videoElement.value && canvasElement.value && isCameraReady.value) {
          const video = videoElement.value
          const canvas = canvasElement.value
          const ctx = canvas.getContext('2d')
          
          // Set canvas size to match video dimensions
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          
          // Draw current video frame to canvas for analysis
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          
          // Perform lightweight card detection to give feedback
          detectCardInPreview(canvas)
        }
      }, 500) // Check every 500ms
    }
    
    const stopPreviewAnalysis = () => {
      if (previewAnalysisInterval) {
        clearInterval(previewAnalysisInterval)
      }
    }
    
    const detectCardInPreview = (canvas) => {
      // Simplified edge detection for preview feedback
      // This would update UI elements to guide the user
      // Implementation would go here
    }
    
    const adjustBrightness = (delta) => {
      brightness.value = Math.max(0.5, Math.min(2.0, brightness.value + delta))
      applyBrightnessFilter()
    }
    
    const applyBrightnessFilter = () => {
      if (videoElement.value) {
        videoElement.value.style.filter = `brightness(${brightness.value})`
      }
    }
    
    const capturePhoto = async () => {
      if (!canvasElement.value || !videoElement.value) return
      
      try {
        isProcessing.value = true
        processingStep.value = "Capturing image..."
        
        // Get current video frame
        const video = videoElement.value
        const canvas = canvasElement.value
        const ctx = canvas.getContext('2d')
        
        // Set canvas size to match video dimensions
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        
        // Draw current video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        
        // Apply any brightness adjustments to the captured image
        if (brightness.value !== 1.0) {
          applyBrightnessToCanvas(canvas, brightness.value)
        }
        
        // Get canvas data
        const imageData = canvas.toDataURL('image/jpeg', 0.95)
        
        // Process the captured image and extract card data with step feedback
        processingStep.value = "Detecting card edges..."
        await new Promise(r => setTimeout(r, 300)) // Visual feedback delay
        
        processingStep.value = "Extracting card regions..."
        await new Promise(r => setTimeout(r, 300))
        
        processingStep.value = "Performing OCR on text fields..."
        const cardData = await extractCardData(imageData, (step) => {
          processingStep.value = step
        })
        
        processingStep.value = "Processing complete!"
        
        // Emit the extracted data
        emit('card-scanned', cardData)
        
        // Stop camera after successful capture
        stopCamera()
      } catch (err) {
        console.error('Error capturing card:', err)
        error.value = 'Error processing image. Please try again.'
        isProcessing.value = false
      }
    }
    
    const applyBrightnessToCanvas = (canvas, value) => {
      const ctx = canvas.getContext('2d')
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, data[i] * value)     // red
        data[i+1] = Math.min(255, data[i+1] * value) // green
        data[i+2] = Math.min(255, data[i+2] * value) // blue
      }
      
      ctx.putImageData(imageData, 0, 0)
    }
    
    onMounted(() => {
      initCamera()
    })
    
    onBeforeUnmount(() => {
      stopCamera()
    })
    
    return {
      videoElement,
      canvasElement,
      isCameraReady,
      isProcessing,
      error,
      processingStep,
      initCamera,
      capturePhoto,
      adjustBrightness
    }
  }
}
</script>

<style scoped>
.card-scanner {
  width: 100%;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.scanner-container {
  position: relative;
  width: 100%;
  height: 0;
  padding-bottom: 75%; /* 4:3 aspect ratio */
  background-color: #000;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 16px;
}

video {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.scanner-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: none; /* Hide canvas visually */
}

.guide-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  pointer-events: none;
}

.guide-frame {
  width: 85%;
  height: 55%;
  border: 2px dashed rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  position: relative;
}

.corner {
  position: absolute;
  width: 20px;
  height: 20px;
  border-color: rgba(255, 255, 255, 0.9);
  border-style: solid;
}

.top-left {
  top: -2px;
  left: -2px;
  border-width: 3px 0 0 3px;
  border-top-left-radius: 4px;
}

.top-right {
  top: -2px;
  right: -2px;
  border-width: 3px 3px 0 0;
  border-top-right-radius: 4px;
}

.bottom-left {
  bottom: -2px;
  left: -2px;
  border-width: 0 0 3px 3px;
  border-bottom-left-radius: 4px;
}

.bottom-right {
  bottom: -2px;
  right: -2px;
  border-width: 0 3px 3px 0;
  border-bottom-right-radius: 4px;
}

/* New alignment guides */
.alignment-guide {
  position: absolute;
  background-color: rgba(255, 255, 255, 0.5);
}

.horizontal-top {
  top: 33%;
  left: 5%;
  right: 5%;
  height: 1px;
}

.horizontal-bottom {
  bottom: 33%;
  left: 5%;
  right: 5%;
  height: 1px;
}

.vertical-left {
  top: 5%;
  bottom: 5%;
  left: 33%;
  width: 1px;
}

.vertical-right {
  top: 5%;
  bottom: 5%;
  right: 33%;
  width: 1px;
}

/* Target regions */
.target-region {
  position: absolute;
  border: 1px solid rgba(0, 255, 255, 0.7);
  border-radius: 4px;
}

.region-label {
  position: absolute;
  top: -20px;
  left: 0;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
}

.photo-region {
  top: 15%;
  left: 5%;
  width: 25%;
  height: 40%;
}

.name-region {
  bottom: 30%;
  left: 5%;
  width: 60%;
  height: 15%;
}

.id-region {
  bottom: 10%;
  left: 5%;
  width: 35%;
  height: 15%;
}

.barcode-region {
  bottom: 10%;
  right: 5%;
  width: 40%;
  height: 30%;
}

.guide-text {
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
  margin-top: 16px;
  font-size: 14px;
  text-align: center;
  padding: 0 20px;
}

.guide-tip {
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
}

.scanner-actions {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.brightness-controls {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-bottom: 10px;
  width: 100%;
}

.brightness-btn {
  padding: 8px 12px;
  background-color: #333;
  color: white;
  border: none;
  border-radius: 4px;
}

.capture-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  width: 100%;
  padding: 14px;
  font-size: 1.2rem;
  border-radius: 8px;
  background-color: #2196f3;
  color: white;
  border: none;
  cursor: pointer;
  transition: background-color 0.3s;
}

.capture-btn:hover {
  background-color: #0d8bf2;
}

.capture-btn:active {
  background-color: #0b7ad9;
}

.capture-btn i {
  margin-right: 10px;
  font-size: 1.4rem;
}

.scanner-help {
  text-align: center;
  color: #6c757d;
  font-size: 0.9rem;
  margin-bottom: 16px;
}

.processing-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  color: white;
}

.processing-step {
  margin-top: 10px;
  font-size: 14px;
  color: #aaa;
}

.processing-overlay .loading-spinner {
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top: 4px solid white;
  margin-bottom: 16px;
}

.scanner-loading,
.scanner-error {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px 20px;
  text-align: center;
}

.loading-spinner {
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-top: 3px solid var(--primary-color, #2196f3);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>