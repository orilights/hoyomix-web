import type { RouteRecordRaw } from 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    /** 显示悬浮的“返回顶部”按钮 */
    showScrollToTop?: boolean
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/edit-requests',
    name: 'EditRequests',
    meta: { showScrollToTop: true },
    component: () => import('@/views/EditRequests.vue'),
  },
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue'),
  },
  {
    path: '/albums',
    name: 'Albums',
    meta: { showScrollToTop: true },
    component: () => import('@/views/Albums.vue'),
  },
  {
    path: '/settings',
    name: 'Settings',
    meta: { showScrollToTop: true },
    component: () => import('@/views/Settings.vue'),
  },
  {
    path: '/feedback',
    name: 'Feedback',
    meta: { showScrollToTop: true },
    component: () => import('@/views/Feedback.vue'),
  },
  {
    path: '/statistics',
    name: 'Statistics',
    component: () => import('@/views/Statistics.vue'),
  },
  {
    path: '/product/:name',
    name: 'ProductInfo',
    meta: { showScrollToTop: true },
    component: () => import('@/views/Product.vue'),
  },
  {
    path: '/album/:id',
    name: 'AlbumInfo',
    meta: { showScrollToTop: true },
    component: () => import('@/views/Album.vue'),
  },
  {
    path: '/album/:albumId/music/:musicId',
    name: 'MusicInfo',
    meta: { showScrollToTop: true },
    component: () => import('@/views/Music.vue'),
  },
  {
    path: '/artist/:name',
    name: 'ArtistInfo',
    meta: { showScrollToTop: true },
    component: () => import('@/views/Artist.vue'),
  },
  {
    path: '/album/series/:seriesName',
    name: 'AlbumSeries',
    meta: { showScrollToTop: true },
    component: () => import('@/views/AlbumSeries.vue'),
  },
  {
    path: '/playlists',
    name: 'Playlists',
    meta: { showScrollToTop: true },
    component: () => import('@/views/Playlists.vue'),
  },
  {
    path: '/playlist/:id',
    name: 'PlaylistDetail',
    meta: { showScrollToTop: true },
    component: () => import('@/views/Playlist.vue'),
  },
  {
    path: '/playlist/:playlistId/music/:musicId',
    name: 'PlaylistMusicInfo',
    meta: { showScrollToTop: true },
    component: () => import('@/views/Music.vue'),
  },
  {
    path: '/random',
    name: 'Random',
    meta: { showScrollToTop: true },
    component: () => import('@/views/Random.vue'),
  },
  {
    path: '/ranking',
    name: 'Ranking',
    meta: { showScrollToTop: true },
    component: () => import('@/views/Ranking.vue'),
  },
  {
    path: '/email-verified',
    name: 'EmailVerified',
    component: () => import('@/views/EmailVerified.vue'),
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: () => import('@/views/ResetPassword.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue'),
  },
]

export default routes
