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
        </div>
        <p class="guide-text">Align your student ID card within the frame</p>
      </div>
    </div>

    <div v-if="isCameraReady" class="scanner-actions">
      <button @click="capturePhoto" class="capture-btn">
        <i class="fas fa-camera"></i> Take Photo
      </button>
      <p class="scanner-help">Position your ID card within the frame and tap the button to capture</p>
    </div>

    <div v-if="isProcessing" class="processing-overlay">
      <div class="loading-spinner"></div>
      <p>Processing image...</p>
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
              height: { ideal: 1080 }
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
      
      isCameraReady.value = false
    }
    
    const capturePhoto = async () => {
      if (!canvasElement.value || !videoElement.value) return
      
      try {
        isProcessing.value = true
        
        // Get current video frame
        const video = videoElement.value
        const canvas = canvasElement.value
        const ctx = canvas.getContext('2d')
        
        // Set canvas size to match video dimensions
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        
        // Draw current video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        
        // Get canvas data
        const imageData = canvas.toDataURL('image/jpeg', 0.95)
        
        // Process the captured image and extract card data
        const cardData = await extractCardData(imageData)
        
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
      initCamera,
      capturePhoto
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

.guide-text {
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
  margin-top: 16px;
  font-size: 14px;
  text-align: center;
  padding: 0 20px;
}

.scanner-actions {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
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