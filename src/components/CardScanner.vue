<template>
  <div class="card-scanner">
    <div class="scanner-container">
      <video ref="videoElement" autoplay playsinline></video>
      <canvas ref="canvasElement" class="scanner-canvas"></canvas>
      <canvas ref="debugCanvas" class="debug-canvas" v-if="showDebug"></canvas>
      
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
      <button v-if="isDebugMode" @click="toggleDebug" class="debug-btn">
        {{ showDebug ? 'Hide Debug' : 'Show Debug' }}
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

// Enable debug mode for development
const isDebugMode = process.env.NODE_ENV === 'development';

export default {
  name: 'CardScanner',
  emits: ['card-scanned'],
  
  setup(props, { emit }) {
    const videoElement = ref(null)
    const canvasElement = ref(null)
    const debugCanvas = ref(null)
    const isCameraReady = ref(false)
    const isProcessing = ref(false)
    const isAligned = ref(false)
    const error = ref('')
    const statusMessage = ref('Looking for card...')
    const showDebug = ref(false)
    
    let stream = null
    let processingInterval = null
    let alignmentTimeout = null
    let lastDetectionTime = 0
    
    const initCamera = async () => {
      isProcessing.value = false
      isAligned.value = false
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
      }, 300) // Process frames more frequently for better responsiveness
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
        const result = await detectCardAlignment(canvas)
        
        // Update debug canvas if needed
        if (showDebug.value && debugCanvas.value) {
          const debugCtx = debugCanvas.value.getContext('2d')
          debugCanvas.value.width = canvas.width
          debugCanvas.value.height = canvas.height
          debugCtx.drawImage(canvas, 0, 0)
          
          if (result.corners) {
            debugCtx.strokeStyle = 'rgba(0, 255, 0, 0.8)'
            debugCtx.lineWidth = 3
            
            // Draw detected corners
            debugCtx.beginPath()
            debugCtx.moveTo(result.corners.topLeft.x, result.corners.topLeft.y)
            debugCtx.lineTo(result.corners.topRight.x, result.corners.topRight.y)
            debugCtx.lineTo(result.corners.bottomRight.x, result.corners.bottomRight.y)
            debugCtx.lineTo(result.corners.bottomLeft.x, result.corners.bottomLeft.y)
            debugCtx.closePath()
            debugCtx.stroke()
          }
        }
        
        // Manage alignment detection timing
        const now = Date.now()
        if (result.isAligned && !isAligned.value) {
          isAligned.value = true
          statusMessage.value = 'Card detected! Capturing...'
          lastDetectionTime = now
          
          // Wait a moment to ensure good alignment before capturing
          alignmentTimeout = setTimeout(() => {
            captureCard()
          }, 1000)
        } else if (result.isAligned && isAligned.value) {
          // Update last detection time
          lastDetectionTime = now
        } else if (!result.isAligned && isAligned.value) {
          // Check if it's been a while since we detected alignment
          if (now - lastDetectionTime > 500) {
            isAligned.value = false
            statusMessage.value = 'Looking for card...'
            
            if (alignmentTimeout) {
              clearTimeout(alignmentTimeout)
              alignmentTimeout = null
            }
          }
        }
      } catch (err) {
        console.error('Error processing frame:', err)
      } finally {
        isProcessing.value = false
      }
    }
    
    const detectCardAlignment = async (canvas) => {
      // This would ideally use computer vision techniques
      // For this implementation, we'll use a simplified approach
      
      const ctx = canvas.getContext('2d')
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      
      // We'll look for a rectangular shape in the image
      // Create a simplified edge detection
      const edgeCanvas = document.createElement('canvas')
      edgeCanvas.width = canvas.width
      edgeCanvas.height = canvas.height
      const edgeCtx = edgeCanvas.getContext('2d')
      
      // Draw grayscale image
      edgeCtx.drawImage(canvas, 0, 0)
      const edgeData = edgeCtx.getImageData(0, 0, canvas.width, canvas.height)
      const edgePixels = edgeData.data
      
      // Convert to grayscale
      for (let i = 0; i < edgePixels.length; i += 4) {
        const gray = 0.3 * edgePixels[i] + 0.59 * edgePixels[i+1] + 0.11 * edgePixels[i+2]
        edgePixels[i] = edgePixels[i+1] = edgePixels[i+2] = gray
      }
      
      // Simplified edge detection
      // Just check for significant changes in brightness
      const threshold = 30
      const guideWidth = Math.floor(canvas.width * 0.85) // Width of guide frame
      const guideHeight = Math.floor(canvas.height * 0.55) // Height of guide frame
      const guideLeft = Math.floor((canvas.width - guideWidth) / 2)
      const guideTop = Math.floor((canvas.height - guideHeight) / 2)
      
      // For simplicity, just check if there's a card-like object in the frame
      // This would be replaced with actual contour detection in production
      let edgeCount = 0
      for (let y = guideTop; y < guideTop + guideHeight; y += 10) {
        for (let x = guideLeft; x < guideLeft + guideWidth; x += 10) {
          const i = (y * canvas.width + x) * 4
          const right = (y * canvas.width + Math.min(x + 10, canvas.width - 1)) * 4
          const bottom = (Math.min(y + 10, canvas.height - 1) * canvas.width + x) * 4
          
          const diff1 = Math.abs(edgePixels[i] - edgePixels[right])
          const diff2 = Math.abs(edgePixels[i] - edgePixels[bottom])
          
          if (diff1 > threshold || diff2 > threshold) {
            edgeCount++
          }
        }
      }
      
      // If enough edges are detected within the guide frame, consider it aligned
      const isAligned = edgeCount > 100
      
      // Simulate corners for debugging visualization
      const corners = {
        topLeft: { x: guideLeft, y: guideTop },
        topRight: { x: guideLeft + guideWidth, y: guideTop },
        bottomRight: { x: guideLeft + guideWidth, y: guideTop + guideHeight },
        bottomLeft: { x: guideLeft, y: guideTop + guideHeight }
      }
      
      return { isAligned, corners }
    }
    
    const captureCard = async () => {
      if (!canvasElement.value) return
      
      try {
        statusMessage.value = 'Processing image...'
        
        // Get canvas data
        const canvas = canvasElement.value
        const imageData = canvas.toDataURL('image/jpeg', 0.95)
        
        // Process the captured image and extract card data
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
    
    const toggleDebug = () => {
      showDebug.value = !showDebug.value
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
      debugCanvas,
      isCameraReady,
      isProcessing,
      isAligned,
      error,
      statusMessage,
      isDebugMode,
      showDebug,
      initCamera,
      captureManually,
      toggleDebug
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

.debug-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10;
  pointer-events: none;
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
  margin-bottom: 10px;
  width: 100%;
}

.debug-btn {
  background-color: #6c757d;
  width: 100%;
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