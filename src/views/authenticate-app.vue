<script setup>
import pageVue from './../layouts/page.vue';
import { useStore } from 'vuex';
import { useRoute, useRouter } from 'vue-router';

const store = useStore();
const router = useRouter();
const route = useRoute();

let { userId, secret } = route.query;

const authenticate = async () => {
  if(!userId) missing("problem with authentication link")
  if(!secret) missing("problem with authentication link")

  const login = await store.dispatch('LOGIN', { userId, secret });
  if(login) router.replace('/dashboard')
}

const missing = (val) => {
  alert(val + " cannot be empty")
}

authenticate();
</script>

<template>
  <pageVue>
    Logging in..
  </pageVue>
</template>
