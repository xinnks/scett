<script setup>
// This starter template is using Vue 3 <script setup> SFCs
// Check out https://vuejs.org/api/sfc-script-setup.html#script-setup
import  { watch, computed } from 'vue';
import { useRouter } from 'vue-router';
import  { useStore } from 'vuex';

const store = useStore();
const router = useRouter();

let checkAuth = computed(() => store.getters.getUser)
watch(checkAuth, (val) => {
  if(!val){
    store.dispatch('LOGOUT');
    router.replace('/login')
    console.log("Logging Out!!")
  }
} )
</script>

<template>
  <router-view/>
</template>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  margin: 0;
  padding: 0;
}
</style>
