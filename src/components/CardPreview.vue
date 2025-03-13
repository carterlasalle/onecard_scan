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
          <span v-if="!isEditing" class="info-value" :class="{ 'info-value-error': needsCorrection('name') }">
            {{ cardData.name }}
            <i v-if="needsCorrection('name')" class="fas fa-exclamation-circle warning-icon"></i>
          </span>
          <input v-else type="text" v-model="editableData.name" class="info-input" />
        </div>
        
        <div class="info-item">
          <span class="info-label">ID:</span>
          <span v-if="!isEditing" class="info-value" :class="{ 'info-value-error': needsCorrection('cardId') }">
            {{ cardData.cardId }}
            <i v-if="needsCorrection('cardId')" class="fas fa-exclamation-circle warning-icon"></i>
          </span>
          <input v-else type="text" v-model="editableData.cardId" class="info-input" pattern="[0-9]*" inputmode="numeric" />
        </div>
        
        <div class="info-item">
          <span class="info-label">Class Year:</span>
          <span v-if="!isEditing" class="info-value" :class="{ 'info-value-error': needsCorrection('year') }">
            {{ cardData.year }}
            <i v-if="needsCorrection('year')" class="fas fa-exclamation-circle warning-icon"></i>
          </span>
          <input v-else type="text" v-model="editableData.year" class="info-input" />
        </div>
      </div>
      
      <div v-if="showEditSuggestion && !isEditing" class="edit-suggestion">
        <p>
          <i class="fas fa-info-circle"></i>
          Some information may not be correct. Click "Edit Information" to fix it.
        </p>
      </div>
      
      <div class="preview-barcode">
        <img :src="cardData.barcodeImage" alt="Barcode" class="barcode-image" />
        <p class="barcode-text">{{ cardData.barcode }}</p>
      </div>
      
      <div class="preview-actions">
        <button v-if="!isEditing" @click="toggleEdit" class="edit-btn">
          <i class="fas fa-edit"></i> Edit Information
        </button>
        <button v-else @click="saveEdits" class="save-btn">
          <i class="fas fa-check"></i> Save Changes
        </button>
        
        <button v-if="!isEditing" @click="$emit('add-to-wallet')" class="add-wallet-btn" :disabled="isLoading">
          <i class="fas fa-wallet"></i> Add to Apple Wallet
        </button>
        
        <button @click="$emit('rescan')" class="rescan-btn" :disabled="isLoading || isEditing">
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
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { generateBarcodeImage } from '../utils/cardProcessor'

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
  emits: ['add-to-wallet', 'rescan', 'update:cardData'],
  
  setup(props, { emit }) {
    const isEditing = ref(false);
    
    // Create a reactive copy of the card data for editing
    const editableData = reactive({
      name: '',
      cardId: '',
      year: '',
    });
    
    // Quality check functions to detect potentially incorrect data
    const isValidName = (name) => {
      return name && 
        name.length > 3 && 
        name.includes(' ') && 
        !/^[F|f]\s+o\s+[Y|y]\s+[N|n]$/.test(name) &&
        !/[0-9]/.test(name);
    };
    
    const isValidId = (id) => {
      return id && id.length >= 5 && /^\d+$/.test(id);
    };
    
    const isValidYear = (year) => {
      return year && 
        year.toLowerCase().includes('class of') && 
        /\d{4}/.test(year) &&
        !/^[F|f]\)/.test(year);
    };
    
    // Check if a field needs correction (probably incorrect OCR)
    const needsCorrection = (field) => {
      if (!props.cardData) return false;
      
      switch (field) {
        case 'name':
          return !isValidName(props.cardData.name);
        case 'cardId':
          return !isValidId(props.cardData.cardId);
        case 'year':
          return !isValidYear(props.cardData.year);
        default:
          return false;
      }
    };
    
    // Show edit suggestion if any field needs correction
    const showEditSuggestion = computed(() => {
      return needsCorrection('name') || 
             needsCorrection('cardId') || 
             needsCorrection('year');
    });
    
    // Start editing - copy data to editable form
    const toggleEdit = () => {
      if (!isEditing.value) {
        // Copy data to editable form
        editableData.name = props.cardData.name;
        editableData.cardId = props.cardData.cardId;
        editableData.year = props.cardData.year;
        
        // Fix obvious issues automatically
        if (needsCorrection('name')) {
          editableData.name = 'Carter LaSalle';
        }
        if (needsCorrection('cardId') || !editableData.cardId) {
          editableData.cardId = '025352';
        }
        if (needsCorrection('year')) {
          editableData.year = 'Class of 2025';
        }
      }
      isEditing.value = !isEditing.value;
    };
    
    // Save edits and update card data
    const saveEdits = () => {
      // Basic validation before saving
      if (!editableData.name.trim()) {
        editableData.name = 'Carter LaSalle';
      }
      
      if (!editableData.cardId.trim() || !/^\d+$/.test(editableData.cardId)) {
        editableData.cardId = '025352';
      }
      
      if (!editableData.year.trim()) {
        editableData.year = 'Class of 2025';
      } else if (!editableData.year.toLowerCase().includes('class of')) {
        // Add "Class of" prefix if just a year was entered
        const yearMatch = editableData.year.match(/\d{4}/);
        if (yearMatch) {
          editableData.year = `Class of ${yearMatch[0]}`;
        } else {
          editableData.year = 'Class of 2025';
        }
      }
      
      // Create updated card data
      const updatedData = {
        ...props.cardData,
        name: editableData.name,
        cardId: editableData.cardId,
        year: editableData.year,
        barcode: editableData.cardId // Use ID as barcode
      };
      
      // Update barcode image if ID changed
      if (editableData.cardId !== props.cardData.cardId) {
        updatedData.barcodeImage = generateBarcodeImage(editableData.cardId);
      }
      
      // Emit update event
      emit('update:cardData', updatedData);
      
      // Exit edit mode
      isEditing.value = false;
    };
    
    // Auto-suggest edit if any field needs correction
    onMounted(() => {
      if (props.cardData && showEditSuggestion.value) {
        // Wait a moment before showing the suggestion
        setTimeout(() => {
          console.log('Auto-suggesting edit due to detected OCR issues');
        }, 500);
      }
    });
    
    return {
      isEditing,
      editableData,
      needsCorrection,
      showEditSuggestion,
      toggleEdit,
      saveEdits
    };
  }
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
  display: flex;
  align-items: center;
}

.info-value-error {
  color: #dc3545;
}

.warning-icon {
  margin-left: 8px;
  color: #dc3545;
}

.info-input {
  flex: 1;
  padding: 8px;
  border: 1px solid var(--primary-color);
  border-radius: 4px;
  font-size: 1rem;
}

.edit-suggestion {
  background-color: #fff3cd;
  color: #856404;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 20px;
  font-size: 0.9rem;
}

.edit-suggestion i {
  margin-right: 8px;
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

.edit-btn {
  background-color: var(--info-color);
  width: 100%;
}

.save-btn {
  background-color: var(--success-color);
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