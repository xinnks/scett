import { createApp } from 'vue'
import { router } from './router'
import { store } from './store'
import App from './App.vue'
import "./index.css"

const scett = createApp(App)

router.beforeEach((to, from) => {
  if(!store.getters.getUser && to.meta.needsAuth){
    return {path: '/login'}
  }
  if(!to.meta.needsAuth && store.getters.getUser){
    return {path: '/dashboard'}
  }
})

scett.use(store)
scett.use(router)
scett.mount('#app')