import { createRouter, createWebHistory } from 'vue-router'

export const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('./views/home.vue'),
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('./views/login.vue'),
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('./views/dashboard.vue'),
    meta: { needsAuth: true }
  },
  {
    path: '/twauth',
    name: 'Authenticate Twitter',
    component: () => import('./views/authenticate-twitter.vue'),
    meta: { needsAuth: true }
  },
  {
    path: '/auth',
    name: 'Authenticate App',
    component: () => import('./views/authenticate-app.vue'),
  },
  {
    path: '/:pathMatch(.*)',
    component: () => import('./views/not-found.vue')
  }
];

export const router = createRouter({
  history: createWebHistory(),
  routes
})