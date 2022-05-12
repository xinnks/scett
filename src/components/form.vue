<script setup>

defineProps({
  form: Object
})

defineEmits(['submitted'])

</script>

<template>
  <h1 class="self-center text-2xl font-semibold p-8">{{ form.title }}</h1>
  <div class="w-full sm:w-1/3 flex flex-col ring-2 ring-gray-200 bg-slate-50 shadow-sm shadow-slate-400 rounded-sm mx-auto min-w-fit">
    <form class="flex flex-col space-y-8 p-8">
      <div class="mt-4 flex justify-center items-center" v-for="field of form.fields">
        <label class="py-1 px-3 font-semibold" :for="field.label">{{field.label}}</label>
        <div class="w-3/4">
          <input  :type="field.type" :id="field.label" v-model="field.value" class="appearance-none border-2 border-gray-300 rounded w-full py-2 px-2 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-gray-500 text-left" required>
        </div>
      </div>
      <div class="inline-flex justify-center">
        <button class="bg-gray-700 hover:bg-gray-800 text-white font-bold rounded-full inline-flex items-center px-4 py-2 ring-0 dark:ring-gray-300 dark:ring-2" @click.prevent="$emit('submitted')">{{form.actionLabel}}</button>
      </div>
    </form>
  </div>
</template>