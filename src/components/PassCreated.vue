<template>
  <div class="pass-created card">
    <div class="success-icon">
      <i class="fas fa-check-circle"></i>
    </div>
    
    <h2 class="success-title">Pass Created!</h2>
    
    <p class="success-message">
      Your student ID card has been successfully converted to an Apple Wallet pass.
    </p>
    
    <div class="pass-actions">
      <a :href="downloadUrl" class="download-btn" download="student_id.pkpass">
        <i class="fas fa-download"></i> Download Pass
      </a>
      <p class="download-hint">
        After downloading, open the file to add it to your Apple Wallet.
      </p>
    </div>
    
    <div class="wallet-instructions">
      <h3>How to add to Apple Wallet:</h3>
      <ol>
        <li>Download the pass file</li>
        <li>Tap the downloaded file</li>
        <li>Tap "Add to Apple Wallet"</li>
        <li>Confirm by tapping "Add" in the top right</li>
      </ol>
    </div>
    
    <button @click="$emit('new-scan')" class="new-scan-btn">
      <i class="fas fa-camera"></i> Scan Another Card
    </button>
  </div>
</template>

<script>
export default {
  name: 'PassCreated',
  props: {
    downloadUrl: {
      type: String,
      required: true
    }
  },
  emits: ['new-scan']
}
</script>

<style scoped>
.pass-created {
  width: 100%;
  max-width: 500px;
  text-align: center;
}

.success-icon {
  font-size: 4rem;
  color: var(--success-color);
  margin-bottom: 1rem;
}

.success-title {
  color: var(--success-color);
  margin-bottom: 1rem;
}

.success-message {
  margin-bottom: 2rem;
  color: var(--text-color);
}

.pass-actions {
  margin-bottom: 2rem;
}

.download-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: var(--primary-color);
  color: white;
  text-decoration: none;
  padding: 0.75rem 1.5rem;
  border-radius: var(--border-radius);
  font-size: 1rem;
  transition: background-color 0.3s;
  margin-bottom: 1rem;
  width: 100%;
}

.download-btn:hover {
  background-color: #0d8bf2;
}

.download-btn i {
  margin-right: 0.5rem;
}

.download-hint {
  font-size: 0.9rem;
  color: var(--secondary-color);
}

.wallet-instructions {
  background-color: #f8f9fa;
  padding: 1.5rem;
  border-radius: var(--border-radius);
  margin-bottom: 2rem;
  text-align: left;
}

.wallet-instructions h3 {
  margin-bottom: 1rem;
  font-size: 1.1rem;
  color: var(--text-color);
}

.wallet-instructions ol {
  padding-left: 1.5rem;
}

.wallet-instructions li {
  margin-bottom: 0.5rem;
}

.new-scan-btn {
  background-color: var(--secondary-color);
  width: 100%;
}

.new-scan-btn i {
  margin-right: 0.5rem;
}
</style> 