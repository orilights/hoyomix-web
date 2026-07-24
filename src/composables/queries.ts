import type { PlaylistsQueryParams } from '@/api/music'
import type { SearchType } from '@/types/search'
import { useQuery } from '@tanstack/vue-query'
import {
  getAlbumInfoApi,
  getAlbumListApi,
  getAlbumsByTagApi,
  getArtistInfoApi,
  getChangelog,
  getCreditInfoApi,
  getLyricsApi,
  getMyPlaylistsApi,
  getPlaylistDetailApi,
  getPublicPlaylistsApi,
  getProductListApi,
  getSearchApi,
  getSongInfoApi,
} from '@/api/music'

export function useProductListQuery() {
  return useQuery({
    queryKey: ['productList'],
    queryFn: () => getProductListApi(),
    staleTime: 1000 * 60 * 10,
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

export function useTagAlbumsQuery(tagType: string, tagName: Ref<string | null>) {
  return useQuery({
    queryKey: computed(() => ['tagAlbums', tagType, tagName.value]),
    queryFn: () => getAlbumsByTagApi(tagType, tagName.value!),
    enabled: computed(() => !!tagType && !!tagName.value),
  })
}

export function usePlaylistsQuery(params: Ref<PlaylistsQueryParams>) {
  return useQuery({
    queryKey: computed(() => ['playlists', params.value]),
    queryFn: () => getPublicPlaylistsApi(params.value),
    staleTime: 1000 * 30,
  })
}

export function useMyPlaylistsQuery() {
  return useQuery({
    queryKey: ['myPlaylists'],
    queryFn: () => getMyPlaylistsApi(),
    staleTime: 1000 * 30,
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
