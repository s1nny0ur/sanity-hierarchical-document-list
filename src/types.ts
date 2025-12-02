import * as React from 'react'
import {ArraySchemaType, ObjectSchemaType, SanityDocument} from 'sanity'

import {INTERNAL_NODE_TYPE, INTERNAL_NODE_VALUE_TYPE} from './utils/injectNodeTypeInPatches'

interface SanityReference {
  _type: 'reference'
  _ref: string
  _weak?: boolean
}

/**
 * Objects saved to tree documents in Sanity's Content Lake
 */
export interface StoredTreeItem {
  _key: string
  _type: typeof INTERNAL_NODE_TYPE | string
  value?: {
    _type: typeof INTERNAL_NODE_VALUE_TYPE | string
    reference?: SanityReference
    docType?: string
  }
  /**
   * _key of parent node
   */
  parent?: string | null
}

/**
 * Tree items enhanced locally in the client with info from `allItems` and `visibilityMap`.
 * `allItems` stop here and never become LocalTreeItems as they aren't added to the tree view.
 *
 * See `useLocalTree.ts` and `dataToEditorTree()`.
 */
export interface EnhancedTreeItem extends StoredTreeItem {
  expanded?: boolean | undefined
  /**
   * Used by DocumentInNode to render the preview for drafts if they exist.
   * Also informs document status icons.
   */
  draftId?: string
  draftUpdatedAt?: string
  /**
   * If not present, DocumentInNode will show up an error for invalid document.
   *  - undefined `publishedId` could mean the document is either deleted, or it doesn't match GROQ filters anymore
   */
  publishedId?: string
  publishedUpdatedAt?: string
}

/**
 * Tree items as found in the sortable tree view.
 */
export interface LocalTreeItem extends EnhancedTreeItem {
  /**
   * Title can be a string or a render function for custom node content
   */
  title?: string | ((props: NodeProps) => React.ReactNode)
  /**
   * Children nodes in the tree hierarchy
   */
  children?: LocalTreeItem[]
}

export interface TreeInputOptions {
  /**
   * What document types this hierarchy can refer to.
   * Similar to the `to` property of the [reference field](https://www.sanity.io/docs/reference-type).
   */
  referenceTo: string[]

  /**
   * Used to provide fine-grained filtering for documents.
   */
  referenceOptions?: {
    /**
     * Static filter to apply to tree document queries.
     */
    filter?: string
    /**
     * Parameters / variables to pass to the GROQ query ran to fetch documents.
     */
    filterParams?: Record<string, unknown>
  }

  /**
   * How deep should editors be allowed to nest items.
   */
  maxDepth?: number

  /**
   * Schema type for your hierarchical documents.
   * Refer to documentation on how to provide these schemas in your studio.
   *
   * Defautlt: 'hierarchy.tree' - this schema is bundled with the plugin
   */
  documentType?: string
}

export interface TreeFieldSchema
  extends Omit<ArraySchemaType, 'of' | 'type' | 'inputComponent' | 'jsonType'> {
  options: ArraySchemaType['options'] & TreeInputOptions
}

export interface TreeNodeObjectSchema
  extends Omit<ObjectSchemaType, 'name' | 'fields' | 'type' | 'inputComponent' | 'jsonType'> {
  options: ObjectSchemaType['options'] & TreeInputOptions
}

export interface TreeDeskStructureProps extends TreeInputOptions {
  /**
   * _id of the document that will hold the tree data.
   */
  documentId: string

  /**
   * (Optional)
   * Key for the field representing the hierarchical tree inside the document.
   * `tree` by default.
   */
  fieldKeyInDocument?: string

  /**
   * Callback fired after every tree mutation.
   * Use this to sync paths/slugs back to individual documents.
   *
   * @remarks
   * - Callback is invoked asynchronously (non-blocking)
   * - Errors are logged but do not interrupt tree operations
   * - Called after patch is executed, not before
   */
  onTreeChange?: TreeChangeCallback

  /**
   * Enable or disable the onTreeChange callback.
   * Useful for conditionally disabling sync in certain environments.
   *
   * Default: `true` (callback fires if provided)
   */
  enableTreeChangeCallback?: boolean
}

export interface DocumentPair {
  draft?: SanityDocument
  published?: SanityDocument
}

export interface AllItems {
  [publishedId: string]: DocumentPair | undefined
}

type DocumentOperation<Payload = unknown> = {
  execute?: (payload?: Payload) => void
  disabled?: boolean | string
}

export interface DocumentOperations {
  patch?: DocumentOperation<unknown[]>
  commit?: DocumentOperation
  del?: DocumentOperation
  delete?: DocumentOperation
  discardChanges?: DocumentOperation
  duplicate?: DocumentOperation
  restore?: DocumentOperation
  unpublish?: DocumentOperation
  publish?: DocumentOperation
}

export interface VisibilityMap {
  [_key: string]: boolean
}

export interface NodeProps {
  node: LocalTreeItem
}

export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>

// ============================================================================
// Tree Change Callback Types
// ============================================================================

/**
 * Information about a document's position in the tree hierarchy.
 */
export interface DocumentPathInfo {
  /** Published document _id */
  docId: string

  /** Document _type (from value.docType) */
  docType: string

  /** Ordered array of ancestor document _ids (root to parent) */
  ancestors: string[]

  /** This document's _key in the tree */
  nodeKey: string

  /** Parent's _key in the tree (null if root level) */
  parentNodeKey: string | null

  /** Zero-based depth in hierarchy */
  depth: number

  /** Position among siblings (zero-based) */
  siblingIndex: number
}

/**
 * Event payload passed to the onTreeChange callback.
 */
export interface TreeChangeEvent {
  /** The tree document ID */
  treeDocId: string

  /** Full tree state after the mutation */
  tree: StoredTreeItem[]

  /** Type of operation that triggered the change */
  operation: 'add' | 'remove' | 'move' | 'duplicate' | 'reorder'

  /** Document references affected by this change (published _ids) */
  affectedDocIds: string[]

  /** Computed paths for ALL documents in tree */
  paths: DocumentPathInfo[]
}

/**
 * Callback type for tree change events.
 */
export type TreeChangeCallback = (event: TreeChangeEvent) => void | Promise<void>

/**
 * Metadata about a tree operation, used internally to track what kind of
 * mutation occurred and which nodes were affected.
 */
export interface TreeOperationMeta {
  operation: 'add' | 'remove' | 'move' | 'duplicate' | 'reorder'
  /** _keys of directly affected nodes */
  nodeKeys: string[]
}
