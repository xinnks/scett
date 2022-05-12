import { createApp } from 'vue'
import { router } from './router'
import App from './App.vue'
import "./index.css"

const scett = createApp(App)
scett.use(router)
scett.mount('#app')