<script setup>
import notification from './../components/notification.vue';
</script>

<template>
  <div class="p-12 w-full h-screen flex flex-col justify-center">
    <div class="w-full">
      <notification></notification>
    </div>
    <slot name="form"></slot>
  </div>
</template>