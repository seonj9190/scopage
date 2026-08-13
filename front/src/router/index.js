import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue'),
    meta: { title: '서귀포챔버오케스트라' },
  },
  {
    path: '/about',
    name: 'About',
    component: () => import('../views/About.vue'),
    meta: { title: '소개' },
  },
  {
    path: '/members',
    name: 'Members',
    component: () => import('../views/Members.vue'),
    meta: { title: '단원소개' },
  },
  {
    path: '/performances',
    name: 'Performances',
    component: () => import('../views/Performances.vue'),
    meta: { title: '공연일정' },
  },
  {
    path: '/gallery',
    name: 'Gallery',
    component: () => import('../views/Gallery.vue'),
    meta: { title: '갤러리' },
  },
  {
    path: '/inquiry',
    name: 'Inquiry',
    component: () => import('../views/Inquiry.vue'),
    meta: { title: '공연문의' },
  },
  {
    path: '/support',
    name: 'Support',
    component: () => import('../views/Support.vue'),
    meta: { title: '후원' },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.afterEach((to) => {
  const base = '서귀포챔버오케스트라'
  document.title = to.meta?.title && to.name !== 'Home' ? `${to.meta.title} | ${base}` : base
})

export default router
