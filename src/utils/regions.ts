import type { MapTreeNode } from '@/types/core'

export interface RegionPathNode {
  id: number
  name: string
}

/** 浏览目录只保留自身或后代存在歌曲的地区；编辑仍使用完整地区树。 */
export function filterPopulatedRegions(tree: MapTreeNode[]): MapTreeNode[] {
  return tree
    .filter(node => (node.songCount ?? 0) > 0)
    .map(node => ({ ...node, children: filterPopulatedRegions(node.children) }))
}

export function buildRegionIndex(tree: MapTreeNode[]) {
  const index = new Map<number, { node: MapTreeNode, path: RegionPathNode[] }>()
  function visit(nodes: MapTreeNode[], ancestors: RegionPathNode[] = []) {
    for (const node of nodes) {
      const path = [...ancestors, { id: node.id, name: node.name }]
      index.set(node.id, { node, path })
      visit(node.children, path)
    }
  }
  visit(tree)
  return index
}
