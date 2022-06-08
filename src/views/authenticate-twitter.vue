<script setup>
import pageVue from './../layouts/page.vue';
import { watch, computed } from 'vue';
import { useStore } from 'vuex';
import { useRoute, useRouter } from 'vue-router';

const store = useStore();
const router = useRouter();
const route = useRoute();

/** Continue twitter authentication */
const authenticate = async () => {
  let { oauth_token, oauth_verifier } = route.query;
  if(!oauth_token || !oauth_verifier) {
    missing("You have not authenticated the app")
    return false;
  }
  store.dispatch('LOADING', {show: true, message: "Finalizing Twitter Authentication"})
  let storedData = store.getters.getTempData;
  let watchStoredTempData = computed(() => store.getters.getTempData);
  let {tempOauthTokenSecret} = storedData.oauthRequest.oauthStepOneTokens;
  store.dispatch('TWITTER_OAUTH', {type: 'step-3', oauthTokenSecret: tempOauthTokenSecret, oauthToken: oauth_token, oauthVerifier: oauth_verifier});
  watch(watchStoredTempData, async (val) => {
    if(val.updatingTwitterData.status){
      router.replace('/dashboard');
      store.dispatch('LOADING') // stop loading
      setTimeout(() => {
        store.dispatch('SAVE_TEMP_DATA', {}) // clear temp data
      }, 3000)
    } else {
      setTimeout(() => {
        store.dispatch('SAVE_TEMP_DATA', {}) // clear temp data
      router.push('/dashboard');
      }, 3000)
    }
  }, {deep: true})
}
if(route.query.denied !== undefined){
  store.commit('notify', {show: true, type: 'error', message: 'Twitter access was denied!', timeout: 5000});
  store.dispatch('LOADING') // stop loading
  router.replace('/dashboard');
} else {
  authenticate();
}
</script>


<template>
  <pageVue>
    <h3>Authenticating Twitter..</h3>
  </pageVue>
</template>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>