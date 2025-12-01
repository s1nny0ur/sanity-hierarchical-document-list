import {useSortable} from '@dnd-kit/sortable'
import {CSS} from '@dnd-kit/utilities'
import {cyan, gray, red} from '@sanity/color'
import {ChevronDownIcon, ChevronRightIcon, DragHandleIcon} from '@sanity/icons'
import {Button, Flex} from '@sanity/ui'
import * as React from 'react'
import {CSSProperties} from 'react'
import styled from 'styled-components'

import {LocalTreeItem, NodeProps} from '../../types'

const Root = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  min-height: 51px;
  transition: background-color 0.15s ease;

  &[data-landing='true'] > *,
  &[data-cancel='true'] > * {
    opacity: 0 !important;
  }
  &[data-landing='true']::before,
  &[data-cancel='true']::before {
    background-color: ${cyan[50].hex};
    border: 2px dashed ${gray[400].hex};
    border-radius: 3px;
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: -1;
  }

  &[data-cancel='true']::before {
    background-color: ${red[50].hex};
  }

  &[data-clone='true'] {
    pointer-events: none;
    padding: 0;
    padding-left: 10px;
    padding-top: 5px;
    padding-bottom: 5px;
    background-color: white;
    border-radius: 4px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
  }

  &[data-ghost='true'] {
    opacity: 0.4;
  }

  &[data-ghost='true'] > * {
    background-color: transparent;
    box-shadow: none;
  }

  &[data-over='true'] {
    background-color: ${cyan[50].hex};
    border-radius: 3px;
  }
`

const TreeItemWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
`

export interface SortableTreeItemProps {
  id: string
  item: LocalTreeItem
  depth: number
  indentationWidth: number
  clone?: boolean
  isDragging?: boolean
  isOver?: boolean
  canDrag?: boolean
  onToggle?: () => void
}

export function SortableTreeItem({
  id,
  item,
  depth,
  indentationWidth,
  clone,
  isDragging,
  isOver,
  canDrag = true,
  onToggle,
}: SortableTreeItemProps): React.ReactElement {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id,
    disabled: !canDrag,
  })

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  }

  const hasChildren = Array.isArray(item.children) && item.children.length > 0
  const nodeTitle = item.title

  const nodeProps: NodeProps = {
    node: item,
  }

  // Render the drag handle
  const Handle = React.useMemo(() => {
    if (!canDrag) {
      return (
        <div>
          <Button
            mode="bleed"
            paddingX={0}
            paddingY={1}
            style={{
              cursor: 'default',
              fontSize: '1.5625rem',
            }}
            data-ui="DragHandleButton"
            disabled
          >
            <DragHandleIcon style={{marginBottom: '-0.1em'}} />
          </Button>
        </div>
      )
    }

    return (
      <div ref={setActivatorNodeRef} {...listeners}>
        <Button
          mode="bleed"
          paddingX={0}
          paddingY={1}
          style={{
            cursor: 'grab',
            fontSize: '1.5625rem',
          }}
          data-ui="DragHandleButton"
          data-drag-handle
        >
          <DragHandleIcon style={{marginBottom: '-0.1em'}} />
        </Button>
      </div>
    )
  }, [canDrag, listeners, setActivatorNodeRef])

  // Render expand/collapse button
  const ExpandButton = React.useMemo(() => {
    if (!hasChildren) {
 return null
}

    return (
      <div
        style={{
          position: 'absolute',
          left: '-2px',
          top: '50%',
          transform: 'translate(-100%, -50%)',
        }}
      >
        <Button
          aria-label={item.expanded === false ? 'Expand' : 'Collapse'}
          icon={
            item.expanded === false ? (
              <ChevronRightIcon color={gray[200].hex} />
            ) : (
              <ChevronDownIcon color={gray[200].hex} />
            )
          }
          mode="bleed"
          fontSize={2}
          padding={1}
          type="button"
          onClick={onToggle}
        />
      </div>
    )
  }, [hasChildren, item.expanded, onToggle])

  return (
    <Root
      ref={setNodeRef}
      style={{
        ...style,
        paddingLeft: clone ? undefined : `${10 + (indentationWidth * depth)}px`,
      }}
      data-clone={clone}
      data-ghost={isDragging || isSortableDragging}
      data-over={isOver}
      data-known-size="51"
      {...attributes}
    >
      <TreeItemWrapper>
        {ExpandButton}
        <Flex align="center">
          {Handle}
          {typeof nodeTitle === 'function' ? nodeTitle(nodeProps) : nodeTitle}
        </Flex>
      </TreeItemWrapper>
    </Root>
  )
}

export default SortableTreeItem
