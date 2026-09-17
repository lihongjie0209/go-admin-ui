import { describe, expect, it } from 'vitest';

import {
  editorFields,
  editorFingerprint,
  extractEditorFailure,
  initialEditorValues,
  validateEditorValues,
} from '../../src/components/business/editor-contract';

const fields = [
  { field: 'name', label: '名称', required: true },
  { createOnly: true, field: 'password', label: '初始密码' },
  { editOnly: true, field: 'status', label: '状态' },
  { defaultValue: true, field: 'enabled', label: '启用' },
];

describe('resource editor contract', () => {
  it('selects fields by mode and preserves explicit null create values', () => {
    expect(editorFields(fields, 'create').map(({ field }) => field)).toEqual([
      'name',
      'password',
      'enabled',
    ]);
    expect(editorFields(fields, 'edit').map(({ field }) => field)).toEqual([
      'name',
      'status',
      'enabled',
    ]);
    expect(
      initialEditorValues(fields, 'create', null, {
        enabled: null,
        name: 'Alice',
      }),
    ).toEqual({ enabled: null, name: 'Alice', password: undefined });
  });

  it('validates required and custom rules without treating false or zero as empty', () => {
    const validationFields = [
      { field: 'enabled', label: '启用', required: true },
      { field: 'count', label: '数量', required: true },
      { field: 'roles', label: '角色', required: true },
      {
        field: 'name',
        label: '名称',
        validate: (value) =>
          value === 'root' ? '名称不可使用 root' : undefined,
      },
    ];
    expect(
      validateEditorValues(validationFields, {
        count: 0,
        enabled: false,
        name: 'root',
        roles: [],
      }),
    ).toEqual({ name: '名称不可使用 root', roles: '请填写角色' });
  });

  it('creates a stable recursive fingerprint', () => {
    expect(editorFingerprint({ b: { y: 2, x: 1 }, a: [{ d: 4, c: 3 }] })).toBe(
      editorFingerprint({ a: [{ c: 3, d: 4 }], b: { x: 1, y: 2 } }),
    );
  });

  it('extracts envelope field errors, request ID, and stale-version conflicts', () => {
    expect(
      extractEditorFailure({
        response: {
          data: {
            body: { field_errors: { name: '名称已存在' } },
            code: 30_011,
            message: '版本冲突',
            request_id: 'req-1',
          },
        },
      }),
    ).toEqual({
      fieldErrors: { name: '名称已存在' },
      message: '版本冲突',
      requestID: 'req-1',
      versionConflict: true,
    });
  });
});
