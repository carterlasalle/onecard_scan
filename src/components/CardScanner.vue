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
      <div class="scanner-status">
        <div :class="['status-indicator', isAligned ? 'aligned' : '']"></div>
        <p>{{ statusMessage }}</p>
      </div>
      <button @click="captureManually" class="capture-btn">
        <i class="fas fa-camera"></i> Capture Manually
      </button>
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
    const isAligned = ref(false)
    const error = ref('')
    const statusMessage = ref('Looking for card...')
    
    let stream = null
    let processingInterval = null
    let alignmentTimeout = null
    
    const initCamera = async () => {
      isProcessing.value = false
      isAligned.value = false
      error.value = ''
      
      try {
        if (stream) {
          stopCamera()
        }
        
        // Request camera access with high resolution
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false
        })
        
        if (videoElement.value) {
          videoElement.value.srcObject = stream
          videoElement.value.onloadedmetadata = () => {
            isCameraReady.value = true
            startProcessing()
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
      
      if (processingInterval) {
        clearInterval(processingInterval)
        processingInterval = null
      }
      
      if (alignmentTimeout) {
        clearTimeout(alignmentTimeout)
        alignmentTimeout = null
      }
      
      isCameraReady.value = false
    }
    
    const startProcessing = () => {
      if (processingInterval) {
        clearInterval(processingInterval)
      }
      
      processingInterval = setInterval(() => {
        if (!isProcessing.value && isCameraReady.value) {
          processFrame()
        }
      }, 500) // Process frames every 500ms
    }
    
    const processFrame = async () => {
      if (!videoElement.value || !canvasElement.value || isProcessing.value) {
        return
      }
      
      isProcessing.value = true
      
      try {
        const video = videoElement.value
        const canvas = canvasElement.value
        const ctx = canvas.getContext('2d')
        
        // Set canvas size to match video dimensions
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        
        // Draw current video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        
        // Check for card alignment
        const isCardAligned = detectCardAlignment(canvas)
        
        if (isCardAligned && !isAligned.value) {
          isAligned.value = true
          statusMessage.value = 'Card detected! Capturing...'
          
          // Wait a moment to ensure good alignment before capturing
          alignmentTimeout = setTimeout(() => {
            captureCard()
          }, 1000)
        } else if (!isCardAligned && isAligned.value) {
          isAligned.value = false
          statusMessage.value = 'Looking for card...'
          
          if (alignmentTimeout) {
            clearTimeout(alignmentTimeout)
            alignmentTimeout = null
          }
        }
      } catch (err) {
        console.error('Error processing frame:', err)
      } finally {
        isProcessing.value = false
      }
    }
    
    const detectCardAlignment = (canvas) => {
      // In a real implementation, this would use OpenCV.js for contour detection
      // and card alignment detection. For now, we'll simulate this functionality
      // This would be replaced with actual computer vision techniques
      
      // Simplified example that would be replaced with real OpenCV.js code:
      // 1. Convert to grayscale
      // 2. Apply edge detection
      // 3. Find rectangular contours
      // 4. Check if a card-shaped contour is found and properly aligned
      
      // For demo purposes, let's assume we have a 30% chance of detecting alignment
      // This would be replaced with actual detection logic
      return Math.random() < 0.3
    }
    
    const captureCard = async () => {
      if (!canvasElement.value) return
      
      try {
        // Get canvas data
        const canvas = canvasElement.value
        const imageData = canvas.toDataURL('image/jpeg', 0.95)
        
        // Process the captured image and extract card data
        // This would use real OCR, barcode detection, etc.
        const cardData = await extractCardData(imageData)
        
        // Emit the extracted data
        emit('card-scanned', cardData)
        
        // Stop camera after successful capture
        stopCamera()
      } catch (err) {
        console.error('Error capturing card:', err)
        statusMessage.value = 'Error capturing card. Please try again.'
        isAligned.value = false
      }
    }
    
    const captureManually = () => {
      if (isCameraReady.value) {
        captureCard()
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
      isAligned,
      error,
      statusMessage,
      initCamera,
      captureManually
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
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.scanner-status {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: #dc3545;
  margin-right: 8px;
  transition: background-color 0.3s;
}

.status-indicator.aligned {
  background-color: #28a745;
}

.capture-btn {
  display: flex;
  align-items: center;
  justify-content: center;
}

.capture-btn i {
  margin-right: 8px;
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
</style> 