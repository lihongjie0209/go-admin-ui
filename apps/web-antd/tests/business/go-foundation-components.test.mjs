import { createApp, defineComponent, h, nextTick } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import DictionarySelect from '../../src/components/foundation/GoDictionarySelect.vue';
import DictionaryTreeSelect from '../../src/components/foundation/GoDictionaryTreeSelect.vue';

const dictionaryControl = vi.hoisted(() => ({ props: null }));

vi.mock('../../src/components/business/GoDictionarySelectControl.vue', () => ({
  default: defineComponent({
    props: [
      'dictionaryKey',
      'disabled',
      'expectedType',
      'multiple',
      'params',
      'placeholder',
      'value',
    ],
    emits: ['update:value'],
    setup(props, { emit }) {
      dictionaryControl.props = props;
      return () =>
        h(
          'button',
          {
            'data-dictionary-control': props.expectedType,
            disabled: props.disabled,
            onClick: () =>
              emit('update:value', props.multiple ? ['selected'] : 'selected'),
          },
          props.dictionaryKey,
        );
    },
  }),
}));

let app;
let root;

async function mount(component, props) {
  root = document.createElement('div');
  document.body.append(root);
  const updates = vi.fn();
  app = createApp({
    setup: () => () => h(component, { ...props, 'onUpdate:value': updates }),
  });
  app.mount(root);
  await nextTick();
  return updates;
}

afterEach(() => {
  app?.unmount();
  root?.remove();
  app = undefined;
  root = undefined;
});

describe('go dictionary foundation controls', () => {
  it('pins a dropdown to an enum dictionary and forwards the selected value', async () => {
    const updates = await mount(DictionarySelect, {
      dictionaryKey: 'identity.user-status',
      placeholder: '选择状态',
    });

    expect(dictionaryControl.props.expectedType).toBe('enum');
    expect(dictionaryControl.props.dictionaryKey).toBe('identity.user-status');
    root.querySelector('button').click();
    await nextTick();
    expect(updates).toHaveBeenCalledExactlyOnceWith('selected');
  });

  it('pins a tree dropdown to a tree dictionary and preserves multiple selection', async () => {
    const updates = await mount(DictionaryTreeSelect, {
      dictionaryKey: 'tenant.department',
      multiple: true,
    });

    expect(dictionaryControl.props.expectedType).toBe('tree');
    expect(dictionaryControl.props.multiple).toBe(true);
    root.querySelector('button').click();
    await nextTick();
    expect(updates).toHaveBeenCalledExactlyOnceWith(['selected']);
  });
});
