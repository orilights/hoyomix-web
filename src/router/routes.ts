import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue'),
  },
  {
    path: '/albums',
    name: 'Albums',
    component: () => import('@/views/Albums.vue'),
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/Settings.vue'),
  },
  {
    path: '/statistics',
    name: 'Statistics',
    component: () => import('@/views/Statistics.vue'),
  },
  {
    path: '/product/:name',
    name: 'ProductInfo',
    component: () => import('@/views/Product.vue'),
  },
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
  {
    path: '/artist/:name',
    name: 'ArtistInfo',
    component: () => import('@/views/Artist.vue'),
  },
  {
    path: '/album/series/:seriesName',
    name: 'AlbumSeries',
    component: () => import('@/views/AlbumSeries.vue'),
  },
  {
    path: '/playlists',
    name: 'Playlists',
    component: () => import('@/views/Playlists.vue'),
  },
  {
    path: '/playlist/:id',
    name: 'PlaylistDetail',
    component: () => import('@/views/Playlist.vue'),
  },
  {
    path: '/random',
    name: 'Random',
    component: () => import('@/views/Random.vue'),
  },
  {
    path: '/email-verified',
    name: 'EmailVerified',
    component: () => import('@/views/EmailVerified.vue'),
  },
]

export default routes
