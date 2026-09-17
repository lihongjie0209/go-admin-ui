import { describe, expect, it } from 'vitest';

import {
  canMoveTreeNode,
  filterTreeWithAncestors,
  flattenTree,
  normalizeTree,
} from '../../src/components/foundation/tree-contract';

describe('tree resource contract', () => {
  const tree = normalizeTree([
    {
      children: [
        {
          children: [],
          id: 'child-b',
          name: 'Beta',
          parent_id: 'root',
          sort_order: 2,
        },
        {
          children: [
            { children: [], id: 'leaf', name: 'Target', parent_id: 'child-a' },
          ],
          id: 'child-a',
          name: 'Alpha',
          parent_id: 'root',
          sort_order: 1,
        },
      ],
      id: 'root',
      name: 'Root',
    },
  ]);

  it('normalizes stable order, parent IDs, keys, and non-null children', () => {
    expect(flattenTree(tree).map((node) => node.id)).toEqual([
      'root',
      'child-a',
      'leaf',
      'child-b',
    ]);
    expect(tree[0].parent_id).toBeNull();
    expect(tree[0].children[0]).toMatchObject({
      id: 'child-a',
      key: 'child-a',
      parent_id: 'root',
    });
    expect(tree[0].children[1].children).toEqual([]);
  });

  it('retains ancestors for a matching descendant and omits unrelated branches', () => {
    const filtered = filterTreeWithAncestors(
      tree,
      (node) => node.name === 'Target',
    );
    expect(flattenTree(filtered).map((node) => node.id)).toEqual([
      'root',
      'child-a',
      'leaf',
    ]);
  });

  it('rejects self, descendant, and missing-parent moves while allowing roots and siblings', () => {
    expect(canMoveTreeNode(tree, 'child-a', 'child-a')).toBe(false);
    expect(canMoveTreeNode(tree, 'child-a', 'leaf')).toBe(false);
    expect(canMoveTreeNode(tree, 'child-a', 'missing')).toBe(false);
    expect(canMoveTreeNode(tree, 'child-a', 'child-b')).toBe(true);
    expect(canMoveTreeNode(tree, 'child-a', null)).toBe(true);
  });

  it('rejects duplicate IDs and inconsistent parent declarations', () => {
    expect(() => normalizeTree([{ id: 'same' }, { id: 'same' }])).toThrow(
      '重复节点或循环引用',
    );
    expect(() =>
      normalizeTree([
        { children: [{ id: 'child', parent_id: 'other' }], id: 'root' },
      ]),
    ).toThrow('parent_id 与层级不一致');
    expect(() => normalizeTree([{ id: 'root', parent_id: 'missing' }])).toThrow(
      '树根节点不能声明 parent_id',
    );
  });
});
