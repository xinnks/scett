<script setup>
import pageVue from './../layouts/page.vue';
import { watch } from 'vue';
import { useStore } from 'vuex';
import { useRoute, useRouter } from 'vue-router';

const store = useStore();
const router = useRouter();
const route = useRoute();

let { oauth_token, oauth_verifier } = route.query;

/** Continue twitter authentication */
const authenticate = async () => {
  if(!oauth_token || !oauth_verifier) {
    missing("You have not authenticated the app")
    return false;
  }
  store.dispatch('LOADING', {show: true, message: "Finalizing Twitter Authentication"})
  let storedData = store.getters.getTempData;
  let {tempOauthTokenSecret} = storedData.oauthRequest.oauthStepOneTokens;
  await store.dispatch('TWITTER_OAUTH', {type: 'step-3', oauthTokenSecret: tempOauthTokenSecret, oauthToken: oauth_token, oauthVerifier: oauth_verifier});
  watch(store.getters.getTempData, async (val) => {
    if(val.updatedTwitterData){
      router.replace('/dashboard');
      store.dispatch('LOADING') // stop loading
      store.dispatch('SAVE_TEMP_DATA', null) // clear temp data
    }
    setTimeout(() => {
      router.replace('/dashboard');
    }, 2000)
  })
}
authenticate();
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