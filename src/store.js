import { createStore } from "vuex";
import VuexPersistence from "vuex-persist";
import { api } from "./api";
import { Vars } from "./config";
const vuexLocal = new VuexPersistence({
  storage: window.localStorage
})

const account = {
  state: {
    user: null,
    session: null,
    twitterInfo: null
  },
  getters: {
    getUser: state => state.user,
    getSession: state => state.session,
    getTwitterInfo: state => state.twitterInfo
  },
  mutations: {
    updateUser(state, payload){
      state.user = payload
    },
    updateSession(state, payload){
      state.session = payload
    },
    updateTwitterInfo(state, payload){
      // updating twitter info
      state.twitterInfo = payload
    }
  },
  actions: {
    LOGIN: async ({ commit, dispatch }, { userId, secret }) => {
      try{
        let session = await api.createAuthSession(userId, secret);
        commit('updateSession', session);
        let user = await api.getAccount();
        commit('updateUser', user);
        dispatch('GET_TWITTER_INFO');
        return true
      } catch(error){
        commit('notify', {show: true, type: 'error', message: 'Failed to login', timeout: 10000})
        return false
      }
    },
    GET_TWITTER_INFO: async ({ commit, state }) => {
      try {
        let response = await api.getTwitterInfo(state.user['$id']);
        if(response.total){
          commit('updateTwitterInfo', {handle: response.documents[0].handle, id: response.documents[0].$id });
        }
      } catch (error) {
        commit("notify", {
          show: true,
          message: error.message,
          type: "error",
        });
      }
    },
    CREATE_ACCOUNT: async ({ commit }, email) => {
      try {
        await api.createAccount(email);
        commit("notify", {
          show: true,
          message: 'Open the link we\'ve sent to your email to proceed',
          type: "info",
        });
      } catch (error) {
        commit("notify", {
          show: true,
          message: error.message,
          type: "error",
        });
      }
    },
    SAVE_TWITTER_DATA: async({ commit, dispatch, state, rootState }, data) => {
      let permissions = ['user:' + state.user.$id];
      let newTwitterData = {...{
        token: data.encryptedToken,
        secret: data.encryptedSecret,
        handle: data.twitterHandle,
        id: data.twitterUserId
      }, userID: state.user.$id};
      try {
        // Check if already added
        let exists = await api.getTwitterInfo(state.user.$id);
        if(exists.documents.length){ // update
          response = await api.updateDocument(Vars.twitterInfoCollection, exists.documents[0]["$id"], newTwitterData, permissions, permissions);
        } else {
          response = await api.createDocument(
            Vars.twitterInfoCollection,
            newTwitterData,
            permissions,
            permissions
          );
        }
        commit('updateTwitterInfo', {handle: data.twitterHandle});
        dispatch('SAVE_TEMP_DATA', Object.assign(rootState.tempData, {updatedTwitterData: true}));
        commit('notify', {show: true, type: 'success', message: 'Twitter information updated'});
        dispatch('LOADING') // stop loading

      } catch (error) {
        commit('notify', {show: true, type: 'error', message: 'Failed to update twitter information'})
      }
    },
    TWITTER_OAUTH: async ({ state, commit, dispatch, rootState }, data) => {
      try {
        let count = 0;
        const fnInfo = await api.twitterOauth({request: data, user: state.user});
        const stopInterval = (id) => { clearInterval(id) }
        let intervalId = setInterval(async () => {
          const pingResponse = await api.getFunExecution(Vars.twitterOauthFunction, fnInfo["$id"]);
          if(pingResponse.status === "completed"){
            let responseData = JSON.parse(pingResponse.stdout);
            if(responseData.user.$id === state.user.$id && responseData.status === "success"){
              // twitter oauth step 1
              if(responseData.step === 1){
                stopInterval(intervalId);
                dispatch('SAVE_TEMP_DATA', Object.assign(rootState.tempData, {oauthRequest: {oauthStepOne: true, oauthStepOneTokens: responseData.tokens}}));
              } else {
                // twitter oauth step 3
                stopInterval(intervalId);
                dispatch('SAVE_TWITTER_DATA', responseData.twitterData);
              }
            }
            if(responseData.user.$id === state.user.$id && responseData.status === "failure"){
              // twitter Failure
              stopInterval(intervalId);
              commit('notify', {show: true, type: 'error', message: 'Could not authenticate twitter, please retry'});
              dispatch('LOADING') // stop loading
            }
          }
          if(count >= 15){
            stopInterval(intervalId);
            store.commit('notify', {show: true, type: 'failure', timeout: 5000, message: 'Failed to finalize twitter authorization, please retry'})
            dispatch('LOADING') // stop loading
          }
          count++;
        }, 1500)
      } catch (error) {
        commit("notify", {
          show: true,
          message: error.message,
          type: "error",
        });
      }
    },
    DELETE_TWITTER_INFO: async ({commit, state}) => {
      try{
        await api.deleteDocument(Vars.twitterInfoCollection, state.twitterInfo.id);
        commit('updateTwitterInfo', null)
        commit('notify', {show: true, type: 'success', timeout: 15000, message: 'Scett\'s access to your Twitter account has been revoked, proceed to removing it from your authorized apps (https://twitter.com/settings/connected_apps).'})
      } catch(error){
        commit('notify', {show: true, type: 'error', message: 'Failed to revoke twitter access, please retry.'})
      }
    },
    LOGOUT: async ({ commit }) => {
      try {
        await api.deleteAuthSession();
        commit("updateUser", null);
        commit("updateSession", null);
        commit("updateTwitterInfo", null);
        return true;
      } catch (error) {
        commit("notify", {
          show: true,
          message: "Failed to logout",
          color: "error",
        });
        return false;
      }
    },
  },
}
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
  modules: {
    account,
  },
  plugins: [vuexLocal.plugin]
})