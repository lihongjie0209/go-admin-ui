import type { Page, Route } from 'playwright/test';

import { expect, test } from 'playwright/test';

interface UserRecord {
  created_at: string;
  created_by: string;
  created_by_name: string;
  display_name: string;
  email: string;
  id: string;
  phone: string;
  status: string;
  updated_at: string;
  updated_by: string;
  updated_by_name: string;
  username: string;
  version: number;
}

const timestamp = '2026-09-18T08:00:00+08:00';

function envelope(body: unknown) {
  return { body, code: 0, message: 'ok', request_id: 'e2e-request' };
}

async function body(route: Route) {
  return (await route.request().postDataJSON()) as Record<string, unknown>;
}

async function installPlatformAPI(page: Page) {
  let currentApplicationID = '';
  const pageRequests: Record<string, unknown>[] = [];
  const createRequests: Record<string, unknown>[] = [];
  const users: UserRecord[] = [
    {
      created_at: timestamp,
      created_by: 'admin-id',
      created_by_name: '平台管理员',
      display_name: '平台管理员',
      email: 'admin@example.com',
      id: 'admin-id',
      phone: '13800000000',
      status: 'active',
      updated_at: timestamp,
      updated_by: 'admin-id',
      updated_by_name: '平台管理员',
      username: 'admin',
      version: 1,
    },
  ];

  await page.route('http://127.0.0.1:8080/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    const respond = (responseBody: unknown) =>
      route.fulfill({
        contentType: 'application/json',
        json: envelope(responseBody),
      });

    switch (path) {
      case '/auth/user/login': {
        return respond({
          access_token: 'login-access-token',
          expires_in: 900,
          must_change_password: false,
          refresh_token: 'refresh-token',
          session_id: 'session-id',
          token_type: 'Bearer',
        });
      }
      case '/tenant-context/available': {
        return respond([
          {
            is_administrator: true,
            joined_at: timestamp,
            membership_id: 'membership-id',
            tenant_code: 'platform',
            tenant_id: 'tenant-id',
            tenant_name: '平台租户',
          },
        ]);
      }
      case '/tenant-context/switch': {
        return respond({
          access_token: 'tenant-access-token',
          expires_in: 900,
          tenant: {
            is_administrator: true,
            joined_at: timestamp,
            membership_id: 'membership-id',
            tenant_code: 'platform',
            tenant_id: 'tenant-id',
            tenant_name: '平台租户',
          },
          token_type: 'Bearer',
        });
      }
      case '/profile/get': {
        return respond({
          display_name: '平台管理员',
          email: 'admin@example.com',
          id: 'admin-id',
          phone: '13800000000',
          status: 'active',
          username: 'admin',
          version: 1,
        });
      }
      case '/me/applications': {
        return respond([
          {
            code: 'platform',
            home_path: '/app/platform/users',
            icon: 'lucide:blocks',
            id: 'application-id',
            name: '平台控制台',
            sort_order: 10,
          },
        ]);
      }
      case '/me/navigation-usage': {
        return respond([]);
      }
      case '/me/application/current': {
        return respond({ application_id: currentApplicationID, version: 0 });
      }
      case '/me/application/switch': {
        currentApplicationID = 'application-id';
        return respond({ application_id: currentApplicationID, version: 1 });
      }
      case '/me/navigations': {
        return respond([
          {
            action: 'list',
            application_id: 'application-id',
            children: [],
            component: 'platform/users/index',
            icon: 'lucide:users',
            id: 'users-menu-id',
            metadata: {},
            name: '用户管理',
            navigation_key: 'users',
            navigation_type: 'menu',
            parent_id: null,
            resource: 'identity.user',
            route_path: '/users',
            sort_order: 10,
          },
        ]);
      }
      case '/authorization/capabilities/evaluate': {
        const request = await body(route);
        const items = request.items as Array<{ key: string }>;
        return respond({
          expires_at: '2026-09-18T08:01:00+08:00',
          items: items.map((item) => ({ allowed: true, key: item.key })),
          revision: 'e2e-revision',
        });
      }
      case '/users/page': {
        pageRequests.push(await body(route));
        return respond({
          items: users,
          page: 1,
          page_size: 20,
          total: users.length,
        });
      }
      case '/users/create': {
        const request = await body(route);
        createRequests.push(request);
        const created: UserRecord = {
          created_at: timestamp,
          created_by: 'admin-id',
          created_by_name: '平台管理员',
          display_name: String(request.display_name),
          email: String(request.email ?? ''),
          id: 'alice-id',
          phone: String(request.phone ?? ''),
          status: 'active',
          updated_at: timestamp,
          updated_by: 'admin-id',
          updated_by_name: '平台管理员',
          username: String(request.username),
          version: 1,
        };
        users.push(created);
        return respond(created);
      }
      case '/operation-logs/frontend/record': {
        return respond({ accepted: true });
      }
      default: {
        return route.fulfill({
          contentType: 'application/json',
          json: {
            body: null,
            code: 50_000,
            message: `unhandled E2E endpoint: ${path}`,
            request_id: 'e2e-unhandled',
          },
          status: 500,
        });
      }
    }
  });

  return { createRequests, pageRequests };
}

test('login, select application, authorize and create a platform user', async ({
  page,
}) => {
  const requests = await installPlatformAPI(page);

  await page.goto('/auth/login');
  await page.getByLabel('用户名').fill('admin');
  await page.getByLabel('密码').fill('Admin-password-123!');
  await page.getByRole('button', { name: '登录' }).click();

  await expect(page).toHaveURL(/\/apps$/u);
  await page.getByText('平台控制台', { exact: true }).click();

  await expect(page).toHaveURL(/\/app\/platform\/users$/u);
  await expect(page.getByRole('heading', { name: '用户管理' })).toBeVisible();
  await expect(
    page.getByText('平台管理员', { exact: true }).first(),
  ).toBeVisible();

  await page.getByRole('button', { name: '新增' }).click();
  await page.getByLabel('用户名').fill('alice');
  await page.getByLabel('显示名称').fill('Alice');
  await page.getByLabel('邮箱').fill('alice@example.com');
  await page.getByLabel('手机号').fill('13900000000');
  await page.getByRole('button', { name: '保存' }).click();

  await expect(page.getByText('新增成功')).toBeVisible();
  await expect(page.getByText('alice', { exact: true })).toBeVisible();
  expect(requests.createRequests).toEqual([
    {
      display_name: 'Alice',
      email: 'alice@example.com',
      phone: '13900000000',
      username: 'alice',
    },
  ]);
  expect(requests.pageRequests.at(-1)).toMatchObject({
    keyword: '',
    page: 1,
    page_size: 20,
    sort: [{ direction: 'desc', field: 'created_at' }],
  });
});
