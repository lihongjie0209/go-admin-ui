import type { Component } from 'vue';

const components = new Map<string, Component>();

export function registerLowCodeComponent(name: string, component: Component) {
  if (!/^[a-z][a-z0-9_-]*$/.test(name))
    throw new Error('低代码组件标识格式不正确');
  components.set(name, component);
}

export function resolveLowCodeComponent(name: string) {
  return components.get(name);
}

export function unregisterLowCodeComponent(name: string) {
  components.delete(name);
}
