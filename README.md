# @considered-vision/sanity-hierarchical-document-list

> **Fork of [@sanity/hierarchical-document-list](https://github.com/sanity-io/hierarchical-document-list)** with maintained dependencies and dnd-kit-based tree view.

**Compatibility:** Sanity v3, v4, and v5 | React 18.3+ and 19+

Plugin for visually organizing documents as hierarchies in the [Sanity studio](https://www.sanity.io/docs/sanity-studio). Applications include:

- Tables of content - such as a book's sections and chapters
- Navigational structure & menus - a website mega-menu with multiple levels, for example
- Taxonomy inheritance - "_Carbs_ is a parent of _Legumes_ which is a parent of _Beans_"

![Screenshot of the plugin](/screenshot-1.jpg)

If you're looking for a way to order documents on a flat list, refer to [@sanity/orderable-document-list](https://github.com/sanity-io/orderable-document-list).

## Installation

```bash
# From the root of your sanity project
npm i @considered-vision/sanity-hierarchical-document-list
```

## Usage

### 1. Add the plugin and the default documentType to the sanity.config.ts

```js
// sanity.config.js
import {defineConfig} from 'sanity'
import {
  hierarchicalDocumentList,
  hierarchyTree
} from '@considered-vision/sanity-hierarchical-document-list'

export default defineConfig({
  // ...
  plugins: [hierarchicalDocumentList()],
  schema: {
    types: [
      //...,
      hierarchyTree
    ]
  }
})
```

### 2. Add one or more hierarchy documents to your Structure Builder.

💡 _To learn about custom structures, refer to the [Structure Builder docs](https://www.sanity.io/docs/overview-structure-builder)._

```ts
// sanity.config.ts
import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {
  createDeskHierarchy,
  hierarchicalDocumentList,
  hierarchyTree
} from '@considered-vision/sanity-hierarchical-document-list'

export default defineConfig({
  // ...
  plugins: [
    structureTool({
      // NOTE: You MUST pass S and Context along to createDeskHierarchy as props
      structure: (S, context) =>
        S.list()
          .title('Content')
          .items([
            ...S.documentTypeListItems(), // or whatever other structure you have
            createDeskHierarchy({
              //prop drill S and context:
              S,
              context,

              //configure plugin

              title: 'Main table of contents',

              // The hierarchy will be stored in this document ID 👇
              documentId: 'main-table-of-contents',

              // Document types editors should be able to include in the hierarchy
              referenceTo: ['site.page', 'site.post', 'docs.article', 'social.youtubeVideo'],

              // ❓ Optional: provide filters and/or parameters for narrowing which documents can be added
              referenceOptions: {
                filter: 'status in $acceptedStatuses',
                filterParams: {
                  acceptedStatuses: ['published', 'approved']
                }
              },

              // ❓ Optional: limit the depth of your hierarachies
              maxDepth: 3,

              // ❓ Optional: subarray of referenceTo, when it should not be possible to create new types from all referenceTo types
              creatableTypes: ['site.page']
            })
          ])
    }),
    hierarchicalDocumentList()
  ],
  schema: {
    types: [
      //...,
      hierarchyTree
    ]
  }
})
```

## How it works

The hierarchical data is stored in a centralized document with the `documentId` of your choosing. As compared to storing parent/child relationships in each individual document in the hierarchy, this makes it easier to implement different hierarchies for the same content according to the context.

This approach also simplifies querying the full structure - as you'll see in [querying data](#querying-data) below.

Keep in mind that this specified **document is live-edited**, meaning it has no draft and every change by editors will directly affect its published version.

Instead of requiring editors to manually add items one-by-one, the plugin will create a [GROQ](https://www.sanity.io/docs/overview-groq) query that matches all documents with a `_type` in the `referenceTo` option you specify, that also match the optional `referenceOptions.filter`. From these documents, editors are able to drag, nest and re-order them at will from the "Add more items" list.

If a document in the tree doesn't match the filters set, it'll keep existing in the data. This can happen if the document has a new, unfitting value, the configuration changed or it was deleted. Although the tree will still be publishable, editors will get a warning and won't be able to drag these faulty entries around.

## Querying data

The plugin stores flat arrays which represent your hierarchical data through `parent` keys. Here's an example of one top-level item with one child:

```json
[
  {
    "_key": "741b9edde2ba",
    "_type": "hierarchy.node",
    "value": {
      "reference": {
        "_ref": "75c47994-e6bb-487a-b8c9-b283f2436031",
        "_type": "reference",
        "_weak": true // This plugin includes weak references by default
      },
      "docType": "docs.article"
    }
    // no `parent`, this item is top-level
  },
  {
    "_key": "f92eaeec96f7",
    "_type": "hierarchy.node",
    "value": {
      "reference": {
        "_ref": "7ad60a02-5d6e-47d8-92e2-6724cc130058",
        "_type": "reference",
        "_weak": true
      },
      "docType": "site.post"
    },
    // The `parent` property points to the _key of the parent node where this one is nested
    "parent": "741b9edde2ba"
  }
]
```

📌 If using GraphQL, refer to [Usage with GraphQL](#usage-with-graphql).

From the the above, we know how to expand referenced documents in GROQ:

```groq
*[_id == "main-table-of-contents"][0]{
  tree[] {
    // Make sure you include each item's _key and parent
    _key,
    parent,

    // "Expand" the reference to the node
    value {
      reference->{
        // Get whatever property you need from your documents
        title,
        slug,
      }
    }
  }
}
```

The query above will then need to be converted from flat data to a tree. Refer to [Using the data](#using-the-data).

<!-- ### Other query scenarios

Find a given document in a hierarchy and get its parent - useful for rendering breadcrumbs:

```groq
// Works starting from Content Lake V2021-03-25
*[_id == "main-table-of-contents"][0]{
  // From the tree, get the 1st node that references a given document _id
  tree[node._ref == "my-book-section"][0] {
    _key,
    "section": node.reference->{
      title,
    },
    // Then, from the tree get the element matching the `parent` _key of the found node
    "parentChapter": ^.tree[_key == ^.parent][0]{
      _key,
      "chapter": node.reference->{
        title,
        contributors,
      }
    },
  }
}
```

---- -->

## Using the data

From the flat data queried, you'll need to convert it to a nested tree with `flatDataToTree`:

```js
import {flatDataToTree} from '@considered-vision/sanity-hierarchical-document-list'

const hierarchyDocument = await client.fetch(`*[_id == "book-v3-review-a"][0]{
  tree[] {
    // Make sure you include each item's _key and parent
    _key,
    parent,
    value {
      reference->{
        title,
        slug,
        content,
      }
    }
  }
}`)
const tree = flatDataToTree(data.tree)

/* Results in a recursively nested structure. Using the example data above:
{
  "_key": "741b9edde2ba",
  "_type": "hierarchy.node",
  "value": {
    "reference": {
      "_ref": "75c47994-e6bb-487a-b8c9-b283f2436031",
      "_type": "reference",
      "_weak": true
    },
    "docType": "docs.article"
  },
  "parent": null,
  "children": [
    {
      "_key": "f92eaeec96f7",
      "_type": "hierarchy.node",
      "value": {
        "reference": {
          "_ref": "7ad60a02-5d6e-47d8-92e2-6724cc130058",
          "_type": "reference",
          "_weak": true
        },
        "docType": "site.post"
      },
      "parent": "741b9edde2ba"
    }
  ]
}
*/
```

After the transformation above, nodes with nested entries will include a `children` array. This data structure is recursive.

## Usage with GraphQL

By default, this plugin will create and update documents of `_type: hierarchy.tree`, with a `tree` field holding the hierarchical data. When deploying a [GraphQL Sanity endpoint](https://www.sanity.io/docs/graphql), however, you'll need an explicit document type in your schema so that you get the proper types for querying.

To add this document type, create a set of schemas with the `createHierarchicalSchemas`:

```js
// hierarchicalSchemas.js
import {createHierarchicalSchemas} from '@considered-vision/sanity-hierarchical-document-list'

export const hierarchicalOptions = {
  // choose the document type name that suits you best
  documentType: 'myCustomHierarchicalType',

  // key for the tree field in the document - "tree" by default
  fieldKeyInDocument: 'customTreeDataKey',

  // Document types editors should be able to include in the hierarchy
  referenceTo: ['site.page', 'site.post', 'docs.article', 'social.youtubeVideo'],

  // ❓ Optional: provide filters and/or parameters for narrowing which documents can be added
  referenceOptions: {
    filter: 'status in $acceptedStatuses',
    filterParams: {
      acceptedStatuses: ['published', 'approved']
    }
  },

  // ❓ Optional: limit the depth of your hierarachies
  maxDept: 3
}

export default createHierarchicalSchemas(hierarchicalOptions)
```

And add these schemas to your studio:

```js
import createSchema from 'part:@sanity/base/schema-creator'
import schemaTypes from 'all:part:@sanity/base/schema-type'
import hierarchicalSchemas from './hierarchicalSchemas'

export default createSchema({
  name: 'default',
  types: schemaTypes.concat([
    // ...Other schemas
    ...hierarchicalSchemas // add all items in the array of hierarchical schemas
  ])
})
```

Then, in your desk structure where you added the hierarchical document(s), include the right `documentType` and `fieldKeyInDocument` properties:

```js
createDeskHierarchy({
  // Include whatever values you defined in your schema in the step above
  documentType: 'myCustomHierarchicalType', // the name of your document type
  fieldKeyInDocument: 'customTreeDataKey' // the name of the hierarchical field
  // ...
})

// Ideally, use the same configuration object you defined in your schemas:
import {hierarchicalOptions} from './hierarchicalSchemas'

createDeskHierarchy({
  ...hierarchicalOptions
  // ...
})
```

---

📌 **Note:** you can also use the method above to add hierarchies inside the schema of documents and objects, which would be editable outside the desk structure.

We're considering adapting this input to support any type of nest-able data, not only references. Until then, avoid using the generated schemas in nested schemas as, in these contexts, it lacks the necessary affordances for a good editing experience.

---

## Tree Change Callback

The `onTreeChange` callback allows you to react to tree mutations in real-time. This is useful for syncing hierarchy data back to individual documents, such as updating slugs, breadcrumbs, or path fields.

### Basic Usage

```ts
import {createDeskHierarchy} from '@considered-vision/sanity-hierarchical-document-list'

createDeskHierarchy({
  S,
  context,
  title: 'Main Navigation',
  documentId: 'main-nav',
  referenceTo: ['page', 'article'],

  onTreeChange: async (event) => {
    console.log(`Tree ${event.operation}:`, event.affectedDocIds)
    console.log('All paths:', event.paths)
  }
})
```

### Callback Event Properties

The `TreeChangeEvent` object passed to your callback includes:

| Property         | Type                                                      | Description                                                 |
| ---------------- | --------------------------------------------------------- | ----------------------------------------------------------- |
| `treeDocId`      | `string`                                                  | The tree document ID                                        |
| `tree`           | `StoredTreeItem[]`                                        | Full tree state after the mutation                          |
| `operation`      | `'add' \| 'remove' \| 'move' \| 'duplicate' \| 'reorder'` | Type of operation that triggered the change                 |
| `affectedDocIds` | `string[]`                                                | Document IDs affected by this change (includes descendants) |
| `paths`          | `DocumentPathInfo[]`                                      | Computed paths for ALL documents in tree                    |

Each `DocumentPathInfo` object contains:

| Property           | Type                    | Description                                                                |
| ------------------ | ----------------------- | -------------------------------------------------------------------------- |
| `docId`            | `string`                | Published document `_id`                                                   |
| `docType`          | `string`                | Document `_type`                                                           |
| `ancestors`        | `string[]`              | Ordered array of ancestor document `_id`s (root to parent)                 |
| `nodeKey`          | `string`                | This document's `_key` in the tree                                         |
| `parentNodeKey`    | `string \| null`        | Parent's `_key` in the tree (`null` if root level)                         |
| `depth`            | `number`                | Zero-based depth in hierarchy                                              |
| `siblingIndex`     | `number`                | Position among siblings (zero-based)                                       |
| `slug`             | `string \| undefined`   | Document's slug (when `slugField` is configured)                           |
| `ancestorSlugs`    | `string[] \| undefined` | Ordered array of ancestor slugs (when `slugField` is configured)           |
| `computedPath`     | `string \| undefined`   | Full URL path, e.g., `/parent/child/page` (when `slugField` is configured) |
| `computedSegments` | `string[] \| undefined` | Array of path segments (when `slugField` is configured)                    |

### Slug/Path Computation

The plugin can automatically compute URL paths from document slugs. This eliminates the need for additional queries or duplicating path logic in your callbacks.

#### Configuration

Add `slugField` to your hierarchy configuration:

```ts
createDeskHierarchy({
  S,
  context,
  title: 'Main Navigation',
  documentId: 'main-nav',
  referenceTo: ['page', 'article'],

  // Simple string path for slug field
  slugField: 'slug.current',

  // Optional: customize path separator (default: '/')
  pathSeparator: '/',

  onTreeChange: async (event) => {
    for (const pathInfo of event.paths) {
      console.log(pathInfo.slug) // 'about-us'
      console.log(pathInfo.ancestorSlugs) // ['services']
      console.log(pathInfo.computedPath) // '/services/about-us'
      console.log(pathInfo.computedSegments) // ['services', 'about-us']
    }
  }
})
```

#### Using a Function for Complex Slug Resolution

For documents with varying slug field locations or custom logic:

```ts
createDeskHierarchy({
  // ...
  slugField: (doc) => {
    // Try slugOverride first, fall back to slug.current
    if (doc.slugOverride) {
      return doc.slugOverride
    }
    return doc.slug?.current
  },

  onTreeChange: async (event) => {
    // Paths now include computed slugs from your custom logic
  }
})
```

#### Type-Specific Slug Resolution

```ts
createDeskHierarchy({
  // ...
  slugField: (doc) => {
    switch (doc._type) {
      case 'page':
        return doc.slug?.current
      case 'article':
        return doc.urlPath || doc.slug?.current
      case 'category':
        return doc.handle
      default:
        return doc.slug?.current
    }
  }
})
```

#### Slug Field Options

| Option          | Type                                                       | Description                                        |
| --------------- | ---------------------------------------------------------- | -------------------------------------------------- |
| `slugField`     | `string \| ((doc: SanityDocument) => string \| undefined)` | Field path or function to extract slugs            |
| `pathSeparator` | `string`                                                   | Separator for joining path segments (default: `/`) |

When `slugField` is configured, the plugin will:

- Fetch the necessary slug data from documents (no additional queries needed)
- Compute `slug`, `ancestorSlugs`, `computedPath`, and `computedSegments` for each document
- Include this data in every `DocumentPathInfo` object passed to your callback

### Syncing Paths to Documents

A common use case is syncing hierarchy information back to individual documents:

```ts
import {createDeskHierarchy} from '@considered-vision/sanity-hierarchical-document-list'

export const structure = (S, context) => {
  const client = context.getClient({apiVersion: '2023-01-01'})

  return S.list()
    .title('Content')
    .items([
      createDeskHierarchy({
        S,
        context,
        title: 'Main Navigation',
        documentId: 'main-nav',
        referenceTo: ['page', 'article'],

        // Enable slug computation
        slugField: 'slug.current',

        onTreeChange: async (event) => {
          const transaction = client.transaction()

          for (const pathInfo of event.paths) {
            // Only update documents that were affected by this change
            if (event.affectedDocIds.includes(pathInfo.docId)) {
              transaction.patch(pathInfo.docId, {
                set: {
                  _hierarchy: {
                    ancestors: pathInfo.ancestors,
                    depth: pathInfo.depth,
                    siblingIndex: pathInfo.siblingIndex,
                    treeId: event.treeDocId,
                    // Slug data is now included!
                    path: pathInfo.computedPath,
                    breadcrumbs: pathInfo.ancestorSlugs
                  }
                }
              })
            }
          }

          await transaction.commit()
        }
      })
    ])
}
```

### Enabling/Disabling the Callback

Use `enableTreeChangeCallback` to conditionally enable or disable the callback:

```ts
createDeskHierarchy({
  // ...
  onTreeChange: handleTreeChange,
  enableTreeChangeCallback: false // Callback will not fire
})
```

| `onTreeChange` | `enableTreeChangeCallback` | Result                   |
| -------------- | -------------------------- | ------------------------ |
| undefined      | undefined                  | No callback              |
| undefined      | true                       | No callback              |
| defined        | undefined                  | Callback fires (default) |
| defined        | true                       | Callback fires           |
| defined        | false                      | No callback              |

**Environment-based toggle:**

```ts
createDeskHierarchy({
  // ...
  onTreeChange: handleTreeChange,
  enableTreeChangeCallback: process.env.SANITY_STUDIO_ENABLE_TREE_SYNC === 'true'
})
```

**Role-based toggle:**

```ts
createDeskHierarchy({
  // ...
  onTreeChange: handleTreeChange,
  enableTreeChangeCallback: context.currentUser?.roles.some((r) => r.name === 'administrator')
})
```

### TypeScript Types

The plugin exports all relevant types for TypeScript users:

```ts
import type {
  TreeChangeEvent,
  TreeChangeCallback,
  DocumentPathInfo,
  TreeOperationMeta,
  SlugExtractor,
  SlugFieldConfig,
  ComputePathsOptions
} from '@considered-vision/sanity-hierarchical-document-list'
```

| Type                  | Description                                                  |
| --------------------- | ------------------------------------------------------------ |
| `TreeChangeEvent`     | Event payload passed to the `onTreeChange` callback          |
| `TreeChangeCallback`  | Function type for the callback                               |
| `DocumentPathInfo`    | Information about a document's position in the tree          |
| `TreeOperationMeta`   | Metadata about tree operations                               |
| `SlugExtractor`       | Function type `(doc: SanityDocument) => string \| undefined` |
| `SlugFieldConfig`     | Union type: `string \| SlugExtractor`                        |
| `ComputePathsOptions` | Options for the `computeAllPaths` utility                    |

### Important Notes

- **Non-blocking**: Callback errors are caught and logged to console, they will not break tree operations
- **Async support**: Both sync and async callbacks are supported
- **No debouncing**: Each tree mutation fires the callback independently. Implement your own debouncing if needed
- **Desk structure only**: The callback is only supported when using `createDeskHierarchy`. Form field inputs do not support callbacks

---

## In-Tree Status Sync

The plugin can track which documents belong to the tree by syncing a boolean field on each document. This enables powerful schema patterns like conditional `readOnly` fields.

### Use Cases

- **Lock slugs for tree-managed documents**: Prevent direct slug edits that would break computed paths
- **Show visual indicators**: Display badges or messages for tree-managed documents
- **Filter queries**: Query only documents that are (or aren't) in a hierarchy

### Configuration Options

| Option           | Type      | Description                                        |
| ---------------- | --------- | -------------------------------------------------- |
| `inTreeField`    | `string`  | Field name on documents to sync (e.g., `'inTree'`) |
| `autoSyncInTree` | `boolean` | When `true`, plugin auto-patches documents         |

### Auto-Sync Mode (Simple)

The plugin handles everything automatically:

```ts
createDeskHierarchy({
  S,
  context,
  title: 'Main Navigation',
  documentId: 'main-nav',
  referenceTo: ['page'],

  // Enable auto-sync
  inTreeField: 'inTree',
  autoSyncInTree: true
})
```

When documents are added to the tree, `inTree` is set to `true`.
When removed, `inTree` is set to `false`.

### Manual Sync Mode (More Control)

Handle syncing yourself using the callback:

```ts
createDeskHierarchy({
  S,
  context,
  title: 'Main Navigation',
  documentId: 'main-nav',
  referenceTo: ['page'],

  inTreeField: 'inTree',
  autoSyncInTree: false, // default

  onTreeChange: async (event) => {
    const client = context.getClient({apiVersion: '2024-01-01'})
    const transaction = client.transaction()

    // Set inTree: true for documents in tree
    for (const pathInfo of event.paths) {
      transaction.patch(pathInfo.docId, {
        set: {inTree: true}
      })
    }

    // Set inTree: false for removed documents
    for (const docId of event.removedDocIds) {
      transaction.patch(docId, {
        set: {inTree: false}
      })
    }

    await transaction.commit()
  }
})
```

### Schema Pattern: Conditional Read-Only Slugs

Use `inTree` to lock slug fields for documents managed by the hierarchy:

```ts
// page.ts schema
import {defineType, defineField} from 'sanity'

export default defineType({
  name: 'page',
  title: 'Page',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      type: 'string'
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: {source: 'title'},
      readOnly: ({document}) => document?.inTree === true,
      description: ({document}) =>
        document?.inTree
          ? 'Slug is managed by the navigation hierarchy. Remove from tree to edit.'
          : undefined
    }),
    defineField({
      name: 'inTree',
      type: 'boolean',
      hidden: true, // Managed by plugin
      initialValue: false
    })
  ]
})
```

### TreeChangeEvent: removedDocIds

The callback event now includes `removedDocIds`:

| Property        | Type       | Description                                   |
| --------------- | ---------- | --------------------------------------------- |
| `removedDocIds` | `string[]` | Documents removed from tree in this operation |

This array is populated when documents are removed from the tree, allowing you to update their `inTree` status accordingly.

---

## License

MIT-licensed. See LICENSE.

## License

[MIT](LICENSE) © Sanity

## Develop & test

This plugin uses [@sanity/plugin-kit](https://github.com/sanity-io/plugin-kit)
with default configuration for build & watch scripts.

See [Testing a plugin in Sanity Studio](https://github.com/sanity-io/plugin-kit#testing-a-plugin-in-sanity-studio)
on how to run this plugin with hotreload in the studio.

### Release new version

Run ["CI & Release" workflow](https://github.com/sanity-io/hierarchical-document-list/actions/workflows/main.yml).
Make sure to select the main branch and check "Release new version".

Semantic release will only release on configured branches, so it is safe to run release on any branch.
