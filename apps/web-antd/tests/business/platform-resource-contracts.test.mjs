import { describe, expect, it } from 'vitest';

import { prepareEditorValues } from '../../src/components/business/editor-contract';
import { gridCellText } from '../../src/components/business/go-data-grid-types';
import { normalizeQuery } from '../../src/components/foundation/query-contract';
import {
  applicationPageContract,
  dictionaryItemPageContract,
  dictionaryPageContract,
  navigationTreeContract,
  permissionTreeContract,
  platformConfigPageContract,
  scheduledJobPageContract,
  scheduledJobRunPageContract,
  tenantPageContract,
  userPageContract,
} from '../../src/modules/platform/resource-contracts';

describe('platform resource contracts', () => {
  it('binds each page to its canonical authorization resource and API root', () => {
    expect(userPageContract.authorizationResource).toBe('identity.user');
    expect(userPageContract.table.endpoints.page).toBe('/users/page');
    expect(tenantPageContract.authorizationResource).toBe('tenant');
    expect(tenantPageContract.table.endpoints.page).toBe(
      '/platform/tenants/page',
    );
    expect(platformConfigPageContract.authorizationResource).toBe(
      'platform.config',
    );
    expect(platformConfigPageContract.table.endpoints.page).toBe(
      '/platform-configs/page',
    );
    expect(applicationPageContract.table.endpoints.page).toBe(
      '/applications/page',
    );
    expect(scheduledJobPageContract.authorizationResource).toBe(
      'scheduled-job',
    );
    expect(scheduledJobPageContract.table.endpoints.page).toBe(
      '/scheduled-jobs/page',
    );
    expect(dictionaryPageContract.table.endpoints.page).toBe(
      '/dictionaries/page',
    );
  });

  it('only allows scheduled jobs to select code-registered handlers', () => {
    const handler = scheduledJobPageContract.editorFields.find(
      (field) => field.field === 'handler',
    );
    expect(handler.component).toBe('select');
    expect(handler.optionLoader).toBeTypeOf('function');
    expect(scheduledJobPageContract.capabilities).toContainEqual({
      action: 'execute',
      key: 'scheduled-job:execute',
      resource: 'scheduled-job',
    });
    expect(scheduledJobPageContract.table.rowActions[0].authorization).toEqual({
      action: 'execute',
      key: 'scheduled-job:execute',
      resource: 'scheduled-job',
    });
    expect(
      scheduledJobPageContract.editorFields.find(
        (field) => field.field === 'payload',
      ).component,
    ).toBe('json');
  });

  it('scopes execution history to one scheduled job and disables mutations', () => {
    const contract = scheduledJobRunPageContract('job-1');
    expect(contract.table.fixedFilters).toEqual({ scheduled_job_id: 'job-1' });
    expect(contract.table.endpoints.page).toBe('/scheduled-job-runs/page');
    expect(contract.table.allowCreate).toBe(false);
    expect(contract.table.allowEdit).toBe(false);
    expect(contract.table.allowDelete).toBe(false);
  });

  it('normalizes typed user filters to backend field names', () => {
    const result = normalizeQuery(userPageContract.queryFields, {
      emails: 'one@example.com, two@example.com',
      keyword: ' Alice ',
      statuses: ['active', 'locked'],
    });
    expect(result).toEqual({
      filters: {
        emails: ['one@example.com', 'two@example.com'],
        statuses: ['active', 'locked'],
      },
      keyword: 'Alice',
    });
  });

  it('parses JSON editor fields before sending a platform config', () => {
    const fields = platformConfigPageContract.editorFields.filter(
      (field) => field.component === 'json',
    );
    expect(prepareEditorValues(fields, { value: '{"theme":"light"}' })).toEqual(
      {
        errors: {},
        values: { value: { theme: 'light' } },
      },
    );
    expect(prepareEditorValues(fields, { value: '{invalid' }).errors).toEqual({
      value: '配置值必须是合法 JSON',
    });
  });

  it('keeps dictionary item reads and creates scoped to one definition', () => {
    const contract = dictionaryItemPageContract('dictionary-1', 'region');
    expect(contract.editorInitialValues).toEqual({
      dictionary_id: 'dictionary-1',
    });
    expect(
      contract.table.mapFilters({ disabled: 'false', parent_id: 'root-1' }),
    ).toEqual({
      dictionary_id: 'dictionary-1',
      disabled: false,
      parent_id: 'root-1',
    });
  });

  it('scopes navigation trees to one application and validates menu bindings', () => {
    const contract = navigationTreeContract('application-1');
    expect(contract.fixedFilters).toEqual({ application_id: 'application-1' });
    expect(contract.editorInitialValues).toEqual({
      application_id: 'application-1',
    });
    const component = contract.editorFields.find(
      (field) => field.field === 'component',
    );
    expect(component.component).toBe('select');
    expect(component.optionLoader).toBeTypeOf('function');
    expect(
      component.validate('', { navigation_type: 'directory' }),
    ).toBeUndefined();
    expect(component.validate('', { navigation_type: 'menu' })).toBe(
      '菜单必须填写合法的页面组件',
    );
    const resource = contract.editorFields.find(
      (field) => field.field === 'resource',
    );
    const action = contract.editorFields.find(
      (field) => field.field === 'action',
    );
    expect(resource.component).toBe('select');
    expect(resource.optionLoader).toBeTypeOf('function');
    expect(action.optionsDependsOn).toEqual(['resource']);
    expect(action.clearOnDependencyChange).toBe(true);
    expect(
      contract.editorFields.find((field) => field.field === 'icon').component,
    ).toBe('icon');
  });

  it('prevents system permission definitions from being edited or deleted', () => {
    expect(permissionTreeContract.authorizationResource).toBe(
      'permission.definition',
    );
    expect(permissionTreeContract.canEditNode({ is_system: true })).toBe(false);
    expect(permissionTreeContract.canDeleteNode({ is_system: false })).toBe(
      true,
    );
    const action = permissionTreeContract.editorFields.find(
      (field) => field.field === 'action',
    );
    expect(action.component).toBe('select');
    expect(action.optionsDependsOn).toEqual(['resource']);
  });

  it('renders references and empty values without exposing object internals', () => {
    expect(gridCellText({ id: 'user-1', name: '张三' })).toBe('张三');
    expect(gridCellText(null)).toBe('—');
    expect(gridCellText(false)).toBe('否');
  });
});
