# Go Admin UI Engineering SOP

This repository is the Vue/Vben/Ant Design frontend for the Go API template.

## Boundaries

- Preserve and extend the copied Vben and existing business components. Do not
  rebuild an equivalent component when an adapter or small central refactor is
  sufficient.
- API integration belongs under `apps/web-antd/src/api/go`; Vue components must
  not create ad-hoc HTTP clients or depend on backend URLs directly.
- Business templates belong under `apps/web-antd/src/templates`. Phase-one
  templates must not encode user, tenant, application, or other concrete domain
  behavior.
- All business APIs use POST + JSON and the shared
  `{code,message,body,request_id}` envelope. Success is `code === 0`.
- Mutating update/delete/state requests carry `id` and `version`. Never hide a
  version conflict by retrying automatically.
- Page requests and responses use `page`, `page_size`, `keyword`, `filters`,
  `sort` and `{items,page,page_size,total}`. Client-provided sort fields are
  declared in the resource contract, not assembled from arbitrary UI values.
- Related IDs require display names, timestamps remain RFC3339, and the default
  presentation timezone is `Asia/Shanghai`.
- Permission checks use canonical Resource/Action capabilities. UI visibility
  is convenience only; the backend remains authoritative.
- Do not log or persist access tokens, refresh tokens, passwords, signed URLs,
  cookies, or other credentials. Refresh tokens use the dedicated token vault.
- Add unit tests for protocol transforms, pagination, error/request-ID handling,
  optimistic mutations, dictionary transforms, and component behavior.

## Definition of done

- `pnpm check:type`, lint, and relevant Vitest suites pass.
- API and component contracts have loading, empty, error, cancellation, and
  concurrency behavior defined.
- Existing base/business components are reused and no concrete business module
  is introduced by infrastructure-template work.
