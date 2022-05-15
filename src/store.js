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
          try {
            await api.updateDocument(Vars.twitterInfoCollection, exists.documents[0]["$id"], newTwitterData, permissions, permissions);
          } catch (error) {
            commit("notify", {
              show: true,
              message: error.message,
              type: "error",
            });
          }
        } else {
          try {
            await api.createDocument(
              Vars.twitterInfoCollection,
              newTwitterData,
              permissions,
              permissions
            );
          } catch (error) {
            commit("notify", {
              show: true,
              message: error.message,
              type: "error",
            });
          }
        }
        dispatch('GET_TWITTER_INFO');
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
                dispatch('SAVE_TEMP_DATA', Object.assign(rootState.tempData, {updatingTwitterData: {
                  time: Date.parse(new Date()),
                  status: true}
                }));
                commit('notify', {show: true, type: 'success', message: 'Twitter information updated'});
              }
            }
            if(responseData.user.$id === state.user.$id && responseData.status === "failure"){
              // twitter Failure
              stopInterval(intervalId);
              commit('notify', {show: true, type: 'error', timeout: 10000, message: 'Failed to finalize twitter authorization, please retry'})
              dispatch('LOADING') // stop loading
              dispatch('SAVE_TEMP_DATA', Object.assign(rootState.tempData, {updatingTwitterData: {
                time: Date.parse(new Date()),
                status: false}
              }));
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

const threads = {
  state: {
    threads: [],
  },
  getters: {
    threads: state => state.threads
  },
  mutations: {
    /***
     * @description Adds a new thread
     * @param {Object} thread => {$id, title, postTime, tweets}
     */
    async populateThreads(state, threads){
      state.threads = threads;
    },
    /***
     * @description Adds a new thread
     * @param {Object} thread => {$id, title, postTime, tweets}
     */
    async addThread(state, thread){
      state.threads.push(thread);
    },
    /***
     * @description Updates a thred
     * @param {Object} data => {threadId, title, postTime}
     */
    async updateThread(state, data){
      const index = state.threads.findIndex(
        (thread) => thread["$id"] === data["$id"]
      );
      if (index !== -1) {
        state.threads.splice(index, 1, data);
      }
    },
    /***
     * @description Deletes a thread
     * @param {string} threadId
     */
    async deleteThread(state, threadId){
      state.threads = state.threads.filter(thread => thread["$id"] !== threadId);
    },
    /***
     * @description Updates a tweet within a thread
     * @param {String} threadId
     * @param {Object} tweet => {id, text}
     */
    async updateTweets(state, {threadId, tweets}) {
      const threadIndex = state.threads.findIndex(
        (thread) => thread["$id"] === threadId
      );
      if (threadIndex !== -1) {
        state.threads[threadIndex].tweets = tweets;
      }
    },
    /***
     * @description Adds a tweet to a thread
     * @param {String} threadId
     * @param {Object} tweet => {id, text}
     */
    async addTweet(state, {threadId, tweet}) {
      for(let i = 0; i < state.threads.length; i++){
        if(state.thread[i]["$id"] === threadId){
          state.thread[i].tweets.push(tweet);
        }
      }
    },
    /***
     * @description deletes a tweet from a thread
     * @param {String} threadId
     * @param {Object} tweet => {id}
     */
    async deleteTweets(state, {threadId, tweet: {id}}) {
      const threadIndex = state.threads.findIndex(
        (thread) => thread["$id"] === threadId
      );
      if (threadIndex !== -1) {
        state.threads[threadIndex].tweets = state.threads[threadIndex].tweets.filter(tweet => tweet.id === id)
      }
    }
  },
  actions: {
    GET_THREADS: async ({commit}) => {
      try{
        const response = await api.listDocuments(Vars.threadsCollection);
        commit('populateThreads', response.documents)
      } catch(error){
        commit('notify', {show: true, type: 'error', message: 'Failed to get threads'})
      }
    },
    ADD_THREAD: async ({commit, rootState, dispatch}, data) => {
      try{
        let readWrite = ['user:' + rootState.account.user["$id"]]
        const response = await api.createDocument(
          Vars.threadsCollection,
          {...data, userID: rootState.account.user["$id"]},
          readWrite,
          readWrite
        );
        commit('addThread', response)
        dispatch('GET_THREADS')
        return true;
      } catch(error){
        commit('notify', {show: true, type: 'error', message: 'Failed to add thread'})
        return false;
      }
    },
    UPDATE_THREAD: async ({ commit }, thread) => {
      try{
        let submittion = JSON.parse(JSON.stringify(thread));
        let finalData = Object.assign(submittion, {postTime: Date.parse(thread.postingDate + ' ' + thread.postingTime), tweets: submittion.tweets.map( tw => tw.text)});
        delete finalData.postingDate;
        delete finalData.postingTime;
        delete finalData.rawPostTime;
        delete finalData['$id'];
        delete finalData['$collection'];
        const response = await api.updateDocument(Vars.threadsCollection, thread['$id'], finalData, thread["$read"], thread["$write"]);
        commit('updateThread', response)
        commit('notify', {show: true, type: 'success', timeout: 3000, message: 'Thread Updated'})
      } catch(error){
        commit('notify', {show: true, type: 'error', message: 'Failed to update thread'})
      }
    },
    DELETE_THREAD: async ({commit}, documentId) => {
      try{
        await api.deleteDocument(Vars.threadsCollection, documentId);
        commit('deleteThread', documentId)
        commit('notify', {show: true, type: 'success', timeout: 3000, message: 'Thread Deleted'})
      } catch(error){
        commit('notify', {show: true, type: 'error', message: 'Failed to delete thread'})
      }
    },
    UPDATE_TWEETS: async ({commit}, {documentId, tweets}) => {
      try{
        await api.updateDocument(Vars.threadsCollection, documentId, {tweets}, read, write);
        commit('updateThread', {documentId, tweets})
      } catch(error){
        commit('notify', {show: true, type: 'error', message: 'Failed to update tweets'})
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
    threads
  },
  plugins: [vuexLocal.plugin]
})