import { createStore } from "vuex";
import VuexPersistence from "vuex-persist";
const vuexLocal = new VuexPersistence({
  storage: window.localStorage
})
export const store = createStore({
  state: {
    notification: null,
    loading: null,
    tempData: {}
  },
  getters: {
    getLoading: state => state.loading,
    getNotification: state => state.notification,
    getTempData: state => state.tempData
  },
  mutations: {
    notify(state, notification){
      state.notification = notification
    },
    clearNotification(state){
      state.notification = null
    },
    updateTempData(state, data){
      state.tempData = data
    },
    updateLoading(state, data){
      state.loading = data
    }
  },
  actions: {
    CLEAR_NOTIFICATION({commit}){
      commit('clearNotification')
    },
    LOADING({commit}, data = null){
      commit('updateLoading', data)
    },
    SAVE_TEMP_DATA({commit}, data){
      commit('updateTempData', data)
      return true;
    }
  },
  plugins: [vuexLocal.plugin]
})