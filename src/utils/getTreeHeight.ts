import {LocalTreeItem} from '../types'
import {getVisibleNodeCount} from './treeUtils'

export default function getTreeHeight(treeData: LocalTreeItem[], rowHeight: number): string {
  const visibleNodeCount = getVisibleNodeCount({treeData})

  // prettier-ignore
  return `${50 + (rowHeight * visibleNodeCount)}px`
}
