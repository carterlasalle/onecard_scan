<template>
  <div class="app-container">
    <header class="app-header">
      <h1>OneCard Scan</h1>
    </header>
    
    <main class="main-content">
      <div v-if="errorMessage" class="error-alert">
        <i class="fas fa-exclamation-triangle"></i>
        {{ errorMessage }}
        <button @click="dismissError" class="dismiss-button">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <CardScanner 
        v-if="currentStep === 'scan'" 
        @card-scanned="handleCardScanned" 
        @error="handleError"
      />
      <CardPreview 
        v-else-if="currentStep === 'preview'" 
        :card-data="cardData" 
        :is-loading="isLoading"
        @update:card-data="updateCardData"
        @add-to-wallet="addToWallet"
        @rescan="resetScan"
      />
      <PassCreated 
        v-else-if="currentStep === 'complete'" 
        :download-url="passUrl" 
        @new-scan="resetScan"
      />
    </main>

    <footer class="app-footer">
      <p>&copy; {{ currentYear }} OneCard Scan</p>
    </footer>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import CardScanner from './components/CardScanner.vue'
import CardPreview from './components/CardPreview.vue'
import PassCreated from './components/PassCreated.vue'

export default {
  name: 'App',
  components: {
    CardScanner,
    CardPreview,
    PassCreated
  },
  setup() {
    const currentStep = ref('scan')
    const cardData = ref(null)
    const passUrl = ref('')
    const isLoading = ref(false)
    const errorMessage = ref('')
    
    const currentYear = computed(() => new Date().getFullYear())

    const handleCardScanned = (data) => {
      cardData.value = data
      currentStep.value = 'preview'
    }
    
    const updateCardData = (newData) => {
      cardData.value = newData
    }
    
    const handleError = (error) => {
      errorMessage.value = error
      console.error('Application error:', error)
    }
    
    const dismissError = () => {
      errorMessage.value = ''
    }

    const addToWallet = async () => {
      try {
        isLoading.value = true
        // Call backend API to generate pass
        const response = await fetch('/api/generate-pass', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(cardData.value)
        })
        
        if (!response.ok) {
          throw new Error(`Failed to generate pass: ${response.statusText}`)
        }
        
        const data = await response.json()
        
        if (!data.success || !data.passUrl) {
          throw new Error('Invalid response from server')
        }
        
        passUrl.value = data.passUrl
        currentStep.value = 'complete'
      } catch (error) {
        console.error('Error creating pass:', error)
        handleError('Failed to create Apple Wallet pass. Please try again.')
      } finally {
        isLoading.value = false
      }
    }

    const resetScan = () => {
      cardData.value = null
      passUrl.value = ''
      errorMessage.value = ''
      currentStep.value = 'scan'
    }

    return {
      currentStep,
      cardData,
      passUrl,
      isLoading,
      errorMessage,
      currentYear,
      handleCardScanned,
      updateCardData,
      addToWallet,
      resetScan,
      handleError,
      dismissError
    }
  }
}
</script>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  background-color: #f5f5f7;
}

.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  background-color: #2196f3;
  color: white;
  padding: 1rem;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.main-content {
  flex: 1;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
}

.error-alert {
  position: relative;
  width: 100%;
  max-width: 600px;
  background-color: #f8d7da;
  color: #721c24;
  padding: 12px 36px 12px 16px;
  margin-bottom: 16px;
  border-radius: 4px;
  border: 1px solid #f5c6cb;
  display: flex;
  align-items: center;
}

.error-alert i {
  margin-right: 8px;
}

.dismiss-button {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #721c24;
  cursor: pointer;
  padding: 4px;
  font-size: 14px;
}

.app-footer {
  background-color: #f8f9fa;
  padding: 1rem;
  text-align: center;
  font-size: 0.9rem;
  color: #6c757d;
  border-top: 1px solid #e9ecef;
}

button {
  background-color: #2196f3;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s;
}

button:hover {
  background-color: #0d8bf2;
}

button:disabled {
  background-color: #b0b0b0;
  cursor: not-allowed;
}

button.secondary {
  background-color: #6c757d;
}

button.secondary:hover {
  background-color: #5a6268;
}
</style>