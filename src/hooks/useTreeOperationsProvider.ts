import {PatchEvent, PathSegment, prefixPath, setIfMissing} from 'sanity'

import {LocalTreeItem, NodeProps, TreeOperationMeta} from '../types'
import {
  getAddItemPatch,
  getDuplicateItemPatch,
  getMovedNodePatch,
  getMoveItemPatch,
  getRemoveItemPatch,
  HandleMovedNode,
  HandleMovedNodeData} from '../utils/treePatches'

export default function useTreeOperationsProvider(props: {
  patchPrefix?: PathSegment
  onChange: (patch: PatchEvent, meta?: TreeOperationMeta) => void
  localTree: LocalTreeItem[]
}): {
  handleMovedNode: HandleMovedNode
  addItem: (item: LocalTreeItem) => void
  duplicateItem: (nodeProps: NodeProps) => void
  removeItem: (nodeProps: NodeProps) => void
  moveItemUp: (nodeProps: NodeProps) => void
  moveItemDown: (nodeProps: NodeProps) => void
} {
  const {localTree} = props

  function runPatches(patches: any, meta: TreeOperationMeta) {
    const finalPatches = [
      // Ensure tree array exists before any operation
      setIfMissing([]),
      ...(patches || []),
    ]
    let patchEvent = PatchEvent.from(finalPatches)
    if (props.patchPrefix) {
      patchEvent = PatchEvent.from(
        finalPatches.map((patch) => prefixPath(patch, props.patchPrefix as PathSegment))
      )
    }
    props.onChange(patchEvent, meta)
  }

  function handleMovedNode(data: HandleMovedNodeData & {node: LocalTreeItem}) {
    runPatches(getMovedNodePatch(data), {
      operation: 'move',
      nodeKeys: [data.node._key],
    })
  }

  function addItem(item: LocalTreeItem) {
    runPatches(getAddItemPatch(item), {
      operation: 'add',
      nodeKeys: [item._key],
    })
  }

  function duplicateItem(nodeProps: NodeProps & {node: LocalTreeItem}) {
    runPatches(getDuplicateItemPatch(nodeProps), {
      operation: 'duplicate',
      nodeKeys: [nodeProps.node._key],
    })
  }

  function removeItem(nodeProps: NodeProps) {
    runPatches(getRemoveItemPatch(nodeProps), {
      operation: 'remove',
      nodeKeys: [nodeProps.node._key],
    })
  }

  function moveItemUp(nodeProps: NodeProps) {
    runPatches(
      getMoveItemPatch({
        nodeProps,
        localTree,
        direction: 'up',
      }),
      {
        operation: 'reorder',
        nodeKeys: [nodeProps.node._key],
      }
    )
  }

  function moveItemDown(nodeProps: NodeProps) {
    runPatches(
      getMoveItemPatch({
        nodeProps,
        localTree,
        direction: 'down',
      }),
      {
        operation: 'reorder',
        nodeKeys: [nodeProps.node._key],
      }
    )
  }

  return {
    handleMovedNode,
    addItem,
    removeItem,
    moveItemUp,
    moveItemDown,
    duplicateItem
  }
}
