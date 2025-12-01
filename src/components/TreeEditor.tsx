import {AddCircleIcon} from '@sanity/icons'
import {Box, Button, Card, Flex, Spinner, Stack, Text, Tooltip} from '@sanity/ui'
import * as React from 'react'
import {useCallback, useMemo} from 'react'
import {PatchEvent} from 'sanity'

import useAllItems from '../hooks/useAllItems'
import useLocalTree from '../hooks/useLocalTree'
import {TreeOperationsContext} from '../hooks/useTreeOperations'
import useTreeOperationsProvider from '../hooks/useTreeOperationsProvider'
import {LocalTreeItem, Optional, StoredTreeItem, TreeDeskStructureProps} from '../types'
import getTreeHeight from '../utils/getTreeHeight'
import {getUnaddedItems} from '../utils/treeData'
import {HandleMovedNodeData} from '../utils/treePatches'
import {isDescendant} from '../utils/treeUtils'
import DocumentInNode from './DocumentInNode'
import {SortableTree} from './SortableTree'
import {TreeEditorErrorBoundary} from './TreeEditorErrorBoundary'

/**
 * The loaded tree users interact with
 */
const TreeEditor: React.FC<{
  tree: StoredTreeItem[]
  onChange: (patch: PatchEvent) => void
  options: Optional<TreeDeskStructureProps, 'documentId'>
  patchPrefix?: string
}> = (props) => {
  const {status: allItemsStatus, allItems} = useAllItems(props.options)
  const unAddedItems = getUnaddedItems({tree: props.tree, allItems})

  const {localTree, handleVisibilityToggle} = useLocalTree({
    tree: props.tree,
    allItems
  })

  const operations = useTreeOperationsProvider({
    patchPrefix: props.patchPrefix,
    onChange: props.onChange,
    localTree
  })

  const [treeViewHeight, setTreeViewHeight] = React.useState<string>('')

  const updateTreeViewHeight = () => {
    const el = document.querySelector(`#${props.options.documentId} [data-known-size]`) as HTMLElement | null
    const rowHeight = Number(el?.dataset.knownSize || 51)
    setTreeViewHeight(getTreeHeight(localTree, rowHeight))
  }

  React.useEffect(() => {
    // Wait for dom to load before initial execution.
    setTimeout(updateTreeViewHeight)
  }, [])

  React.useEffect(() => {
    // Immediately update when changes are detected.
    updateTreeViewHeight()
  }, [props.options.documentId, localTree])

  const onMoveNode = useCallback(
    (data: HandleMovedNodeData) => operations.handleMovedNode(data),
    [operations]
  )

  const onVisibilityToggle = useCallback(
    (data: {node: LocalTreeItem; expanded: boolean}) => {
      handleVisibilityToggle(data)
    },
    [handleVisibilityToggle]
  )

  const canDrop = useCallback(
    (data: {node: LocalTreeItem; nextParentNode?: LocalTreeItem | null; depth: number}) => {
      // Prevent dropping inside itself (circular nesting)
      if (data.nextParentNode && data.node._key === data.nextParentNode._key) {
        return false
      }
      // Prevent dropping a parent into one of its descendants (would create circular reference)
      if (data.nextParentNode && isDescendant(data.node, data.nextParentNode)) {
        return false
      }
      return true
    },
    []
  )

  const operationContext = useMemo(
    () => ({...operations, allItemsStatus}),
    [operations, allItemsStatus]
  )

  return (
    <TreeEditorErrorBoundary>
      <Box id={props.options.documentId}>
        <TreeOperationsContext.Provider value={operationContext}>
          <Stack space={4} paddingTop={4}>
            <Card
              style={{minHeight: treeViewHeight}}
              // Only include borderBottom if there's something to show in unadded items
              borderBottom={allItemsStatus !== 'success' || unAddedItems?.length > 0}
            >
              <SortableTree
                maxDepth={props.options.maxDepth}
                onVisibilityToggle={onVisibilityToggle}
                canDrop={canDrop}
                onMoveNode={onMoveNode}
                treeData={localTree}
                placeholder={{
                  title: 'Add items from the list below'
                }}
              />
            </Card>

            {allItemsStatus === 'success' && unAddedItems?.length > 0 && (
              <Stack space={1} paddingX={2} paddingTop={3}>
                <Stack space={2} paddingX={2} paddingBottom={3}>
                  <Text size={2} as="h2" weight="semibold">
                    Add more items
                  </Text>
                  <Text size={1} muted>
                    Only published documents are shown.
                  </Text>
                </Stack>
                {unAddedItems.map((item) => (
                  <DocumentInNode
                    key={item.publishedId || item.draftId}
                    item={item}
                    action={
                      <Tooltip
                        portal
                        placement="left"
                        content={
                          <Box padding={2}>
                            <Text size={1}>Add to list</Text>
                          </Box>
                        }
                      >
                        <Button
                          onClick={() => {
                            operations.addItem(item)
                          }}
                          mode="bleed"
                          icon={AddCircleIcon}
                          style={{cursor: 'pointer'}}
                        />
                      </Tooltip>
                    }
                  />
                ))}
              </Stack>
            )}
            {allItemsStatus === 'loading' && (
              <Flex padding={4} align={'center'} justify={'center'}>
                <Spinner size={3} muted />
              </Flex>
            )}
            {allItemsStatus === 'error' && (
              <Flex padding={4} align={'center'} justify={'center'}>
                <Text size={2} weight="semibold">
                  Something went wrong when loading documents
                </Text>
              </Flex>
            )}
          </Stack>
        </TreeOperationsContext.Provider>
      </Box>
    </TreeEditorErrorBoundary>
  )
}

export default TreeEditor
