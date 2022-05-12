<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useStore } from 'vuex';

const store = useStore();
const router = useRouter();

const logOut = async () => {
  let loggedOut = await store.dispatch('LOGOUT');
  if(loggedOut){
    router.replace('/login');
  }
}
</script>

<template>
  <nav class="flex items-center justify-between flex-wrap bg-blue-100 p-6">
    <div class="inline-flex flex-col items-center flex-shrink-0 text-blue-600 mr-6">
      <span class="font-semibold text-xl">SCETT</span>
    </div>
    <div class="flex flex-col justify-center">
      <button @click="logOut()" href="#" class="inline-block text-sm px-4 py-2 leading-none border-2 rounded text-blue-600 border-blue-200 hover:border-transparent hover:text-white hover:bg-blue-400 lg:mt-0">Log Out</button>
    </div>
  </nav>
</template>