import {DocumentPathInfo, StoredTreeItem} from '../types'
import flatDataToTree from './flatDataToTree'
import {TreeItemWithChildren} from './treeUtils'

/**
 * Compute path information for all documents in the tree.
 * This provides hierarchy metadata that can be used to generate
 * slugs, breadcrumbs, or sync to individual documents.
 */
export function computeAllPaths(tree: StoredTreeItem[]): DocumentPathInfo[] {
  const treeWithChildren = flatDataToTree(tree)
  const paths: DocumentPathInfo[] = []

  function traverse(
    nodes: TreeItemWithChildren<StoredTreeItem>[],
    ancestors: string[] = [],
    depth: number = 0
  ): void {
    nodes.forEach((node, siblingIndex) => {
      const docId = node.value?.reference?._ref
      const docType = node.value?.docType

      if (docId) {
        paths.push({
          docId,
          docType: docType || 'unknown',
          ancestors: [...ancestors],
          nodeKey: node._key,
          parentNodeKey: node.parent || null,
          depth,
          siblingIndex,
        })
      }

      if (node.children?.length) {
        traverse(node.children, docId ? [...ancestors, docId] : ancestors, depth + 1)
      }
    })
  }

  traverse(treeWithChildren)
  return paths
}

/**
 * Extract affected document IDs from the change.
 * Includes the changed nodes and all their descendants.
 */
export function getAffectedDocIds(tree: StoredTreeItem[], changedNodeKeys: string[]): string[] {
  const treeWithChildren = flatDataToTree(tree)
  const affected = new Set<string>()

  function collectDescendants(
    nodes: TreeItemWithChildren<StoredTreeItem>[],
    collecting: boolean
  ): void {
    for (const node of nodes) {
      const shouldCollect = collecting || changedNodeKeys.includes(node._key)

      if (shouldCollect && node.value?.reference?._ref) {
        affected.add(node.value.reference._ref)
      }

      if (node.children?.length) {
        collectDescendants(node.children, shouldCollect)
      }
    }
  }

  collectDescendants(treeWithChildren, false)
  return Array.from(affected)
}
