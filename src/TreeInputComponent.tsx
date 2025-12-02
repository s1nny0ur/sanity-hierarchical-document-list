import * as React from 'react'
import {FormField, FormNodePresence, PatchEvent, Path} from 'sanity'

import TreeEditor from './components/TreeEditor'
import {StoredTreeItem, TreeFieldSchema, TreeOperationMeta} from './types'
import injectNodeTypeInPatches, {DEFAULT_DOC_TYPE} from './utils/injectNodeTypeInPatches'

export interface TreeInputComponentProps {
  type: TreeFieldSchema
  value: StoredTreeItem[]
  level: number
  onChange: (event: unknown) => void
  onFocus: (path: Path) => void
  onBlur: () => void
  focusPath: Path
  readOnly: boolean
  presence: FormNodePresence[]
}

const TreeInputComponent: React.FC<TreeInputComponentProps> = (props) => {
  const documentType = props.type.options.documentType || DEFAULT_DOC_TYPE

  // Note: The onTreeChange callback is only supported when using createDeskHierarchy.
  // Form field inputs use Sanity's standard onChange mechanism which doesn't support
  // the callback. For real-time tree sync, use createDeskHierarchy instead.
  const onChange = React.useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (patch: PatchEvent, _operationMeta?: TreeOperationMeta) => {
      const patches = injectNodeTypeInPatches(patch?.patches, documentType)
      props.onChange(new PatchEvent(patches))
    },
    [props.onChange, documentType]
  )

  return (
    <FormField
      description={props.type.description} // Creates description from schema
      title={props.type.title} // Creates label from schema title
      __unstable_presence={props.presence} // Handles presence avatars
    >
      <TreeEditor options={props.type.options} tree={props.value || []} onChange={onChange} />
    </FormField>
  )
}

export default TreeInputComponent
