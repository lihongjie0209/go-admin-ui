import { expect, it, vi } from 'vitest';

import { getMyMenuUsage } from './menu';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('#/api/request', () => ({ requestClient: { post } }));

it('loads current-principal menu usage from the backend', async () => {
  const usage = [
    {
      application_id: 'app-1',
      click_count: 2,
      last_clicked_at: '2026-09-18T09:00:00+08:00',
      menu_id: 'menu-1',
    },
  ];
  post.mockResolvedValueOnce(usage);
  await expect(getMyMenuUsage()).resolves.toEqual(usage);
  expect(post).toHaveBeenCalledWith('/me/navigation-usage', {});
});
