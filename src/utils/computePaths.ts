import {SanityDocument} from 'sanity'

import {AllItems, DocumentPathInfo, SlugFieldConfig, StoredTreeItem} from '../types'
import flatDataToTree from './flatDataToTree'
import {TreeItemWithChildren} from './treeUtils'

/**
 * Options for computing paths with slug information.
 */
export interface ComputePathsOptions {
  /** All documents indexed by published ID */
  allItems?: AllItems
  /** Slug field configuration */
  slugField?: SlugFieldConfig
  /** Path separator for joining slugs (default: '/') */
  pathSeparator?: string
}

/**
 * Get a nested property value from an object using dot notation.
 * @example getNestedValue({slug: {current: 'foo'}}, 'slug.current') // 'foo'
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current, key) => {
    return current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined
  }, obj as unknown)
}

/**
 * Extract slug from a document using the configured slugField.
 */
function extractSlug(doc: SanityDocument | undefined, slugField: SlugFieldConfig): string | undefined {
  if (!doc) {
    return undefined
  }

  if (typeof slugField === 'function') {
    return slugField(doc)
  }

  const value = getNestedValue(doc as Record<string, unknown>, slugField)
  return typeof value === 'string' ? value : undefined
}

/**
 * Get the document from allItems, preferring published over draft.
 */
function getDocument(allItems: AllItems, docId: string): SanityDocument | undefined {
  const pair = allItems[docId]
  return pair?.published || pair?.draft
}

/**
 * Compute path information for all documents in the tree.
 * This provides hierarchy metadata that can be used to generate
 * slugs, breadcrumbs, or sync to individual documents.
 *
 * @param tree - The flat tree array
 * @param options - Optional configuration for slug computation
 */
export function computeAllPaths(
  tree: StoredTreeItem[],
  options: ComputePathsOptions = {}
): DocumentPathInfo[] {
  const {allItems, slugField, pathSeparator = '/'} = options
  const treeWithChildren = flatDataToTree(tree)
  const paths: DocumentPathInfo[] = []

  // Pre-compute slug lookup if slugField is configured
  const slugLookup: Map<string, string | undefined> = new Map()
  if (slugField && allItems) {
    for (const docId of Object.keys(allItems)) {
      const doc = getDocument(allItems, docId)
      slugLookup.set(docId, extractSlug(doc, slugField))
    }
  }

  function traverse(
    nodes: TreeItemWithChildren<StoredTreeItem>[],
    ancestors: string[] = [],
    ancestorSlugs: string[] = [],
    depth: number = 0
  ): void {
    nodes.forEach((node, siblingIndex) => {
      const docId = node.value?.reference?._ref
      const docType = node.value?.docType

      if (docId) {
        const pathInfo: DocumentPathInfo = {
          docId,
          docType: docType || 'unknown',
          ancestors: [...ancestors],
          nodeKey: node._key,
          parentNodeKey: node.parent || null,
          depth,
          siblingIndex,
        }

        // Add slug information if slugField is configured
        if (slugField && allItems) {
          const slug = slugLookup.get(docId)
          pathInfo.slug = slug
          pathInfo.ancestorSlugs = [...ancestorSlugs]

          // Compute full path segments and path string
          const segments = [...ancestorSlugs]
          if (slug) {
            segments.push(slug)
          }
          pathInfo.computedSegments = segments

          // Build the computed path with separator
          if (segments.length > 0) {
            pathInfo.computedPath = pathSeparator + segments.join(pathSeparator)
          } else {
            pathInfo.computedPath = pathSeparator
          }
        }

        paths.push(pathInfo)
      }

      if (node.children?.length) {
        const currentSlug = docId ? slugLookup.get(docId) : undefined
        const newAncestorSlugs = currentSlug ? [...ancestorSlugs, currentSlug] : ancestorSlugs

        traverse(
          node.children,
          docId ? [...ancestors, docId] : ancestors,
          newAncestorSlugs,
          depth + 1
        )
      }
    })
  }

  traverse(treeWithChildren, [], [])
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
