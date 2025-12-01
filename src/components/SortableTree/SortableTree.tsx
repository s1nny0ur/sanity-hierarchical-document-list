import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragMoveEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  MeasuringStrategy,
  PointerSensor,
  UniqueIdentifier,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import * as React from 'react'
import {useCallback, useMemo, useRef, useState} from 'react'

import {LocalTreeItem} from '../../types'
import {DropIndicator} from './DropIndicator'
import {SortableTreeItem} from './SortableTreeItem'
import {TreeItemPlaceholder} from './TreeItemPlaceholder'

const INDENTATION_WIDTH = 44
// Hysteresis: require more movement to CHANGE depth than to MAINTAIN it
const DEPTH_CHANGE_THRESHOLD = 0.65 // 65% of indentation width to change depth
const DEPTH_MAINTAIN_THRESHOLD = 0.35 // 35% to snap back

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
  indentationWidth: number,
  currentProjectedDepth: number | null
): {
  depth: number
  parentId: string | null
  overId: UniqueIdentifier
  insertPosition: 'before' | 'after'
  insertIndex: number
} {
  const overItemIndex = items.findIndex(({_key}) => _key === overId)
  const activeItemIndex = items.findIndex(({_key}) => _key === activeId)

  if (overItemIndex === -1 || activeItemIndex === -1) {
    return {depth: 0, parentId: null, overId, insertPosition: 'before', insertIndex: 0}
  }

  const activeItem = items[activeItemIndex]
  const newItems = [...items]
  newItems.splice(activeItemIndex, 1)
  newItems.splice(overItemIndex, 0, activeItem)

  const previousItem = newItems[overItemIndex - 1]

  // Calculate depth with hysteresis for smoother feel
  const rawDepthOffset = dragOffset / indentationWidth
  let projectedDepth: number

  if (currentProjectedDepth === null) {
    // Initial projection - use standard rounding
    projectedDepth = activeItem.depth + Math.round(rawDepthOffset)
  } else {
    // Apply hysteresis - require more movement to change depth
    const currentOffset = currentProjectedDepth - activeItem.depth
    const offsetDelta = rawDepthOffset - currentOffset

    if (Math.abs(offsetDelta) > DEPTH_CHANGE_THRESHOLD) {
      // Enough movement to change depth
      projectedDepth = activeItem.depth + Math.round(rawDepthOffset)
    } else if (Math.abs(offsetDelta) < DEPTH_MAINTAIN_THRESHOLD) {
      // Within maintain zone - keep current depth
      projectedDepth = currentProjectedDepth
    } else {
      // In the transition zone - keep current
      projectedDepth = currentProjectedDepth
    }
  }

  const maxDepth = previousItem ? previousItem.depth + 1 : 0
  const minDepth = 0
  const depth = Math.min(Math.max(projectedDepth, minDepth), maxDepth)

  // Determine insert position relative to over item
  const insertPosition: 'before' | 'after' = activeItemIndex > overItemIndex ? 'before' : 'after'
  const insertIndex = insertPosition === 'before' ? overItemIndex : overItemIndex + 1

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

  return {depth, parentId, overId, insertPosition, insertIndex}
}

export function SortableTree({
  treeData,
  maxDepth,
  onMoveNode,
  onVisibilityToggle,
  canDrop,
  placeholder,
}: SortableTreeProps): React.ReactElement | null {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null)
  const [overId, setOverId] = useState<UniqueIdentifier | null>(null)
  const [offsetLeft, setOffsetLeft] = useState(0)
  // Track projected depth for hysteresis
  const projectedDepthRef = useRef<number | null>(null)

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
      const projection = getProjection(
        flattenedItems,
        activeId,
        overId,
        offsetLeft,
        INDENTATION_WIDTH,
        projectedDepthRef.current
      )
      // Update the ref for next calculation (hysteresis)
      projectedDepthRef.current = projection.depth
      return projection
    }
    return null
  }, [activeId, overId, flattenedItems, offsetLeft])

  const handleDragStart = useCallback(({active}: DragStartEvent) => {
    setActiveId(active.id)
    setOverId(active.id)
    projectedDepthRef.current = null // Reset hysteresis on new drag
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

      if (!over || !projected) {
 return
}

      const draggedItem = flattenedItems.find(({_key}) => _key === active.id)
      if (!draggedItem) {
 return
}

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
          node: draggedItem,
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
        ? [projected.parentId, draggedItem._key]
        : [draggedItem._key]

      // Rebuild tree with the new structure
      const newTreeData = buildTreeFromFlatItems(
        flattenedItems,
        active.id as string,
        over.id as string,
        projected.parentId
      )

      onMoveNode({
        node: draggedItem,
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
    projectedDepthRef.current = null
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

  // Determine if we should show the drop indicator and where
  const showDropIndicator = activeId && projected && overId && overId !== activeId
  const dropIndicatorIndex = projected?.insertIndex ?? -1

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
          {flattenedItems.map((item, index) => {
            const isActiveItem = item._key === activeId
            const isOverItem = item._key === overId

            return (
              <React.Fragment key={item._key}>
                {/* Show drop indicator before this item if applicable */}
                {showDropIndicator &&
                  dropIndicatorIndex === index &&
                  projected.insertPosition === 'before' && (
                    <DropIndicator
                      depth={projected.depth}
                      indentationWidth={INDENTATION_WIDTH}
                    />
                  )}

                <SortableTreeItem
                  id={item._key}
                  item={item}
                  depth={isActiveItem && projected ? projected.depth : item.depth}
                  indentationWidth={INDENTATION_WIDTH}
                  onToggle={() => handleToggle(item)}
                  isDragging={isActiveItem}
                  isOver={isOverItem && !isActiveItem}
                  canDrag={!!item.publishedId}
                />

                {/* Show drop indicator after this item if applicable */}
                {showDropIndicator &&
                  dropIndicatorIndex === index + 1 &&
                  projected.insertPosition === 'after' && (
                    <DropIndicator
                      depth={projected.depth}
                      indentationWidth={INDENTATION_WIDTH}
                    />
                  )}
              </React.Fragment>
            )
          })}

          {/* Show drop indicator at the end if dropping after last item */}
          {showDropIndicator &&
            dropIndicatorIndex >= flattenedItems.length && (
              <DropIndicator
                depth={projected.depth}
                indentationWidth={INDENTATION_WIDTH}
              />
            )}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeItem && projected ? (
          <SortableTreeItem
            id={activeItem._key}
            item={activeItem}
            depth={projected.depth}
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
