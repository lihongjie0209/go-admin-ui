import LogicFlow from '@logicflow/core';
import { expect, it, vi } from 'vitest';

import {
  graphToWorkflow,
  newWorkflowDefinition,
  workflowGraphId,
  workflowToGraph,
} from '../../src/components/business/workflow/model';

it('真实 LogicFlow 模型新增/连接/删除后保留业务配置并可序列化', async () => {
  const container = document.createElement('div');
  document.body.append(container);
  let engine;
  try {
    engine = new LogicFlow({
      container,
      width: 900,
      height: 600,
      grid: true,
      history: true,
      idGenerator: workflowGraphId,
    });
    engine.render(workflowToGraph(newWorkflowDefinition()));
    const node = engine.addNode({
      type: 'rect',
      x: 300,
      y: 400,
      text: '复核',
      properties: {
        workflow: {
          type: 'approvalTask',
          approvers: ['initiator'],
          approvalMode: 'all',
          priority: 0,
          dueIn: '2 hours',
        },
      },
    });
    const edge = engine.addEdge({
      type: 'polyline',
      sourceNodeId: 'review',
      targetNodeId: node.id,
    });
    const result = graphToWorkflow(engine.getGraphRawData());
    expect(node.id).toMatch(/^node_/);
    expect(edge.id).toMatch(/^flow_/);
    expect(result.nodes.find((n) => n.id === node.id)).toMatchObject({
      priority: 0,
      dueIn: '2 hours',
      type: 'approvalTask',
    });
    expect(result.flows.find((f) => f.id === edge.id)).toMatchObject({
      source: 'review',
      target: node.id,
    });
    engine.deleteNode(node.id);
    const removed = graphToWorkflow(engine.getGraphRawData());
    expect(removed.nodes.some((n) => n.id === node.id)).toBe(false);
    expect(removed.flows.some((f) => f.id === edge.id)).toBe(false);
  } finally {
    engine?.destroy();
    container.remove();
    vi.restoreAllMocks();
  }
});

it('真实引擎撤销和重做恢复节点及连线业务配置', async () => {
  vi.useFakeTimers();
  const container = document.createElement('div');
  document.body.append(container);
  let engine;
  try {
    engine = new LogicFlow({
      container,
      width: 900,
      height: 600,
      history: true,
    });
    engine.render(workflowToGraph(newWorkflowDefinition()));
    await vi.advanceTimersByTimeAsync(200);
    engine.addNode({
      id: 'extra',
      type: 'rect',
      x: 300,
      y: 400,
      text: '复核',
      properties: {
        workflow: {
          type: 'approvalTask',
          approvers: ['initiator'],
          priority: 0,
        },
      },
    });
    engine.addEdge({
      id: 'extra-flow',
      type: 'polyline',
      sourceNodeId: 'review',
      targetNodeId: 'extra',
      properties: {
        workflow: {
          condition: { variable: 'approved', operator: 'eq', value: true },
        },
      },
    });
    await vi.advanceTimersByTimeAsync(200);
    const added = graphToWorkflow(engine.getGraphRawData());
    engine.undo();
    await vi.advanceTimersByTimeAsync(200);
    expect(
      graphToWorkflow(engine.getGraphRawData()).nodes.some(
        (n) => n.id === 'extra',
      ),
    ).toBe(false);
    engine.redo();
    await vi.advanceTimersByTimeAsync(200);
    const restored = graphToWorkflow(engine.getGraphRawData());
    expect(restored.nodes).toEqual(added.nodes);
    expect(restored.flows).toEqual(added.flows);
  } finally {
    engine?.destroy();
    container.remove();
    vi.clearAllTimers();
    vi.useRealTimers();
  }
});
