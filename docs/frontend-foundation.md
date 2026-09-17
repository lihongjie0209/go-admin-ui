# Frontend foundation architecture

The frontend is assembled in one direction. Page templates may depend on business components, and business components may depend on foundation components. The reverse dependencies are forbidden.

```text
Go API contracts + request envelope
        ↓
Foundation components
  PBAC, dictionaries, dates, references, status, audit
        ↓
Reusable business components
  resource table, query form, editor, batch/row actions
        ↓
Page templates
  flat CRUD, tree CRUD, read-only lookup, detail/editor
```

## Dictionary controls

All option controls use `POST /api/v1/public/dictionaries/query`. A component receives a stable dictionary code and never embeds a local duplicate option list.

| Component | Required dictionary type | Purpose |
| --- | --- | --- |
| `GoDictionarySelect` | `enum` | Single or multiple flat option selection |
| `GoDictionaryTreeSelect` | `tree` | Single or multiple hierarchical selection |
| `GoDictionaryText` | Either | Resolve list/detail values through one shared dictionary cache |
| `GoDictionarySelectControl` | Either | Internal adapter used by the typed foundation controls |

The backend returns complete bounded trees. The UI builds parent/child links with item IDs, uses `value` as the submitted business value, preserves disabled items for display, forwards the bounded extension object, and fails visibly when a component is bound to the wrong dictionary type. Search is remote and debounced. Stale responses cannot overwrite a newer query.

## Navigation and PBAC

The left navigation is the current application's server-authorized navigation tree. Directories provide hierarchy; menu nodes provide route, component, `resource`, and `action`. Ordering is `sort_order` followed by stable ID. The frontend does not keep a second static menu or permission list.

The navigation response is already filtered by the backend. The retained Resource/Action metadata is attached to route metadata for page and action components. `GoAccess` and row-capability evaluation only improve presentation; the backend remains the security boundary and all unknown/error states fail closed.

Every page root uses `GoCapabilityProvider` and declares its stable capability keys with their canonical Resource/Action pairs. On mount, declarations from the page and reusable child components are deduplicated and sent in one batch to `/authorization/capabilities/evaluate` (maximum 100). Descendants consume the injected result; they do not issue one request per button. Reusing one key for different Resource/Action pairs is a configuration error and fails closed. Row capabilities are evaluated separately for the IDs on the current page.

## Test levels

- Unit tests call exported request transforms, dictionary transforms, PBAC state logic, and navigation mapping directly.
- Component integration tests mount the real Vue components and exercise loading, selection, search, error, concurrency, and unmount behavior through their public props and emitted events.
- Page integration tests compose the real foundation and business components against a controlled HTTP boundary and verify the Go envelope, POST payload, optimistic version, PBAC visibility, and rendered result.
- Browser end-to-end tests are reserved for a later concrete business module; phase one has no domain page to drive.

Reading component source text and asserting that strings are present is not a behavioral test and does not count toward coverage or Definition of Done.

## Query and pagination

`GoQueryForm` accepts an explicit field declaration. It emits the backend `keyword` plus typed `filters`, including deduplicated bounded ID lists, explicit `*_from`/`*_to` ranges, and RFC 3339 timestamps with an offset. A field is queryable only when the page declares it; arbitrary client SQL field names are never produced.

`GoPagination` uses one-based pages and emits `{page,page_size}`. Changing the page size returns to page 1, and a result-count reduction clamps stale pages. It intentionally listens only to Ant Design's `change` event because a size change can otherwise emit twice.

## Resource workspace

`GoResourceWorkspace` composes `GoQueryForm` with the existing `GoResourceTable`; it does not introduce another grid implementation. Initial and submitted query values become the shared `{keyword,filters}` contract. Changing that contract resets the grid to page 1.

`GoResourceTable` merges filters in increasing authority: page query, grid filters, then immutable `fixedFilters`. This ensures a UI filter cannot replace a tenant or ownership constraint. Every new page request aborts the preceding request and rejects late responses before they can update row capabilities or visible data. Create, update and delete continue to use the page capability registry, while current-page row actions use the separate row-capability batch.

The rendered table is `GoDataGrid`, a transport-neutral Ant Design component. It receives page loading, mutations, row actions, and batch actions as explicit functions and never imports a database, realtime, storage, or authentication client. The earlier backend-bound table and its concrete legacy business pages were removed rather than retained behind a compatibility facade. Server-driven Go navigation must only reference page components that exist in this repository.

The frontend depends only on the platform's Go HTTP contracts and has no direct database, BaaS, storage, or realtime client. Public platform configuration and password changes use the shared Go `requestClient`. Cache refresh and server-driven navigation updates must use the platform's documented HTTP/event contracts when those backend capabilities are introduced.

## Tree resources

`GoTreeResource` consumes a bounded complete tree endpoint and provides search, selection, create/edit hooks, optimistic leaf deletion, retry state and PBAC action visibility. It normalizes every node to non-null `children`, stable `sort_order,id` ordering and a consistent `parent_id`. Duplicate IDs, cycles, dangling hierarchy declarations and invalid moves fail before a mutation is sent. Search retains ancestors for context and omits unrelated branches.

Page operation capabilities are evaluated once through `GoCapabilityProvider`. When row authorization is enabled, only the currently selected node is sent to the row-capability endpoint; a large tree must never be expanded into thousands of authorization requests. Concrete pages own the editor drawer through the component's create/edit events and call its exposed create/update methods after validating their domain fields.

## Resource editor

`GoResourceEditor` is the declarative create, edit, and detail drawer used by flat and tree resource pages. A field declaration selects standard inputs, dictionaries, tree dictionaries, validation, defaults, and create/edit visibility. Create and update capabilities are registered with the page PBAC batch; denied or unresolved decisions disable submission and never replace backend enforcement.

Edit submission includes a point-in-time copy of the original record, including `id` and `version`, so adapters can enforce optimistic locking. The editor prevents duplicate submission, maps backend `field_errors` back to fields, preserves `request_id` for support, gives stale-version errors a dedicated recovery message, and confirms before discarding dirty state. Values crossing the submit boundary are JSON request data rather than Vue proxies. Detail mode is read-only and has no save action.

## Page templates

`FlatResourcePage` combines the query workspace, resource table, capability provider, and resource editor. A concrete module supplies one typed contract containing its canonical Resource, endpoints, columns, query fields, editor fields, fixed filters, and optional extra capabilities. Create, update, and delete capabilities are always registered by the template; optional declarations add domain actions rather than replacing the mandatory mutation checks. The table's embedded legacy editor is disabled in this composition.

`TreeResourcePage` combines the bounded tree resource and the same editor. Creating a child injects the selected node's ID as `parent_id`; editing preserves the complete node snapshot for version and move validation. Fixed filters and row authorization pass directly to the tree boundary, so tenant or ownership scoping cannot be reconstructed from visible nodes.

After a flat-resource write commits, editor success and list refresh are separate lifecycle steps. A failed refresh must not turn a successful mutation into a save failure that invites a duplicate create. Tree mutations use the tree component's guarded reload path, whose load failures are represented in the tree state without rejecting the completed mutation.

## Resource detail

`GoResourceDetail` is the read-only drawer used by the flat resource template. Opening the standard “查看” row action calls the resource `get` endpoint with the row ID instead of treating potentially stale page data as authoritative. The request is cancellable, late responses cannot replace a newer selection, load failures are retryable, and a missing or denied `read` capability fails closed without issuing the request.

Detail fields explicitly declare their presentation as text, datetime, dictionary, status, related reference, boolean, or JSON. Related identifiers require a declared display field. Audit metadata is rendered in one standard section through `GoAuditSummary`; concrete pages must not rebuild timestamp, actor, or version presentation. Sensitive fields are excluded from the declaration rather than hidden with CSS.
