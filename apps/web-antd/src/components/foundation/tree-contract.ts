export interface TreeRecord {
  children?: TreeRecord[];
  id: string;
  name?: string;
  parent_id?: null | string;
  sort_order?: number;
  version?: number;
  [key: string]: unknown;
}

export interface NormalizedTreeRecord extends TreeRecord {
  children: NormalizedTreeRecord[];
  key: string;
}

function compare(left: TreeRecord, right: TreeRecord) {
  return (
    (left.sort_order ?? 0) - (right.sort_order ?? 0) ||
    left.id.localeCompare(right.id)
  );
}

export function normalizeTree(nodes: TreeRecord[]): NormalizedTreeRecord[] {
  const seen = new Set<string>();
  const visit = (
    node: TreeRecord,
    parentID: null | string,
    ancestors: Set<string>,
  ): NormalizedTreeRecord => {
    if (!node.id || seen.has(node.id) || ancestors.has(node.id))
      throw new Error('树数据包含重复节点或循环引用');
    if (parentID === null && node.parent_id)
      throw new Error('树根节点不能声明 parent_id');
    if (parentID && node.parent_id && node.parent_id !== parentID)
      throw new Error('树节点 parent_id 与层级不一致');
    seen.add(node.id);
    const nextAncestors = new Set(ancestors).add(node.id);
    return {
      ...node,
      children: (node.children ?? [])
        .toSorted(compare)
        .map((child) => visit(child, node.id, nextAncestors)),
      parent_id: parentID,
      key: node.id,
    };
  };
  return nodes.toSorted(compare).map((node) => visit(node, null, new Set()));
}

export function flattenTree(
  nodes: NormalizedTreeRecord[],
): NormalizedTreeRecord[] {
  return nodes.flatMap((node) => [node, ...flattenTree(node.children)]);
}

export function filterTreeWithAncestors(
  nodes: NormalizedTreeRecord[],
  predicate: (node: NormalizedTreeRecord) => boolean,
): NormalizedTreeRecord[] {
  return nodes.flatMap((node) => {
    if (predicate(node)) return [node];
    const children = filterTreeWithAncestors(node.children, predicate);
    return children.length > 0 ? [{ ...node, children }] : [];
  });
}

export function canMoveTreeNode(
  nodes: NormalizedTreeRecord[],
  nodeID: string,
  parentID: null | string,
) {
  if (parentID === null)
    return flattenTree(nodes).some((node) => node.id === nodeID);
  if (nodeID === parentID) return false;
  const node = flattenTree(nodes).find((item) => item.id === nodeID);
  const parent = flattenTree(nodes).find((item) => item.id === parentID);
  if (!node || !parent) return false;
  return !flattenTree(node.children).some((item) => item.id === parentID);
}
