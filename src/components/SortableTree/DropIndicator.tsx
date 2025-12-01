import {cyan} from '@sanity/color'
import * as React from 'react'
import styled from 'styled-components'

const IndicatorLine = styled.div`
  position: relative;
  height: 2px;
  background-color: ${cyan[500].hex};
  border-radius: 1px;
  margin: -1px 0;
  pointer-events: none;
  z-index: 10;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 8px;
    height: 8px;
    background-color: ${cyan[500].hex};
    border-radius: 50%;
    margin-left: -4px;
  }
`

export interface DropIndicatorProps {
  depth: number
  indentationWidth: number
}

export function DropIndicator({
  depth,
  indentationWidth,
}: DropIndicatorProps): React.ReactElement {
  return (
    <div
      style={{
        paddingLeft: `${10 + (indentationWidth * depth)}px`,
        paddingRight: '10px',
      }}
    >
      <IndicatorLine />
    </div>
  )
}

export default DropIndicator
