<script setup>
import { ref } from 'vue';
import { useStore } from 'vuex';

const store = useStore();
let navToggle = ref(false);

const logOut = () => {
  store.dispatch('LOGOUT');
}
</script>

<template>
  <nav class="flex items-center justify-between flex-wrap bg-blue-100 p-6">
    <div class="flex items-center flex-shrink-0 text-blue-600 mr-6 ">
      <span class="font-semibold text-xl tracking-tight">SCETT</span>
    </div>
    <div class="block lg:hidden">
      <button @click="navToggle = !navToggle" class="flex items-center px-3 py-2 border-2 rounded text-blue-600 border-blue-200 hover:text-white hover:border-transparent hover:bg-blue-400">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="fill-current h-4 w-4"><path fill="none" d="M0 0h24v24H0z"/><path d="M3 4h18v2H3V4zm6 7h12v2H9v-2zm-6 7h18v2H3v-2z"/></svg>
      </button>
    </div>
    <div :class="{'block': navToggle, 'hidden': !navToggle}" class="w-full block flex-grow lg:flex lg:items-center lg:w-auto">
      <div class="text-sm lg:flex-grow">
        <router-link to="/dashboard" class="block mt-4 lg:inline-block lg:mt-0 text-blue-600 hover:text-blue-700 mr-4">
          Dashboard
        </router-link>
      </div>
      <div>
        <button @click="logOut()" href="#" class="inline-block text-sm px-4 py-2 leading-none border-2 rounded text-blue-600 border-blue-200 hover:border-transparent hover:text-white hover:bg-blue-400 mt-4 lg:mt-0">Log Out</button>
      </div>
    </div>
  </nav>
</template>