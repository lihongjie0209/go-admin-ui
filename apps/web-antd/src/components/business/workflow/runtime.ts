import type { WorkflowDefinition } from './model';
export type WorkflowRuntimeState =
  | 'active'
  | 'failed'
  | 'unvisited'
  | 'visited'
  | 'waiting';
export interface WorkflowRuntimeNode {
  id: string;
  state: WorkflowRuntimeState;
  active_count: number;
  waiting_count: number;
}
export interface WorkflowRuntimeSnapshot {
  definition: WorkflowDefinition;
  instance: { id: string; status: string; version: number };
  nodes: WorkflowRuntimeNode[];
}
export const workflowRuntimeStyles = {
  unvisited: {
    label: '未到达',
    fill: '#fff',
    stroke: '#bfbfbf',
    strokeWidth: 1,
    strokeDasharray: '',
  },
  visited: {
    label: '已到达',
    fill: '#e6f4ff',
    stroke: '#1677ff',
    strokeWidth: 2,
    strokeDasharray: '',
  },
  waiting: {
    label: '当前等待',
    fill: '#fff7e6',
    stroke: '#d48806',
    strokeWidth: 3,
    strokeDasharray: '6 3',
  },
  active: {
    label: '当前执行',
    fill: '#f6ffed',
    stroke: '#389e0d',
    strokeWidth: 3,
    strokeDasharray: '',
  },
  failed: {
    label: '执行失败',
    fill: '#fff1f0',
    stroke: '#cf1322',
    strokeWidth: 3,
    strokeDasharray: '3 3',
  },
} as const;
