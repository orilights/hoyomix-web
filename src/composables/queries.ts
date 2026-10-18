import type { MapSongsParams, MapSongsSort, PlaylistsQueryParams, RandomPlaylistParams } from '@/api/music'
import type { ContributionRankingPeriod } from '@/types/core'
import type { EditRequestParams } from '@/types/edit-request'
import type { SearchType } from '@/types/search'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { getCommentRepliesApi, getCommentThreadsApi } from '@/api/comment'
import { getEmoticonsApi } from '@/api/emoticon'
import { getChangelog, getNotice } from '@/api/misc'
import {
  addAlbumFavoriteApi,
  fetchAppConfig,
  getAlbumFavoritesApi,
  getAlbumInfoApi,
  getAlbumListApi,
  getAlbumsByTagApi,
  getArtistInfoApi,
  getArtistNameByAliasApi,
  getContributionRankingApi,
  getContributionsApi,
  getCreditInfoApi,
  getEditRequestApi,
  getFavoritePlaylistsApi,
  getLyricsApi,
  getMapPlaybackApi,
  getMapSongsApi,
  getMapTreeApi,
  getMyEditRequestsApi,
  getMyPlaylistsApi,
  getPlaylistDetailApi,
  getPublicPlaylistsApi,
  getRandomPlaylistApi,
  getSearchApi,
  getSongInfoApi,
  removeAlbumFavoriteApi,
  updatePlaylistSongsApi,
} from '@/api/music'
import { useAuthStore } from '@/store/auth'
import { useMainStore } from '@/store/main'
import { NotFoundError } from '@/utils/fetch'

export function useAlbumFavoritesQuery() {
  const auth = useAuthStore()
  return useQuery({
    queryKey: computed(() => ['albumFavorites', auth.user?.id ?? null]),
    queryFn: async ({ queryKey }) => {
      const userId = queryKey[1]
      const result = await getAlbumFavoritesApi()
      return { ...result, userId }
    },
    enabled: computed(() => !auth.isPending && auth.isLoggedIn),
  })
}

export function useAlbumFavoriteMutation() {
  const auth = useAuthStore()
  const store = useMainStore()
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ albumId, favorite }: { albumId: number, favorite: boolean }) => favorite ? addAlbumFavoriteApi(albumId) : removeAlbumFavoriteApi(albumId),
    onMutate: async ({ albumId, favorite }) => {
      const userId = auth.user?.id
      const revision = store.favoritesRevision
      await client.cancelQueries({ queryKey: ['albumFavorites', userId] })
      if (revision !== store.favoritesRevision || userId !== auth.user?.id)
        throw new Error('登录状态已变化，请重试')
      const wasFavorited = store.favoriteAlbumIds.includes(albumId)
      store.pendingAlbumFavorites.push(albumId)
      store.favoriteAlbumIds = store.favoriteAlbumIds.filter(id => id !== albumId)
      if (favorite)
        store.favoriteAlbumIds.push(albumId)
      return { userId, revision, wasFavorited }
    },
    onError: (_error, { albumId }, context) => {
      if (!context || context.revision !== store.favoritesRevision)
        return
      store.favoriteAlbumIds = store.favoriteAlbumIds.filter(id => id !== albumId)
      if (context.wasFavorited)
        store.favoriteAlbumIds.push(albumId)
    },
    onSettled: (_data, _error, { albumId }, context) => {
      if (!context || context.revision !== store.favoritesRevision)
        return
      store.pendingAlbumFavorites = store.pendingAlbumFavorites.filter(id => id !== albumId)
      if (!store.pendingAlbumFavorites.length)
        return client.invalidateQueries({ queryKey: ['albumFavorites', context.userId] })
    },
  })
}

export function useSavePlaylistOrderQuery() {
  return useMutation({
    mutationFn: ({ id, songIds }: { id: string, songIds: number[] }) => updatePlaylistSongsApi(id, songIds),
  })
}

export function useRandomPlaylistQuery() {
  return useMutation({
    mutationFn: (params: RandomPlaylistParams) => getRandomPlaylistApi(params),
  })
}

export function useEmoticonsQuery(enabled: Ref<boolean> = ref(true)) {
  return useQuery({
    queryKey: ['emoticons'],
    queryFn: getEmoticonsApi,
    enabled,
  })
}

export function useMyEditRequestsQuery(params: Ref<EditRequestParams>, enabled: Ref<boolean> = ref(true)) {
  const auth = useAuthStore()
  return useQuery({
    queryKey: computed(() => ['editRequests', auth.user?.id ?? null, params.value]),
    queryFn: () => getMyEditRequestsApi(params.value),
    enabled: computed(() => !auth.isPending && auth.isLoggedIn && enabled.value),
    staleTime: 0,
  })
}

export function useEditRequestQuery(id: Ref<number | null>) {
  const auth = useAuthStore()
  return useQuery({
    queryKey: computed(() => ['editRequestDetail', auth.user?.id ?? null, id.value]),
    queryFn: () => getEditRequestApi(id.value!),
    enabled: computed(() => !auth.isPending && auth.isLoggedIn && id.value !== null),
    staleTime: 0,
  })
}

export function useAppConfigQuery() {
  return useQuery({
    queryKey: ['appConfig'],
    queryFn: () => fetchAppConfig(),
    staleTime: Infinity,
  })
}

export function useAlbumListQuery() {
  return useQuery({
    queryKey: ['albumList'],
    queryFn: () => getAlbumListApi(),
    staleTime: 1000 * 60 * 10,
  })
}

export function useAlbumInfoQuery(albumId: Ref<number | null>) {
  return useQuery({
    queryKey: computed(() => ['albumInfo', albumId.value]),
    queryFn: () => getAlbumInfoApi(albumId.value!),
    enabled: computed(() => !!albumId.value),
  })
}

export function useSongInfoQuery(songId: Ref<number | null>) {
  return useQuery({
    queryKey: computed(() => ['songInfo', songId.value]),
    queryFn: () => getSongInfoApi(songId.value!),
    enabled: computed(() => !!songId.value),
  })
}

export function useArtistInfoQuery(name: Ref<string | null>) {
  return useQuery({
    queryKey: computed(() => ['artistInfo', name.value]),
    queryFn: () => getArtistInfoApi(name.value!),
    enabled: computed(() => !!name.value),
  })
}

export function useArtistNameByAliasQuery(alias: Ref<string | null>) {
  return useQuery({
    queryKey: computed(() => ['artistNameByAlias', alias.value]),
    queryFn: () => getArtistNameByAliasApi(alias.value!),
    enabled: computed(() => !!alias.value),
    retry: (failureCount, error) => !(error instanceof NotFoundError) && failureCount < 1,
  })
}

export function useCreditInfoQuery(
  id: Ref<number | string | null>,
  type: Ref<'album' | 'song' | 'product'>,
) {
  return useQuery({
    queryKey: computed(() => ['creditInfo', id.value, type.value]),
    queryFn: () => getCreditInfoApi(id.value!, type.value),
    enabled: computed(() => !!id.value),
  })
}

export function useLyricsQuery(
  provider: Ref<'ncm' | 'qq' | null>,
  songId: Ref<number | null>,
) {
  return useQuery({
    queryKey: computed(() => ['lyrics', provider.value, songId.value]),
    queryFn: () => getLyricsApi(provider.value!, songId.value!),
    enabled: computed(() => !!provider.value && !!songId.value),
    staleTime: 1000 * 60 * 30,
  })
}

export function useChangelogQuery() {
  return useQuery({
    queryKey: ['changelog'],
    queryFn: () => getChangelog(),
    staleTime: 1000 * 60 * 60,
  })
}

export function useNoticeQuery() {
  return useQuery({
    queryKey: ['notice'],
    queryFn: getNotice,
    staleTime: 1000 * 60 * 60,
  })
}

export function useSearchQuery(
  keyword: Ref<string>,
  type: Ref<SearchType | undefined>,
) {
  return useQuery({
    queryKey: computed(() => ['search', keyword.value, type.value]),
    queryFn: () => getSearchApi(keyword.value, type.value, 10),
    enabled: computed(() => !!keyword.value.trim()),
    staleTime: 1000 * 30,
  })
}

export function useTagAlbumsQuery(tagType: string, tagName: Ref<string | null>, enabled?: Ref<boolean>) {
  return useQuery({
    queryKey: computed(() => ['tagAlbums', tagType, tagName.value]),
    queryFn: () => getAlbumsByTagApi(tagType, tagName.value!),
    enabled: computed(() => !!tagType && !!tagName.value && (enabled?.value ?? true)),
  })
}

export function usePublicPlaylistsQuery(params: Ref<PlaylistsQueryParams>) {
  return useQuery({
    queryKey: computed(() => ['playlists', params.value]),
    queryFn: () => getPublicPlaylistsApi(params.value),
    staleTime: 1000 * 30,
  })
}

export function useMyPlaylistsQuery() {
  const auth = useAuthStore()
  return useQuery({
    queryKey: computed(() => ['myPlaylists', auth.user?.id ?? null]),
    queryFn: () => getMyPlaylistsApi(),
    enabled: computed(() => auth.isLoggedIn),
    staleTime: 0,
  })
}

export function useFavoritePlaylistsQuery() {
  const auth = useAuthStore()
  return useQuery({
    queryKey: computed(() => ['favoritePlaylists', auth.user?.id ?? null]),
    queryFn: () => getFavoritePlaylistsApi().then(res => res.items),
    enabled: computed(() => auth.isLoggedIn),
    staleTime: 0,
  })
}

export function usePlaylistDetailQuery(id: Ref<string | null>) {
  return useQuery({
    queryKey: computed(() => ['playlistDetail', id.value]),
    queryFn: () => getPlaylistDetailApi(id.value!),
    enabled: computed(() => !!id.value),
    refetchOnMount: 'always',
  })
}

export function useCommentThreadsQuery(
  postId: Ref<string | null>,
  userId: Ref<string | null>,
  page: Ref<number>,
) {
  return useQuery({
    queryKey: computed(() => ['commentThreads', postId.value, page.value, userId.value]),
    queryFn: () => getCommentThreadsApi(postId.value!, page.value),
    enabled: computed(() => !!postId.value),
    staleTime: 1000 * 30,
  })
}

export function useCommentRepliesQuery(
  threadId: Ref<string | null>,
  postId: Ref<string | null>,
  page: Ref<number>,
  userId: Ref<string | null>,
  enabled?: Ref<boolean>,
) {
  return useQuery({
    queryKey: computed(() => ['commentReplies', postId.value, threadId.value, page.value, userId.value]),
    queryFn: () => getCommentRepliesApi(threadId.value!, postId.value!, page.value),
    enabled: computed(() => !!threadId.value && !!postId.value && (enabled?.value ?? true)),
    staleTime: 1000 * 30,
  })
}

export function useMapTreeQuery(game: Ref<string>, enabled: Ref<boolean>, withSongCounts = false) {
  return useQuery({
    queryKey: computed(() => ['mapTree', game.value, withSongCounts]),
    queryFn: () => getMapTreeApi(game.value, withSongCounts),
    enabled: computed(() => enabled.value && !!game.value),
  })
}

export function useMapSongsQuery(id: Ref<number | null>, params: Ref<MapSongsParams>) {
  return useQuery({
    queryKey: computed(() => ['mapSongs', id.value, params.value]),
    queryFn: () => getMapSongsApi(id.value!, params.value),
    enabled: computed(() => id.value !== null && params.value.game === 'genshin'),
  })
}

export function useMapPlaybackQuery() {
  return useMutation({
    mutationFn: ({ id, game, includeChildren, sort }: { id: number, game: string, includeChildren: boolean, sort: MapSongsSort }) => getMapPlaybackApi(id, game, includeChildren, sort),
  })
}

export function useContributionsQuery(id: Ref<number | null>, type: Ref<'album' | 'song'>) {
  return useQuery({
    queryKey: computed(() => ['contributions', type.value, id.value]),
    queryFn: () => getContributionsApi(id.value!, type.value),
    enabled: computed(() => !!id.value),
  })
}

export function useContributionRankingQuery(period: Ref<ContributionRankingPeriod>) {
  return useQuery({
    queryKey: computed(() => ['contributionRanking', period.value]),
    queryFn: () => getContributionRankingApi(period.value),
    staleTime: 60_000,
  })
}
