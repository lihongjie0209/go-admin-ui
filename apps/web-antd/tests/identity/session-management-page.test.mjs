/* eslint-disable vue/one-component-per-file, vue/require-prop-types -- page-composition stubs */
import { createApp, defineComponent, h, nextTick } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import SessionsPage from '../../src/views/identity/sessions/index.vue';

const state = vi.hoisted(() => ({
  actionProps: null,
  capabilities: null,
  logoutAll: vi.fn(),
  reload: vi.fn(),
  revoke: vi.fn(),
  workspaceProps: null,
}));

vi.mock('@vben/common-ui', () => ({
  Page: defineComponent({
    setup:
      (_, { slots }) =>
      () =>
        h('main', slots.default?.()),
  }),
}));
vi.mock('../../src/components/foundation/GoCapabilityProvider.vue', () => ({
  default: defineComponent({
    props: ['capabilities'],
    setup:
      (props, { slots }) =>
      () => {
        state.capabilities = props.capabilities;
        return h('section', slots.default?.());
      },
  }),
}));
vi.mock('../../src/components/business/GoResourceWorkspace.vue', () => ({
  default: defineComponent({
    props: ['queryFields', 'table'],
    setup(props, { expose }) {
      expose({ reload: state.reload });
      return () => {
        state.workspaceProps = props;
        return h('section');
      };
    },
  }),
}));
vi.mock('../../src/components/business/GoAuthorizedActionButton.vue', () => ({
  default: defineComponent({
    inheritAttrs: false,
    props: [
      'authorization',
      'confirm',
      'danger',
      'label',
      'run',
      'successMessage',
    ],
    setup:
      (props, { attrs }) =>
      () => {
        state.actionProps = { ...attrs, ...props };
        return h('button');
      },
  }),
}));
vi.mock('#/modules/identity/session-actions', () => ({
  logoutAllSessions: state.logoutAll,
  revokeSession: state.revoke,
}));

let app;
let root;

async function flush() {
  for (let index = 0; index < 8; index++) {
    await Promise.resolve();
    await nextTick();
  }
}

beforeEach(() => {
  for (const value of Object.values(state)) {
    if (typeof value?.mockReset === 'function') value.mockReset();
  }
  state.actionProps = null;
  state.capabilities = null;
  state.workspaceProps = null;
  state.logoutAll.mockResolvedValue(undefined);
  state.reload.mockResolvedValue(undefined);
  state.revoke.mockResolvedValue(undefined);
});

afterEach(() => {
  app?.unmount();
  root?.remove();
});

describe('session management page', () => {
  it('declares only the supported list, revoke, and logout capabilities', async () => {
    root = document.createElement('div');
    document.body.append(root);
    app = createApp(SessionsPage);
    app.mount(root);
    await flush();

    expect(state.capabilities).toEqual([
      {
        action: 'list',
        key: 'identity.session:list',
        resource: 'identity.session',
      },
      {
        action: 'revoke',
        key: 'identity.session:revoke',
        resource: 'identity.session',
      },
      {
        action: 'logout',
        key: 'identity.session:logout',
        resource: 'identity.session',
      },
    ]);
    expect(state.workspaceProps.table).toMatchObject({
      allowCreate: false,
      allowDelete: false,
      allowEdit: false,
      authorizationResource: 'identity.session',
    });
  });

  it('wires versioned session revocation and reloads after logout-all', async () => {
    root = document.createElement('div');
    document.body.append(root);
    app = createApp(SessionsPage);
    app.mount(root);
    await flush();

    const revoke = state.workspaceProps.table.rowActions.find(
      (action) => action.key === 'revoke',
    );
    const session = { id: 'session-1', status: 'active', version: 8 };
    expect(revoke.visible(session)).toBe(true);
    await revoke.run(session);
    expect(state.revoke).toHaveBeenCalledWith(session);

    await state.actionProps.run();
    expect(state.logoutAll).toHaveBeenCalled();
    state.actionProps.onCompleted();
    await flush();
    expect(state.reload).toHaveBeenCalledWith({ resetPage: true });
  });
});
