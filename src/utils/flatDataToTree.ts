import {StoredTreeItem} from '../types'
import {flatDataToTree as flatDataToTreeUtil, TreeItemWithChildren} from './treeUtils'

export default function flatDataToTree<T extends StoredTreeItem>(data: T[]): TreeItemWithChildren<T>[] {
  // Ensure parent is null instead of undefined for proper tree construction
  const normalizedData = data.map((item) => ({
    ...item,
    parent: item.parent || null,
  }))
  return flatDataToTreeUtil(normalizedData)
}

export type {TreeItemWithChildren}
