<template>
  <div class="card-preview card">
    <h2 class="preview-title">Card Preview</h2>
    
    <div v-if="cardData" class="preview-content">
      <div class="preview-image-container">
        <img :src="cardData.photo" alt="Student Photo" class="student-photo" />
      </div>
      
      <div class="preview-info">
        <div class="info-item">
          <span class="info-label">Name:</span>
          <span class="info-value">{{ cardData.name }}</span>
        </div>
        
        <div class="info-item">
          <span class="info-label">ID:</span>
          <span class="info-value">{{ cardData.cardId }}</span>
        </div>
        
        <div class="info-item">
          <span class="info-label">Class Year:</span>
          <span class="info-value">{{ cardData.year }}</span>
        </div>
      </div>
      
      <div class="preview-barcode">
        <img :src="cardData.barcodeImage" alt="Barcode" class="barcode-image" />
        <p class="barcode-text">{{ cardData.barcode }}</p>
      </div>
      
      <div class="preview-actions">
        <button @click="$emit('add-to-wallet')" class="add-wallet-btn" :disabled="isLoading">
          <i class="fas fa-wallet"></i> Add to Apple Wallet
        </button>
        <button @click="$emit('rescan')" class="rescan-btn" :disabled="isLoading">
          <i class="fas fa-redo"></i> Rescan
        </button>
      </div>
      
      <div v-if="isLoading" class="loading-overlay">
        <div class="loading-spinner"></div>
        <p>Creating Apple Wallet Pass...</p>
      </div>
    </div>
    
    <div v-else class="preview-empty">
      <p>No card data available. Please scan your student ID card first.</p>
      <button @click="$emit('rescan')" class="mt-2">
        <i class="fas fa-camera"></i> Scan Card
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CardPreview',
  props: {
    cardData: {
      type: Object,
      default: null
    },
    isLoading: {
      type: Boolean,
      default: false
    }
  },
  emits: ['add-to-wallet', 'rescan']
}
</script>

<style scoped>
.card-preview {
  width: 100%;
  max-width: 500px;
}

.preview-title {
  text-align: center;
  margin-bottom: 20px;
  color: var(--primary-color);
}

.preview-content {
  position: relative;
}

.preview-image-container {
  width: 100%;
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.student-photo {
  width: 150px;
  height: 150px;
  object-fit: cover;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.preview-info {
  margin-bottom: 20px;
}

.info-item {
  display: flex;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-color);
}

.info-label {
  font-weight: bold;
  width: 100px;
  flex-shrink: 0;
}

.info-value {
  flex: 1;
}

.preview-barcode {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20px;
  padding: 15px;
  background-color: white;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
}

.barcode-image {
  max-width: 100%;
  height: auto;
  margin-bottom: 8px;
}

.barcode-text {
  font-family: monospace;
  font-size: 0.9rem;
  color: var(--secondary-color);
}

.preview-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.add-wallet-btn {
  background-color: var(--primary-color);
  width: 100%;
}

.rescan-btn {
  background-color: var(--secondary-color);
  width: 100%;
}

.preview-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 30px 0;
  color: var(--secondary-color);
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: var(--border-radius);
}
</style> 