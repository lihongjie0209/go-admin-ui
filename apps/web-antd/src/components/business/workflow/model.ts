/** Workflow documents are JSON; copying also unwraps Vue/MobX proxies. */
function copy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export const workflowDocumentMaxBytes = 1024 * 1024;
export function workflowGraphId(type?: string) {
  return `${type === 'polyline' ? 'flow' : 'node'}_${crypto.randomUUID()}`;
}
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/** Import drafts, including unfinished graphs; publishing remains a server decision. */
export function parseWorkflowDocument(text: string): WorkflowDefinition {
  if (new TextEncoder().encode(text).length > workflowDocumentMaxBytes)
    throw new Error('流程文件不能超过 1MB');
  let value: unknown;
  try {
    value = JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch {
    throw new Error('请选择有效的流程 JSON 文件');
  }
  if (
    !record(value) ||
    value.schema_version !== 1 ||
    !Array.isArray(value.nodes) ||
    !Array.isArray(value.flows)
  )
    throw new Error('流程文件必须包含版本 1、节点和连线数组');
  if (value.nodes.length > 500 || value.flows.length > 2000)
    throw new Error('流程最多包含 500 个节点和 2000 条连线');
  const ids = new Set<string>();
  for (const node of value.nodes) {
    if (
      !record(node) ||
      typeof node.id !== 'string' ||
      !/^[A-Za-z][A-Za-z0-9_.-]{0,99}$/.test(node.id) ||
      typeof node.type !== 'string' ||
      !Object.hasOwn(workflowNodeTypes, node.type)
    )
      throw new Error('流程包含无效的节点标识或类型');
    if (ids.has(node.id)) throw new Error('节点标识不能重复');
    ids.add(node.id);
    if (node.name !== undefined && typeof node.name !== 'string')
      throw new Error('节点名称必须是文本');
    if (
      node.ui !== undefined &&
      (!record(node.ui) ||
        typeof node.ui.x !== 'number' ||
        !Number.isFinite(node.ui.x) ||
        typeof node.ui.y !== 'number' ||
        !Number.isFinite(node.ui.y))
    )
      throw new Error('节点坐标必须是有效数字');
  }
  const flows = new Set<string>();
  for (const flow of value.flows) {
    if (
      !record(flow) ||
      typeof flow.id !== 'string' ||
      !/^[A-Za-z][A-Za-z0-9_.-]{0,99}$/.test(flow.id) ||
      typeof flow.source !== 'string' ||
      typeof flow.target !== 'string' ||
      !ids.has(flow.source) ||
      !ids.has(flow.target)
    )
      throw new Error('连线标识或引用的节点不正确');
    if (flows.has(flow.id)) throw new Error('连线标识不能重复');
    flows.add(flow.id);
    if (flow.name !== undefined && typeof flow.name !== 'string')
      throw new Error('连线名称必须是文本');
  }
  return value as unknown as WorkflowDefinition;
}

export function serializeWorkflowDocument(value: WorkflowDefinition): string {
  const text = JSON.stringify(value, null, 2);
  parseWorkflowDocument(text);
  return text;
}

export const workflowNodeTypes = {
  startEvent: { label: '开始', shape: 'circle' },
  userTask: { label: '人工任务', shape: 'rect' },
  approvalTask: { label: '审批', shape: 'rect' },
  exclusiveGateway: { label: '条件分支', shape: 'diamond' },
  parallelGateway: { label: '并行网关', shape: 'diamond' },
  receiveTask: { label: '接收任务', shape: 'rect' },
  intermediateCatchEvent: { label: '等待事件', shape: 'circle' },
  endEvent: { label: '结束', shape: 'circle' },
} as const;
export type WorkflowNodeType = keyof typeof workflowNodeTypes;
export interface WorkflowNode {
  [key: string]: unknown;
  id: string;
  type: WorkflowNodeType;
  name?: string;
  ui?: { x: number; y: number };
}
export interface WorkflowFlow {
  [key: string]: unknown;
  id: string;
  source: string;
  target: string;
}
export interface WorkflowDefinition {
  [key: string]: unknown;
  schema_version: 1;
  nodes: WorkflowNode[];
  flows: WorkflowFlow[];
}
interface GraphElement {
  id: string;
  type: string;
  text?: string | { value: string; x: number; y: number };
  properties?: Record<string, unknown>;
}
export interface WorkflowGraph {
  nodes: Array<GraphElement & { x: number; y: number }>;
  edges: Array<
    GraphElement & {
      sourceNodeId: string;
      targetNodeId: string;
      pointsList?: Array<{ x: number; y: number }>;
    }
  >;
}
const textValue = (text: GraphElement['text']) =>
  typeof text === 'string' ? text : text?.value;

export function workflowToGraph(definition: WorkflowDefinition): WorkflowGraph {
  if (definition.schema_version !== 1) throw new Error('不支持的流程版本');
  return {
    nodes: definition.nodes.map((node, i) => {
      const config = workflowNodeTypes[node.type];
      if (!config) throw new Error(`不支持的节点类型：${node.type}`);
      return {
        id: node.id,
        type: config.shape,
        x: node.ui?.x ?? 160 + (i % 4) * 200,
        y: node.ui?.y ?? 120 + Math.floor(i / 4) * 160,
        text: node.name ?? config.label,
        properties: { workflow: copy(node) },
      };
    }),
    edges: definition.flows.map((flow) => ({
      id: flow.id,
      type: 'polyline',
      sourceNodeId: flow.source,
      targetNodeId: flow.target,
      text: typeof flow.name === 'string' ? flow.name : '',
      properties: { workflow: copy(flow) },
    })),
  };
}

export function graphToWorkflow(
  graph: WorkflowGraph,
  original?: WorkflowDefinition,
): WorkflowDefinition {
  return {
    ...copy(original ?? {}),
    schema_version: 1,
    nodes: graph.nodes.map((node) => {
      const stored = node.properties?.workflow as undefined | WorkflowNode;
      if (!stored || !workflowNodeTypes[stored.type])
        throw new Error(`节点缺少流程业务类型：${node.id}`);
      return {
        ...copy(stored),
        id: node.id,
        name: textValue(node.text) ?? stored.name,
        ui: { x: node.x, y: node.y },
      };
    }),
    flows: graph.edges.map((edge) => ({
      ...copy((edge.properties?.workflow ?? {}) as WorkflowFlow),
      id: edge.id,
      source: edge.sourceNodeId,
      target: edge.targetNodeId,
      name: textValue(edge.text) ?? '',
    })),
  };
}

export function validateWorkflow(definition: WorkflowDefinition): string[] {
  const errors: string[] = [];
  const ids = new Set(definition.nodes.map((node) => node.id));
  const flowIds = new Set(definition.flows.map((flow) => flow.id));
  if (definition.nodes.length < 2) errors.push('流程至少需要两个节点');
  if (
    definition.nodes.length > 500 ||
    definition.flows.length > 2000 ||
    new TextEncoder().encode(JSON.stringify(definition)).length >
      workflowDocumentMaxBytes
  )
    errors.push('流程定义超过大小限制');
  if (ids.size !== definition.nodes.length) errors.push('节点标识不能重复');
  if (flowIds.size !== definition.flows.length) errors.push('连线标识不能重复');
  if (
    definition.nodes.filter((node) => node.type === 'startEvent').length !== 1
  )
    errors.push('流程必须有且只有一个开始节点');
  if (!definition.nodes.some((node) => node.type === 'endEvent'))
    errors.push('流程必须包含结束节点');
  for (const flow of definition.flows) {
    if (!/^[A-Za-z][A-Za-z0-9_.-]{0,99}$/.test(flow.id))
      errors.push(`连线标识格式不正确：${flow.id}`);
    if (flow.condition !== undefined) {
      const condition = flow.condition;
      if (
        !record(condition) ||
        typeof condition.variable !== 'string' ||
        !condition.variable.trim() ||
        (condition.operator !== undefined &&
          !['eq', 'exists', 'ne'].includes(String(condition.operator)))
      )
        errors.push(`连线条件必须指定变量和有效比较方式：${flow.id}`);
    }
    if (!ids.has(flow.source) || !ids.has(flow.target))
      errors.push(`连线引用不存在的节点：${flow.id}`);
  }
  for (const node of definition.nodes) {
    if (!/^[A-Za-z][A-Za-z0-9_.-]{0,99}$/.test(node.id))
      errors.push(`节点标识格式不正确：${node.id}`);
    if (!Object.hasOwn(workflowNodeTypes, node.type))
      errors.push(`不支持的节点类型：${String(node.type)}`);
    const incoming = definition.flows.filter((flow) => flow.target === node.id);
    const outgoing = definition.flows.filter((flow) => flow.source === node.id);
    if (node.type === 'startEvent' && incoming.length > 0)
      errors.push('开始节点不能有入线');
    if (node.type === 'endEvent' && outgoing.length > 0)
      errors.push('结束节点不能有出线');
    if (
      !['endEvent', 'exclusiveGateway', 'parallelGateway'].includes(
        node.type,
      ) &&
      outgoing.length !== 1
    )
      errors.push(`${node.name ?? node.id} 必须有且只有一条出线`);
    if (
      ['exclusiveGateway', 'parallelGateway'].includes(node.type) &&
      outgoing.length === 0
    )
      errors.push(`${node.name ?? node.id} 必须至少有一条出线`);
    if (
      node.type === 'exclusiveGateway' &&
      outgoing.filter((flow) => flow.default === true).length > 1
    )
      errors.push(`${node.name ?? node.id} 最多只能有一条默认出线`);
    if (node.type === 'approvalTask') {
      if (
        !Array.isArray(node.approvers) ||
        node.approvers.length === 0 ||
        node.approvers.length > 100
      )
        errors.push(`${node.name ?? node.id} 必须配置 1-100 条审批人规则`);
      if (
        node.approvalMode !== undefined &&
        !['all', 'any', 'percentage', 'sequential'].includes(
          String(node.approvalMode),
        )
      )
        errors.push(`${node.name ?? node.id} 的审批方式不受支持`);
      if (
        node.rejectMode !== undefined &&
        !['all', 'any'].includes(String(node.rejectMode))
      )
        errors.push(`${node.name ?? node.id} 的驳回方式不受支持`);
      if (
        node.approvalMode === 'percentage' &&
        !(
          typeof node.requiredPercentage === 'number' &&
          node.requiredPercentage > 0 &&
          node.requiredPercentage <= 100
        )
      )
        errors.push(
          `${node.name ?? node.id} 的审批通过比例必须大于 0 且不超过 100`,
        );
    }
    if (node.type === 'intermediateCatchEvent') {
      const event = node.eventDefinition;
      if (
        !record(event) ||
        !['message', 'signal', 'timer'].includes(String(event.type))
      )
        errors.push(`${node.name ?? node.id} 必须配置消息、信号或定时器事件`);
      else if (
        ['message', 'signal'].includes(String(event.type)) &&
        (typeof event.name !== 'string' || !event.name.trim())
      )
        errors.push(`${node.name ?? node.id} 必须填写事件名称`);
      else if (
        event.type === 'timer' &&
        (typeof event.duration !== 'string' || !event.duration.trim())
      )
        errors.push(`${node.name ?? node.id} 必须填写等待时长`);
    }
    if (node.priority !== undefined || node.dueIn !== undefined) {
      if (!['approvalTask', 'userTask'].includes(node.type))
        errors.push(
          `${node.name ?? node.id} 不是人工任务，不能配置优先级或到期时长`,
        );
      if (
        node.priority !== undefined &&
        !(
          typeof node.priority === 'number' &&
          Number.isInteger(node.priority) &&
          node.priority >= 0 &&
          node.priority <= 100
        )
      )
        errors.push(`${node.name ?? node.id} 的任务优先级必须为 0-100 的整数`);
      if (
        node.dueIn !== undefined &&
        (typeof node.dueIn !== 'string' || !node.dueIn.trim())
      )
        errors.push(`${node.name ?? node.id} 的任务到期时长必须为非空字符串`);
    }
  }
  const reachable = new Set(
    definition.nodes
      .filter((node) => node.type === 'startEvent')
      .map((node) => node.id),
  );
  for (let changed = true; changed;) {
    changed = false;
    for (const flow of definition.flows)
      if (reachable.has(flow.source) && !reachable.has(flow.target)) {
        reachable.add(flow.target);
        changed = true;
      }
  }
  if (definition.nodes.some((node) => !reachable.has(node.id)))
    errors.push('存在开始节点无法到达的节点');
  return [...new Set(errors)];
}

export function newWorkflowDefinition(): WorkflowDefinition {
  return {
    schema_version: 1,
    nodes: [
      { id: 'start', type: 'startEvent', name: '开始' },
      {
        id: 'review',
        type: 'approvalTask',
        name: '审批',
        approvers: ['initiator'],
        approvalMode: 'all',
      },
      { id: 'end', type: 'endEvent', name: '结束' },
    ],
    flows: [
      { id: 'to_review', source: 'start', target: 'review' },
      { id: 'to_end', source: 'review', target: 'end' },
    ],
  };
}
