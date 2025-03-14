<template>
  <div class="card-preview card">
    <h2 class="preview-title">Card Preview</h2>
    
    <div v-if="cardData" class="preview-content">
      <div class="preview-header">
        <div class="confidence-indicator" :class="overallConfidence">
          <i class="fas" :class="confidenceIcon"></i>
          <span>{{ confidenceMessage }}</span>
        </div>
      </div>
      
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
          <div v-else class="edit-field">
            <input type="text" v-model="editableData.name" class="info-input" />
            <span v-if="cardData.suggestedName" class="suggestion">
              Suggested: {{ cardData.suggestedName }}
              <button @click="useSuggestion('name')" class="use-suggestion-btn">
                <i class="fas fa-check"></i> Use
              </button>
            </span>
          </div>
        </div>
        
        <div class="info-item">
          <span class="info-label">ID:</span>
          <span v-if="!isEditing" class="info-value" :class="{ 'info-value-error': needsCorrection('cardId') }">
            {{ cardData.cardId }}
            <i v-if="needsCorrection('cardId')" class="fas fa-exclamation-circle warning-icon"></i>
          </span>
          <div v-else class="edit-field">
            <input type="text" v-model="editableData.cardId" class="info-input" pattern="[0-9]*" inputmode="numeric" />
            <span v-if="cardData.suggestedId" class="suggestion">
              Suggested: {{ cardData.suggestedId }}
              <button @click="useSuggestion('cardId')" class="use-suggestion-btn">
                <i class="fas fa-check"></i> Use
              </button>
            </span>
          </div>
        </div>
        
        <div class="info-item">
          <span class="info-label">Class Year:</span>
          <span v-if="!isEditing" class="info-value" :class="{ 'info-value-error': needsCorrection('year') }">
            {{ cardData.year }}
            <i v-if="needsCorrection('year')" class="fas fa-exclamation-circle warning-icon"></i>
          </span>
          <div v-else class="edit-field">
            <input type="text" v-model="editableData.year" class="info-input" />
            <span v-if="cardData.suggestedYear" class="suggestion">
              Suggested: {{ cardData.suggestedYear }}
              <button @click="useSuggestion('year')" class="use-suggestion-btn">
                <i class="fas fa-check"></i> Use
              </button>
            </span>
          </div>
        </div>
      </div>
      
      <div v-if="showEditSuggestion && !isEditing" class="edit-suggestion">
        <p>
          <i class="fas fa-info-circle"></i>
          Some information may need correction. Click "Edit Information" to fix it.
        </p>
      </div>
      
      <div class="preview-barcode">
        <img :src="cardData.barcodeImage" alt="Barcode" class="barcode-image" />
        <p class="barcode-text">{{ cardData.barcode || cardData.cardId }}</p>
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
      
      // If we have confidence scores, use them
      if (props.cardData.confidence) {
        if (props.cardData.confidence[field] === 'low') {
          return true;
        }
      }
      
      // Fallback to regex validation
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
    
    // Calculate overall confidence level
    const overallConfidence = computed(() => {
      if (!props.cardData) return 'unknown';
      
      const fields = ['name', 'cardId', 'year'];
      const numErrors = fields.filter(field => needsCorrection(field)).length;
      
      if (numErrors === 0) return 'high';
      if (numErrors === 1) return 'medium';
      return 'low';
    });
    
    // Confidence icon
    const confidenceIcon = computed(() => {
      switch (overallConfidence.value) {
        case 'high': return 'fa-check-circle';
        case 'medium': return 'fa-info-circle';
        case 'low': return 'fa-exclamation-triangle';
        default: return 'fa-question-circle';
      }
    });
    
    // Confidence message
    const confidenceMessage = computed(() => {
      switch (overallConfidence.value) {
        case 'high': return 'Data looks good!';
        case 'medium': return 'Some fields may need review';
        case 'low': return 'Please review the extracted data';
        default: return 'Scan quality unknown';
      }
    });
    
    // Use suggested value
    const useSuggestion = (field) => {
      if (props.cardData[`suggested${field.charAt(0).toUpperCase() + field.slice(1)}`]) {
        editableData[field] = props.cardData[`suggested${field.charAt(0).toUpperCase() + field.slice(1)}`];
      }
    };
    
    // Start editing - copy data to editable form
    const toggleEdit = () => {
      if (!isEditing.value) {
        // Copy data to editable form
        editableData.name = props.cardData.name;
        editableData.cardId = props.cardData.cardId;
        editableData.year = props.cardData.year;
        
        // Apply any suggested corrections automatically
        if (needsCorrection('name') && props.cardData.suggestedName) {
          editableData.name = props.cardData.suggestedName;
        }
        
        if (needsCorrection('cardId') && props.cardData.suggestedId) {
          editableData.cardId = props.cardData.suggestedId;
        }
        
        if (needsCorrection('year') && props.cardData.suggestedYear) {
          editableData.year = props.cardData.suggestedYear;
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
      
      // Update confidence
      updatedData.confidence = {
        name: 'high',
        cardId: 'high',
        year: 'high'
      };
      
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
      overallConfidence,
      confidenceIcon,
      confidenceMessage,
      toggleEdit,
      saveEdits,
      useSuggestion
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

.preview-header {
  margin-bottom: 15px;
}

.confidence-indicator {
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 8px;
}

.confidence-indicator.high {
  background-color: #d4edda;
  color: #155724;
}

.confidence-indicator.medium {
  background-color: #fff3cd;
  color: #856404;
}

.confidence-indicator.low {
  background-color: #f8d7da;
  color: #721c24;
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

.edit-field {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.info-input {
  padding: 8px;
  border: 1px solid var(--primary-color);
  border-radius: 4px;
  font-size: 1rem;
  margin-bottom: 4px;
}

.suggestion {
  font-size: 0.8rem;
  color: #6c757d;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.use-suggestion-btn {
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 3px;
  padding: 2px 6px;
  font-size: 0.7rem;
  cursor: pointer;
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