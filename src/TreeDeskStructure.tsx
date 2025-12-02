import {Box, Flex, Spinner} from '@sanity/ui'
import * as React from 'react'
import {PatchEvent, useClient, useDocumentOperation, useEditState} from 'sanity'

import DeskWarning from './components/DeskWarning'
import TreeEditor from './components/TreeEditor'
import useAllItems from './hooks/useAllItems'
import {
  DocumentOperations,
  StoredTreeItem,
  TreeChangeEvent,
  TreeDeskStructureProps,
  TreeOperationMeta,
} from './types'
import {computeAllPaths, getAffectedDocIds} from './utils/computePaths'
import {toGradient} from './utils/gradientPatchAdapter'
import injectNodeTypeInPatches, {DEFAULT_DOC_TYPE} from './utils/injectNodeTypeInPatches'

interface ComponentProps {
  options: TreeDeskStructureProps
}

export const DEFAULT_FIELD_KEY = 'tree'

const TreeDeskStructure: React.FC<ComponentProps> = (props) => {
  const treeDocType = props.options.documentType || DEFAULT_DOC_TYPE
  const treeFieldKey = props.options.fieldKeyInDocument || DEFAULT_FIELD_KEY
  const {published, draft, liveEdit} = useEditState(props.options.documentId, treeDocType)
  const {patch} = useDocumentOperation(props.options.documentId, treeDocType) as DocumentOperations

  // Fetch all items (documents) for the tree - moved here to access in callback
  const {status: allItemsStatus, allItems} = useAllItems(props.options)

  const treeValue = (published?.[treeFieldKey] || []) as StoredTreeItem[]

  // Client for auto-sync patching
  const client = useClient({apiVersion: '2024-01-01'})

  // Track pending operation for callback
  const pendingOperationRef = React.useRef<TreeOperationMeta | null>(null)

  // Track previous tree document IDs for computing removals
  const previousDocIdsRef = React.useRef<Set<string>>(new Set())

  const handleChange = React.useCallback(
    (patchEvent: PatchEvent, operationMeta?: TreeOperationMeta) => {
      if (!patch?.execute) {
        return
      }

      // Store operation metadata before patch executes
      if (operationMeta) {
        pendingOperationRef.current = operationMeta
      }

      patch.execute(toGradient(injectNodeTypeInPatches(patchEvent.patches, treeDocType)))
    },
    [patch, treeDocType]
  )

  // Fire callback when tree value changes (after patch applied)
  React.useEffect(() => {
    const {
      onTreeChange,
      enableTreeChangeCallback = true,
      slugField,
      pathSeparator,
      inTreeField,
      autoSyncInTree,
    } = props.options

    // Extract current document IDs from tree
    const currentDocIds = new Set<string>()
    for (const item of treeValue) {
      const docId = item.value?.reference?._ref
      if (docId) {
        currentDocIds.add(docId)
      }
    }

    // Compute removed IDs (were in previous, not in current)
    const removedDocIds: string[] = []
    for (const docId of previousDocIdsRef.current) {
      if (!currentDocIds.has(docId)) {
        removedDocIds.push(docId)
      }
    }

    // Update previous ref for next comparison
    previousDocIdsRef.current = currentDocIds

    // Handle auto-sync if enabled (runs even without callback)
    if (autoSyncInTree && inTreeField && pendingOperationRef.current) {
      const transaction = client.transaction()

      // Set inTree: true for all current tree documents
      for (const docId of currentDocIds) {
        transaction.patch(docId, {set: {[inTreeField]: true}})
      }

      // Set inTree: false for removed documents
      for (const docId of removedDocIds) {
        transaction.patch(docId, {set: {[inTreeField]: false}})
      }

      // Commit transaction (fire and forget with error logging)
      transaction.commit().catch((err) => {
        console.error('[hierarchical-document-list] Auto-sync inTree error:', err)
      })
    }

    // Skip callback if disabled, no callback provided, or no pending operation
    if (!enableTreeChangeCallback || !onTreeChange || !pendingOperationRef.current) {
      return
    }

    const {operation, nodeKeys} = pendingOperationRef.current
    pendingOperationRef.current = null

    // Compute callback payload with slug information if configured
    const event: TreeChangeEvent = {
      treeDocId: props.options.documentId,
      tree: treeValue,
      operation,
      affectedDocIds: getAffectedDocIds(treeValue, nodeKeys),
      paths: computeAllPaths(treeValue, {
        allItems,
        slugField,
        pathSeparator,
      }),
      removedDocIds,
    }

    // Invoke async, catch errors to prevent breaking UI
    Promise.resolve(onTreeChange(event)).catch((err) => {
      console.error('[hierarchical-document-list] onTreeChange error:', err)
    })
  }, [
    treeValue,
    allItems,
    client,
    props.options.documentId,
    props.options.onTreeChange,
    props.options.enableTreeChangeCallback,
    props.options.slugField,
    props.options.pathSeparator,
    props.options.inTreeField,
    props.options.autoSyncInTree,
  ])

  React.useEffect(() => {
    if (!published?._id && patch?.execute && !patch?.disabled) {
      // If no published document, create it
      patch.execute([{setIfMissing: {[treeFieldKey]: []}}])
    }
  }, [published?._id, patch, treeFieldKey])

  if (!liveEdit) {
    return (
      <DeskWarning
        title="Invalid configuration"
        subtitle="The `documentType` passed to `createDeskHiearchy` isn't live editable. \nTo continue using this plugin, add `liveEdit: true` to your custom schema type or unset `documentType` in your hierarchy configuration."
      />
    )
  }

  if (draft?._id) {
    return (
      <DeskWarning
        title="This hierarchy tree contains a draft"
        subtitle="Click on the button below to publish your draft in order to continue editing the live
      published document."
      />
    )
  }

  if (!published?._id) {
    return (
      <Flex padding={5} align={'center'} justify={'center'} height={'fill'}>
        <Spinner width={4} muted />
      </Flex>
    )
  }

  return (
    <Box paddingBottom={5} paddingRight={2}>
      <TreeEditor
        options={props.options}
        tree={treeValue}
        onChange={handleChange}
        patchPrefix={treeFieldKey}
        allItems={allItems}
        allItemsStatus={allItemsStatus}
      />
    </Box>
  )
}

export default TreeDeskStructure
