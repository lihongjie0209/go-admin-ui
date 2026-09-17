import { createApp, h, nextTick, reactive } from 'vue';

import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import Select from '../../src/components/business/GoDictionarySelectControl.vue';
const state = vi.hoisted(() => ({
  query: vi.fn(),
  all: vi.fn(),
  error: vi.fn(),
  control: null,
}));
vi.mock('#/api/go/dictionary', () => ({
  queryDictionary: state.query,
  queryAllDictionaryOptions: state.all,
}));
vi.mock('ant-design-vue', () => {
  const control = {
    props: ['options', 'treeData', 'loading', 'loadData'],
    emits: ['search', 'change', 'update:value'],
    setup(p, c) {
      state.control = { p, c };
      return () => h('pre', JSON.stringify(p.options ?? p.treeData));
    },
  };
  return {
    Select: control,
    TreeSelect: control,
    message: { error: state.error },
  };
});
let app, props, root;
const result = (items = []) => ({
  items,
  has_more: false,
  dictionary_type: 'enum',
  tree_load_mode: 'full',
});
const deferred = () => {
  let reject, resolve;
  const promise = new Promise((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
};
const flush = async () => {
  for (let i = 0; i < 8; i++) {
    await Promise.resolve();
    await nextTick();
  }
};
async function mount(values = {}) {
  props = reactive({
    dictionaryKey: 'workflow_rule_role',
    params: {},
    ...values,
  });
  root = document.createElement('div');
  document.body.append(root);
  app = createApp({ setup: () => () => h(Select, props) });
  app.mount(root);
  await flush();
}
beforeEach(() => {
  state.query.mockReset();
  state.all.mockReset();
  state.error.mockReset();
  state.query.mockResolvedValue(result());
  state.all.mockResolvedValue(result());
});
afterEach(() => {
  app?.unmount();
  root?.remove();
  app = undefined;
  vi.useRealTimers();
});
it('已有编码不在首屏时使用 values 回显，不按 UUID 猜测', async () => {
  state.all.mockResolvedValueOnce(
    result([{ id: 'id', value: 'engineer', label: '工程师' }]),
  );
  await mount({ value: 'engineer' });
  expect(state.all).toHaveBeenCalledWith(
    expect.objectContaining({
      dictionary_key: 'workflow_rule_role',
      values: ['engineer'],
    }),
  );
  expect(root.textContent).toContain('工程师');
});
it('查询失败受控提示并清除旧结果，不继续发起值回显', async () => {
  await mount();
  props.value = 'code';
  state.query.mockRejectedValueOnce(new Error('查询被拒绝'));
  props.dictionaryKey = 'workflow_rule_position';
  await flush();
  expect(state.error).toHaveBeenCalledWith('查询被拒绝');
  expect(state.control.p.loading).toBe(false);
  expect(root.textContent).toBe('[]');
  expect(state.all).not.toHaveBeenCalled();
});
it('卸载清除搜索定时器，旧失败不弹提示或启动回显', async () => {
  vi.useFakeTimers();
  const old = deferred();
  state.query.mockReturnValueOnce(old.promise);
  await mount({ value: 'code' });
  state.control.c.emit('search', 'name');
  app.unmount();
  app = undefined;
  old.reject(new Error('旧请求'));
  await flush();
  await vi.runAllTimersAsync();
  expect(state.query).toHaveBeenCalledTimes(1);
  expect(state.all).not.toHaveBeenCalled();
  expect(state.error).not.toHaveBeenCalled();
});
it('相同字典切换扩展参数后旧初始化不覆盖或重复回显', async () => {
  const old = deferred();
  state.query.mockReturnValueOnce(old.promise);
  await mount({ value: 'code', params: { scope_id: 'a' } });
  props.params = { scope_id: 'b' };
  state.all.mockResolvedValueOnce(
    result([{ id: 'b', value: 'code', label: 'B' }]),
  );
  await flush();
  old.resolve(result([{ id: 'a', value: 'old', label: 'A' }]));
  await flush();
  expect(state.all).toHaveBeenCalledTimes(1);
  expect(state.all).toHaveBeenCalledWith(
    expect.objectContaining({ params: { scope_id: 'b' } }),
  );
  expect(root.textContent).toContain('B');
  expect(root.textContent).not.toContain('"A"');
});
it('完整树通过 id 而非 value 组装父子关系', async () => {
  const child = {
    id: 'child-id',
    value: 'child-code',
    parent_id: 'root-id',
    label: '子',
  };
  const parent = { id: 'root-id', value: 'root-code', label: '根' };
  state.query.mockResolvedValueOnce({
    ...result([parent, child]),
    dictionary_type: 'tree',
  });
  await mount();
  expect(state.control.p.treeData).toHaveLength(1);
  expect(state.control.p.treeData[0].id).toBe('root-id');
  expect(state.control.p.treeData[0].children[0].value).toBe('child-code');
});
it.each([false, true])(
  '受控选择立即使用 change 新值，multiple=%s',
  async (multiple) => {
    const option = { id: 'id', value: 'new', label: '新值' };
    const selected = vi.fn();
    state.query.mockResolvedValueOnce(result([option]));
    await mount({
      multiple,
      value: multiple ? [] : '',
      onSelect: selected,
      'onUpdate:value': () => {},
    });
    const next = multiple ? ['new'] : 'new';
    state.control.c.emit('update:value', next);
    state.control.c.emit('change', next);
    expect(selected).toHaveBeenLastCalledWith(multiple ? [option] : option);
    state.control.c.emit('change', multiple ? [] : undefined);
    expect(selected).toHaveBeenLastCalledWith(multiple ? [] : undefined);
  },
);
it('枚举搜索替换旧候选，但保留已选择值用于名称回显', async () => {
  vi.useFakeTimers();
  const chosen = { id: 'chosen', value: 'chosen', label: '已选择' };
  state.query.mockResolvedValueOnce(
    result([chosen, { id: 'old', value: 'old', label: '旧候选' }]),
  );
  await mount({ value: 'chosen' });
  state.query.mockResolvedValueOnce(
    result([{ id: 'new', value: 'new', label: '新候选' }]),
  );
  state.control.c.emit('search', '新');
  await vi.advanceTimersByTimeAsync(300);
  await flush();
  expect(state.control.p.options.map((x) => x.id)).toEqual(['chosen', 'new']);
  expect(state.query).toHaveBeenLastCalledWith(
    expect.objectContaining({ search: '新' }),
  );
  state.query.mockResolvedValueOnce(result());
  state.control.c.emit('search', '不存在');
  await vi.advanceTimersByTimeAsync(300);
  await flush();
  expect(state.control.p.options).toEqual([chosen]);
});
it('搜索防抖只查询最后文本，晚到的旧搜索不覆盖新结果', async () => {
  vi.useFakeTimers();
  await mount();
  state.control.c.emit('search', 'a');
  state.control.c.emit('search', 'ab');
  const old = deferred();
  state.query.mockReturnValueOnce(old.promise);
  await vi.advanceTimersByTimeAsync(300);
  expect(state.query).toHaveBeenCalledTimes(2);
  expect(state.query).toHaveBeenLastCalledWith(
    expect.objectContaining({ search: 'ab' }),
  );
  state.query.mockResolvedValueOnce(
    result([{ id: 'new', value: 'new', label: '新' }]),
  );
  state.control.c.emit('search', 'abc');
  await vi.advanceTimersByTimeAsync(300);
  old.resolve(result([{ id: 'old', value: 'old', label: '旧' }]));
  await flush();
  expect(state.control.p.options.map((x) => x.id)).toEqual(['new']);
});
