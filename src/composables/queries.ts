import type { PlaylistsQueryParams } from '@/api/music'
import type { SearchType } from '@/types/search'
import { useQuery } from '@tanstack/vue-query'
import { getCommentRepliesApi, getCommentThreadsApi } from '@/api/comment'
import {
  fetchAppConfig,
  getAlbumInfoApi,
  getAlbumListApi,
  getAlbumsByTagApi,
  getArtistInfoApi,
  getArtistNameByAliasApi,
  getChangelog,
  getCreditInfoApi,
  getFavoritePlaylistsApi,
  getLyricsApi,
  getMapTreeApi,
  getMyPlaylistsApi,
  getPlaylistDetailApi,
  getPublicPlaylistsApi,
  getSearchApi,
  getSongInfoApi,
} from '@/api/music'
import { useAuthStore } from '@/store/auth'
import { NotFoundError } from '@/utils/fetch'

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

export function useMapTreeQuery(game: Ref<string>, enabled: Ref<boolean>) {
  return useQuery({
    queryKey: computed(() => ['mapTree', game.value]),
    queryFn: () => getMapTreeApi(game.value),
    enabled: computed(() => enabled.value && !!game.value),
  })
}
