<script setup>
// This starter template is using Vue 3 <script setup> SFCs
// Check out https://vuejs.org/api/sfc-script-setup.html#script-setup
</script>

<template>
  <div class="flex flex-col space-y-4 justify-center min-h-[100vh]">
    
    <div class="flex justify-center items-center space-x-4 p-8">
      <img alt="Vue logo" class="w-24 self-center" src="./../assets/scett.svg" />
      <div>
        <h1 class="text-6xl fonr-bold">SCETT</h1>
      </div>
    </div>

    <p class="mx-auto p-4 text-2xl text-slate-600 font-semibold">
      Schedule Your Tweets
    </p>

    <div class="flex justify-center mt-8 p-4 space-x-2">
      <router-link to="/login" class="bg-gray-700 hover:bg-gray-800 text-white font-bold rounded-full inline-flex items-center px-4 py-2 ring-0 dark:ring-gray-300 dark:ring-2">
        <span>Login</span>
      </router-link>
      <router-link to="/login" class="bg-gray-700 hover:bg-gray-800 text-white font-bold rounded-full inline-flex items-center px-4 py-2 ring-0 dark:ring-gray-300 dark:ring-2">
        <span>Regiter</span>
      </router-link>
    </div>
  </div>
</template>