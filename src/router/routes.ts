import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue'),
  },
  {
    path: '/settings',
    name: 'Settings',
    meta: {
      hideCopyright: true,
    },
    component: () => import('@/views/Settings.vue'),
  },
  // {
  //   path: '/product/:name',
  //   name: 'ProductInfo',
  //   component: () => import('@/views/Product.vue'),
  // },
  {
    path: '/album/:id',
    name: 'AlbumInfo',
    component: () => import('@/views/Album.vue'),
  },
  {
    path: '/album/:albumId/music/:musicId',
    name: 'MusicInfo',
    component: () => import('@/views/Music.vue'),
  },
  // {
  //   path: '/artist/:name',
  //   name: 'ArtistInfo',
  //   component: () => import('@/views/Artist.vue'),
  // },
]

export default routes
