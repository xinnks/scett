<script setup>
import { reactive } from 'vue';
import { useStore } from 'vuex';
import formLayout from './../layouts/form.vue';
import formComponent from '../components/form.vue';

const store = useStore();

let form = reactive({
  title: "Login",
  fields: {
    email: {
      label: "Email",
      type: "email",
      value: "",
    }
  },
  actionLabel: "Login"
})

const login = () => {
  if(form.fields.email.value === "") missing("email")

  store.dispatch('CREATE_ACCOUNT', form.fields.email.value);
}

const missing = (val) => {
  alert(val + " cannot be empty")
}
</script>

<template>
  <formLayout>
    <template #form>
      
      <formComponent :form="form" @submitted="login()">
      </formComponent>

    </template>
  </formLayout>
</template>
