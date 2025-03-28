import type { AlbumData } from '@/types/core'
import { artistTypeSort } from '@/constants'

export function getTypes(musics: { name: string, type: string[] }[]) {
  return Array.from(new Set(musics.map(music => music.type).flat()))
}

export function getArtistsData(albumInfo: AlbumData[]) {
  const result: {
    name: string
    musics: {
      name: string
      type: string[]
    }[]
  }[] = []
  albumInfo.forEach((album) => {
    album.musics.forEach((music) => {
      music.artists.forEach((artist) => {
        const artistItem = result.find(item => item.name === artist.name)
        if (!artistItem) {
          result.push({
            name: artist.name,
            musics: [],
          })
        }
        const musicItem = result.find(item => item.name === artist.name)!.musics.find(item => item.name === music.name)
        if (!musicItem) {
          result.find(item => item.name === artist.name)!.musics.push({
            name: music.name,
            type: [],
          })
        }
        result.find(item => item.name === artist.name)!.musics.find(item => item.name === music.name)!.type.push(artist.type)
      })
    })
  })
  result.sort((a, b) => {
    function getIndex(type: string) {
      const index = artistTypeSort.indexOf(type)
      if (index === -1) {
        return 999
      }
      return index
    }
    function getSort(types: string[]) {
      return Math.min(...types.map(type => getIndex(type)))
    }
    const diff = getSort(getTypes(a.musics)) - getSort(getTypes(b.musics))
    if (diff === 0) {
      return b.musics.length - a.musics.length
    }
    return diff
  })
  return result
}

export function getArtistsData2(albumList: AlbumData[], musicId?: number) {
  const typeList: {
    name: string
    artists: {
      name: string
      musics: string[]
    }[]
  }[] = []
  albumList.forEach((album) => {
    album.musics.forEach((music) => {
      if (musicId) {
        if (music.netease.id !== musicId)
          return
      }
      music.artists.forEach((artist) => {
        if (artist.name === 'HOYO-MiX')
          return
        const typeItem = typeList.find(item => item.name === artist.type)
        if (!typeItem) {
          typeList.push({
            name: artist.type,
            artists: [],
          })
        }
        const artistItem = typeList.find(item => item.name === artist.type)!.artists.find(item => item.name === artist.name)
        if (!artistItem) {
          typeList.find(item => item.name === artist.type)!.artists.push({
            name: artist.name,
            musics: [],
          })
        }
        typeList.find(item => item.name === artist.type)!.artists.find(item => item.name === artist.name)!.musics.push(music.name)
      })
    })
  })
  typeList.forEach((type) => {
    type.artists.sort((a, b) => b.musics.length - a.musics.length)
  })
  function getIndex(type: string) {
    const index = artistTypeSort.indexOf(type)
    if (index === -1) {
      return 999
    }
    return index
  }
  function getSort(types: string[]) {
    return Math.min(...types.map(type => getIndex(type)))
  }
  typeList.sort((a, b) => getSort([a.name]) - getSort([b.name]))
  return typeList
}

export function getArtistData(albumList: AlbumData[], artistName: string) {
  const typeList: {
    name: string
    musics: string[]
  }[] = []
  albumList.forEach((album) => {
    album.musics.forEach((music) => {
      music.artists.forEach((artist) => {
        if (artist.name === artistName) {
          const typeItem = typeList.find(item => item.name === artist.type)
          if (!typeItem) {
            typeList.push({
              name: artist.type,
              musics: [],
            })
          }
          typeList.find(item => item.name === artist.type)!.musics.push(music.name)
        }
      })
    })
  })
  return typeList
}
