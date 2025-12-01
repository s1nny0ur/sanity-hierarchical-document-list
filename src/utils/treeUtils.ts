import {StoredTreeItem} from '../types'

/**
 * Type for tree items with children (nested structure)
 */
export type TreeItemWithChildren<T extends StoredTreeItem = StoredTreeItem> = T & {
  children?: TreeItemWithChildren<T>[]
}

/**
 * Flat data item with path information for tree operations
 */
export interface FlatDataItem<T extends StoredTreeItem = StoredTreeItem> {
  node: T
  path: string[]
  treeIndex: number
  parentNode?: T
}

/**
 * Convert flat data array (with parent references) to nested tree structure.
 * Replaces getTreeFromFlatData from @nosferatu500/react-sortable-tree
 */
export function flatDataToTree<T extends StoredTreeItem>(
  data: T[]
): TreeItemWithChildren<T>[] {
  // Create a map for quick lookup
  const itemMap = new Map<string, TreeItemWithChildren<T>>()
  const rootItems: TreeItemWithChildren<T>[] = []

  // Initialize all items in the map with empty children arrays
  for (const item of data) {
    itemMap.set(item._key, {...item, children: []})
  }

  // Build the tree structure
  for (const item of data) {
    const treeItem = itemMap.get(item._key)!
    const parentKey = item.parent

    if (parentKey && itemMap.has(parentKey)) {
      // Add to parent's children
      const parent = itemMap.get(parentKey)!
      parent.children = parent.children || []
      parent.children.push(treeItem)
    } else {
      // No parent or parent not found, add to root
      rootItems.push(treeItem)
    }
  }

  return rootItems
}

/**
 * Convert nested tree structure back to flat array with path information.
 * Replaces getFlatDataFromTree from @nosferatu500/react-sortable-tree
 */
export function getFlatDataFromTree<T extends StoredTreeItem>(options: {
  treeData: TreeItemWithChildren<T>[]
  getNodeKey: (item: {node: T}) => string
}): FlatDataItem<T>[] {
  const {treeData, getNodeKey} = options
  const result: FlatDataItem<T>[] = []

  function traverse(
    items: TreeItemWithChildren<T>[],
    path: string[] = [],
    parentNode?: T
  ) {
    for (const item of items) {
      const nodeKey = getNodeKey({node: item as T})
      const currentPath = [...path, nodeKey]

      result.push({
        node: item as T,
        path: currentPath,
        treeIndex: result.length,
        parentNode
      })

      if (Array.isArray(item.children) && item.children.length > 0) {
        traverse(item.children, currentPath, item as T)
      }
    }
  }

  traverse(treeData)
  return result
}

/**
 * Count visible nodes in a tree (respecting expanded/collapsed state).
 * Replaces getVisibleNodeCount from @nosferatu500/react-sortable-tree
 */
export function getVisibleNodeCount<T extends {expanded?: boolean; children?: T[]}>(options: {
  treeData: T[]
}): number {
  const {treeData} = options

  function countNodes(items: T[]): number {
    let count = 0
    for (const item of items) {
      count += 1
      if (item.expanded !== false && Array.isArray(item.children)) {
        count += countNodes(item.children)
      }
    }
    return count
  }

  return countNodes(treeData)
}

/**
 * Check if a node is a descendant of another node.
 * Replaces isDescendant from @nosferatu500/react-sortable-tree
 */
export function isDescendant<T extends {_key: string; children?: T[]}>(
  older: T,
  younger: T
): boolean {
  if (!older.children || !Array.isArray(older.children)) {
    return false
  }

  for (const child of older.children) {
    if (child._key === younger._key) {
      return true
    }
    if (isDescendant(child, younger)) {
      return true
    }
  }

  return false
}

/**
 * Get the depth of a node in the tree (0-indexed)
 */
export function getNodeDepth<T extends StoredTreeItem>(
  node: T,
  allItems: T[]
): number {
  let depth = 0
  let currentKey = node.parent

  while (currentKey) {
    const parentKey = currentKey
    const parent = allItems.find((item) => item._key === parentKey)
    if (!parent) {
 break
}
    depth++
    currentKey = parent.parent
  }

  return depth
}

/**
 * Flatten a nested tree back to a simple array (loses hierarchy info)
 */
export function flattenTree<T extends {children?: T[]}>(tree: T[]): Omit<T, 'children'>[] {
  const result: Omit<T, 'children'>[] = []

  function traverse(items: T[]) {
    for (const item of items) {
      const {children, ...rest} = item
      result.push(rest as Omit<T, 'children'>)
      if (Array.isArray(children)) {
        traverse(children)
      }
    }
  }

  traverse(tree)
  return result
}

/**
 * Find a node and all its descendants
 */
export function getNodeWithDescendants<T extends StoredTreeItem>(
  node: T,
  allItems: T[]
): T[] {
  const result: T[] = [node]

  function findChildren(parentKey: string) {
    for (const item of allItems) {
      if (item.parent === parentKey) {
        result.push(item)
        findChildren(item._key)
      }
    }
  }

  findChildren(node._key)
  return result
}
