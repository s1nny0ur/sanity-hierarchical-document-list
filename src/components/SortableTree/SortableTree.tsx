import {
  DndContext,
  DragEndEvent,
  DragMoveEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  MeasuringStrategy,
  PointerSensor,
  UniqueIdentifier,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import * as React from 'react'
import {useCallback, useMemo, useState} from 'react'
import {LocalTreeItem} from '../../types'
import {flattenTree, getNodeDepth} from '../../utils/treeUtils'
import {SortableTreeItem} from './SortableTreeItem'
import {TreeItemPlaceholder} from './TreeItemPlaceholder'

const INDENTATION_WIDTH = 44

export interface SortableTreeProps {
  treeData: LocalTreeItem[]
  maxDepth?: number
  onMoveNode: (data: {
    node: LocalTreeItem
    treeData: LocalTreeItem[]
    nextPath: string[] | null
    nextTreeIndex: number
    nextParentNode?: LocalTreeItem | null
  }) => void
  onVisibilityToggle: (data: {node: LocalTreeItem; expanded: boolean}) => void
  canDrop?: (data: {node: LocalTreeItem; nextParentNode?: LocalTreeItem | null; depth: number}) => boolean
  placeholder?: {
    title: string
    subtitle?: string
  }
}

interface FlattenedItem extends LocalTreeItem {
  depth: number
  parentId: string | null
  index: number
}

function flattenWithDepth(
  items: LocalTreeItem[],
  parentId: string | null = null,
  depth: number = 0
): FlattenedItem[] {
  return items.reduce<FlattenedItem[]>((acc, item, index) => {
    const flatItem: FlattenedItem = {
      ...item,
      depth,
      parentId,
      index,
    }
    acc.push(flatItem)

    // Only include children if expanded
    if (item.expanded !== false && Array.isArray(item.children) && item.children.length > 0) {
      acc.push(...flattenWithDepth(item.children, item._key, depth + 1))
    }

    return acc
  }, [])
}

function getProjection(
  items: FlattenedItem[],
  activeId: UniqueIdentifier,
  overId: UniqueIdentifier,
  dragOffset: number,
  indentationWidth: number
): {
  depth: number
  parentId: string | null
  overId: UniqueIdentifier
} {
  const overItemIndex = items.findIndex(({_key}) => _key === overId)
  const activeItemIndex = items.findIndex(({_key}) => _key === activeId)

  if (overItemIndex === -1 || activeItemIndex === -1) {
    return {depth: 0, parentId: null, overId}
  }

  const activeItem = items[activeItemIndex]
  const newItems = [...items]
  newItems.splice(activeItemIndex, 1)
  newItems.splice(overItemIndex, 0, activeItem)

  const previousItem = newItems[overItemIndex - 1]

  // Calculate depth based on drag offset
  const projectedDepth = activeItem.depth + Math.round(dragOffset / indentationWidth)
  const maxDepth = previousItem ? previousItem.depth + 1 : 0
  const minDepth = 0
  const depth = Math.min(Math.max(projectedDepth, minDepth), maxDepth)

  // Find parent based on depth
  let parentId: string | null = null
  if (depth > 0 && previousItem) {
    if (previousItem.depth === depth - 1) {
      parentId = previousItem._key
    } else if (previousItem.depth >= depth) {
      // Find the appropriate parent by traversing back
      for (let i = overItemIndex - 1; i >= 0; i--) {
        if (newItems[i].depth === depth - 1) {
          parentId = newItems[i]._key
          break
        }
      }
    }
  }

  return {depth, parentId, overId}
}

export function SortableTree({
  treeData,
  maxDepth,
  onMoveNode,
  onVisibilityToggle,
  canDrop,
  placeholder,
}: SortableTreeProps) {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null)
  const [overId, setOverId] = useState<UniqueIdentifier | null>(null)
  const [offsetLeft, setOffsetLeft] = useState(0)

  const flattenedItems = useMemo(() => flattenWithDepth(treeData), [treeData])
  const sortedIds = useMemo(() => flattenedItems.map(({_key}) => _key), [flattenedItems])

  const activeItem = activeId ? flattenedItems.find(({_key}) => _key === activeId) : null

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const projected = useMemo(() => {
    if (activeId && overId) {
      return getProjection(
        flattenedItems,
        activeId,
        overId,
        offsetLeft,
        INDENTATION_WIDTH
      )
    }
    return null
  }, [activeId, overId, flattenedItems, offsetLeft])

  const handleDragStart = useCallback(({active}: DragStartEvent) => {
    setActiveId(active.id)
    setOverId(active.id)
  }, [])

  const handleDragMove = useCallback(({delta}: DragMoveEvent) => {
    setOffsetLeft(delta.x)
  }, [])

  const handleDragOver = useCallback(({over}: DragOverEvent) => {
    setOverId(over?.id ?? null)
  }, [])

  const handleDragEnd = useCallback(
    ({active, over}: DragEndEvent) => {
      resetState()

      if (!over || !projected) return

      const activeItem = flattenedItems.find(({_key}) => _key === active.id)
      if (!activeItem) return

      // Find the new parent node
      const newParentNode = projected.parentId
        ? flattenedItems.find(({_key}) => _key === projected.parentId)
        : null

      // Check depth constraint
      if (maxDepth !== undefined && projected.depth >= maxDepth) {
        return
      }

      // Check canDrop constraint
      if (
        canDrop &&
        !canDrop({
          node: activeItem,
          nextParentNode: newParentNode ?? null,
          depth: projected.depth,
        })
      ) {
        return
      }

      // Find the index in the tree
      const overIndex = flattenedItems.findIndex(({_key}) => _key === over.id)

      // Calculate the path for the new position
      const nextPath = projected.parentId
        ? [projected.parentId, activeItem._key]
        : [activeItem._key]

      // Rebuild tree with the new structure
      const newTreeData = buildTreeFromFlatItems(
        flattenedItems,
        active.id as string,
        over.id as string,
        projected.parentId
      )

      onMoveNode({
        node: activeItem,
        treeData: newTreeData,
        nextPath,
        nextTreeIndex: overIndex,
        nextParentNode: newParentNode ?? null,
      })
    },
    [flattenedItems, projected, onMoveNode, maxDepth, canDrop]
  )

  const handleDragCancel = useCallback(() => {
    resetState()
  }, [])

  function resetState() {
    setActiveId(null)
    setOverId(null)
    setOffsetLeft(0)
  }

  const handleToggle = useCallback(
    (item: LocalTreeItem) => {
      onVisibilityToggle({
        node: item,
        expanded: !item.expanded,
      })
    },
    [onVisibilityToggle]
  )

  // Show placeholder when tree is empty
  if (flattenedItems.length === 0 && placeholder) {
    return <TreeItemPlaceholder title={placeholder.title} subtitle={placeholder.subtitle} />
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      measuring={{
        droppable: {
          strategy: MeasuringStrategy.Always,
        },
      }}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={sortedIds} strategy={verticalListSortingStrategy}>
        <div>
          {flattenedItems.map((item) => (
            <SortableTreeItem
              key={item._key}
              id={item._key}
              item={item}
              depth={
                item._key === activeId && projected ? projected.depth : item.depth
              }
              indentationWidth={INDENTATION_WIDTH}
              onToggle={() => handleToggle(item)}
              isDragging={item._key === activeId}
              isOver={item._key === overId}
              canDrag={!!item.publishedId}
            />
          ))}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeItem ? (
          <SortableTreeItem
            id={activeItem._key}
            item={activeItem}
            depth={activeItem.depth}
            indentationWidth={INDENTATION_WIDTH}
            clone
            canDrag
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

/**
 * Rebuild the tree structure after a drag operation
 */
function buildTreeFromFlatItems(
  flatItems: FlattenedItem[],
  activeId: string,
  overId: string,
  newParentId: string | null
): LocalTreeItem[] {
  // Create a map for quick lookup
  const itemMap = new Map<string, LocalTreeItem>()
  const rootItems: LocalTreeItem[] = []

  // Clone items and clear children
  for (const item of flatItems) {
    const clonedItem: LocalTreeItem = {
      ...item,
      children: [],
      // Update parent for the moved item
      parent: item._key === activeId ? newParentId : item.parentId,
    }
    itemMap.set(item._key, clonedItem)
  }

  // Rebuild tree structure
  for (const item of flatItems) {
    const treeItem = itemMap.get(item._key)!
    const parentKey = item._key === activeId ? newParentId : item.parentId

    if (parentKey && itemMap.has(parentKey)) {
      const parent = itemMap.get(parentKey)!
      parent.children = parent.children || []
      parent.children.push(treeItem)
    } else {
      rootItems.push(treeItem)
    }
  }

  return rootItems
}

export default SortableTree
