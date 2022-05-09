<script setup>
import notification from './../components/notification.vue';
import navigation from './../components/navigation.vue';
</script>

<template>
  <navigation></navigation>
  <div class="m-0 p-8 h-screen w-full">
    <div class="m-2 flex flex-col max-w-xl mx-auto space-y-8">
      <notification></notification>
      <slot name="page"></slot>
    </div>
  </div>
</template>