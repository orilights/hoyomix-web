import type { Component } from 'vue'
import type { MessageKey } from '@/i18n'
import { Disc3, House, ListMusic, MapPin, Shuffle, Tags, TrendingUp, Trophy } from '@lucide/vue'

interface SidebarItem {
  name: string
  label: MessageKey
  icon: Component
  required?: boolean
}

export const sidebarNavigation: SidebarItem[] = [
  { name: 'Home', label: 'DesktopSidebar.home', icon: House, required: true },
  { name: 'Albums', label: 'DesktopSidebar.all_albums', icon: Disc3, required: true },
  { name: 'Playlists', label: 'DesktopSidebar.community_playlists', icon: ListMusic },
  { name: 'Random', label: 'DesktopSidebar.shuffle', icon: Shuffle },
  { name: 'Regions', label: 'DesktopSidebar.regions', icon: MapPin },
  { name: 'SongTags', label: 'DesktopSidebar.tags', icon: Tags },
  { name: 'Ranking', label: 'DesktopSidebar.charts', icon: TrendingUp },
  { name: 'ContributionRanking', label: 'DesktopSidebar.contributors', icon: Trophy },
]
