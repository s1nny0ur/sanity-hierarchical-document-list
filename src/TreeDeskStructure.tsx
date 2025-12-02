import {Box, Flex, Spinner} from '@sanity/ui'
import * as React from 'react'
import {PatchEvent, useDocumentOperation, useEditState} from 'sanity'

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

  // Track pending operation for callback
  const pendingOperationRef = React.useRef<TreeOperationMeta | null>(null)

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
    const {onTreeChange, enableTreeChangeCallback = true, slugField, pathSeparator} = props.options

    // Skip if disabled, no callback, or no pending operation
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
    }

    // Invoke async, catch errors to prevent breaking UI
    Promise.resolve(onTreeChange(event)).catch((err) => {
      console.error('[hierarchical-document-list] onTreeChange error:', err)
    })
  }, [
    treeValue,
    allItems,
    props.options.documentId,
    props.options.onTreeChange,
    props.options.enableTreeChangeCallback,
    props.options.slugField,
    props.options.pathSeparator,
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
