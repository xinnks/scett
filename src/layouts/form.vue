<script setup>
import notification from './../components/notification.vue';
</script>

<template>
  <div class="p-12 w-full min-h-[80vh] max-h-[100vh] flex flex-col justify-center">
    <div class="flex justify-center items-center p-2">
      <img alt="Vue logo" class="w-20 self-center" src="./../assets/scett.svg" />
    </div>
    <div class="w-full flex justify-center">
      <notification></notification>
    </div>
    <slot name="form"></slot>
  </div>
</template>