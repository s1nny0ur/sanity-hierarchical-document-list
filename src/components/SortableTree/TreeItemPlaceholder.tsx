import {cyan, gray} from '@sanity/color'
import {Box, Text} from '@sanity/ui'
import * as React from 'react'
import styled from 'styled-components'

const PlaceholderRoot = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100px;
  padding: 24px;
  background-color: ${cyan[50].hex};
  border: 2px dashed ${gray[400].hex};
  border-radius: 3px;
  margin: 8px;
`

export interface TreeItemPlaceholderProps {
  title: string
  subtitle?: string
}

export function TreeItemPlaceholder({title, subtitle}: TreeItemPlaceholderProps) {
  return (
    <PlaceholderRoot>
      <Box marginBottom={subtitle ? 2 : 0}>
        <Text size={2} weight="semibold" muted>
          {title}
        </Text>
      </Box>
      {subtitle && (
        <Text size={1} muted>
          {subtitle}
        </Text>
      )}
    </PlaceholderRoot>
  )
}

export default TreeItemPlaceholder
