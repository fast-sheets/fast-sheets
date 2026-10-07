import { createRouter, createWebHistory } from 'vue-router'
import Basic from '@/pages/Basic.vue'
import Editable from '@/pages/Editable.vue'
import Multiple from '@/pages/Multiple.vue'
import Search from '@/pages/Search.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: Basic,
    },
    {
      path: '/editable',
      component: Editable,
    },
    {
      path: '/multiple',
      component: Multiple,
    },
    {
      path: '/search',
      component: Search,
    },
  ],
})

export default router
