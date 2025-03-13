import { createApp } from 'vue'
import App from './App.vue'
import '@fortawesome/fontawesome-free/css/all.min.css'
import './assets/main.css'

// Wait for OpenCV.js to be ready
window.onOpenCVReady = () => {
  console.log('OpenCV.js is ready')
}

const app = createApp(App)
app.mount('#app')
