import type { CapabilityRequest } from '#/api/go';

export const applicationListCapability = {
  action: 'list',
  key: 'application.current:list',
  resource: 'application.current',
} satisfies CapabilityRequest;

export const applicationReadCapability = {
  action: 'read',
  key: 'application.current:read',
  resource: 'application.current',
} satisfies CapabilityRequest;

export const applicationSwitchCapability = {
  action: 'switch',
  key: 'application.current:switch',
  resource: 'application.current',
} satisfies CapabilityRequest;

export const currentNavigationReadCapability = {
  action: 'read',
  key: 'navigation.current:read',
  resource: 'navigation.current',
} satisfies CapabilityRequest;

export const applicationSelectionCapabilities = [
  applicationListCapability,
  applicationReadCapability,
  applicationSwitchCapability,
  currentNavigationReadCapability,
] satisfies CapabilityRequest[];
