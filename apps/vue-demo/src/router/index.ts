import { createRouter, createWebHistory } from 'vue-router'
import BasicDemo from '@/pages/BasicDemo.vue'
import EditableDemo from '@/pages/EditableDemo.vue'
import MultipleDemo from '@/pages/MultipleDemo.vue'
import SearchDemo from '@/pages/SearchDemo.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: BasicDemo,
    },
    {
      path: '/editable',
      component: EditableDemo,
    },
    {
      path: '/multiple',
      component: MultipleDemo,
    },
    {
      path: '/search',
      component: SearchDemo,
    },
  ],
})

export default router
