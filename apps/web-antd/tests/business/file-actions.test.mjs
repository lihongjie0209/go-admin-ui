import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('#/api/request', () => ({ requestClient: api }));

const { openFileDownload, requestFileDownload, uploadFile } =
  await import('../../src/modules/files/file-actions.ts');
const { formatBytes } =
  await import('../../src/modules/files/resource-contracts.ts');

beforeEach(() => {
  api.post.mockReset();
});

describe('file management actions', () => {
  it('uploads a browser File as multipart form data', async () => {
    const record = { id: 'file-1', original_name: 'report.txt', version: 1 };
    api.post.mockResolvedValue(record);
    const file = new File(['hello'], 'report.txt', { type: 'text/plain' });

    await expect(uploadFile(file)).resolves.toEqual(record);
    expect(api.post).toHaveBeenCalledTimes(1);
    const [path, body, options] = api.post.mock.calls[0];
    expect(path).toBe('/files/upload');
    expect(body).toBeInstanceOf(FormData);
    const uploaded = body.get('file');
    expect(uploaded).toBeInstanceOf(File);
    expect(uploaded.name).toBe('report.txt');
    await expect(uploaded.text()).resolves.toBe('hello');
    expect(options).toEqual({ signal: undefined });
  });

  it('passes upload cancellation through to the request client', async () => {
    const controller = new AbortController();
    const file = new File(['hello'], 'report.txt', { type: 'text/plain' });
    api.post.mockResolvedValueOnce({ id: 'file-1' });

    await uploadFile(file, controller.signal);

    expect(api.post.mock.calls[0][2]).toEqual({ signal: controller.signal });
  });

  it('requests a short-lived download without persisting the signed URL', async () => {
    const download = {
      expires_at: '2026-09-18T01:00:00+08:00',
      file: { original_name: 'report.txt' },
      url: 'https://storage.example/signed',
    };
    api.post.mockResolvedValue(download);

    await expect(requestFileDownload('file-1')).resolves.toEqual(download);
    expect(api.post).toHaveBeenCalledWith('/files/download', { id: 'file-1' });
  });

  it('opens a no-opener browser download and removes the transient link', () => {
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    openFileDownload({
      expires_at: '2026-09-18T01:00:00+08:00',
      file: { original_name: 'report.txt' },
      url: 'https://storage.example/signed',
    });

    expect(click).toHaveBeenCalledTimes(1);
    expect(document.querySelector('a[href*="storage.example"]')).toBeNull();
    click.mockRestore();
  });

  it.each([
    'javascript:alert(document.cookie)',
    'data:text/html,<script>alert(1)</script>',
    'https://user:password@storage.example/signed',
  ])(
    'rejects an unsafe signed download URL without browser navigation: %s',
    (url) => {
      const click = vi
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(() => {});

      expect(() =>
        openFileDownload({
          expires_at: '2026-09-18T01:00:00+08:00',
          file: { original_name: 'report.txt' },
          url,
        }),
      ).toThrow('文件下载地址不安全');
      expect(click).not.toHaveBeenCalled();
      expect(document.querySelector('a')).toBeNull();
      click.mockRestore();
    },
  );

  it('removes path and control characters from the suggested filename', () => {
    let filename = '';
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function () {
        filename = this.download;
      });

    openFileDownload({
      expires_at: '2026-09-18T01:00:00+08:00',
      file: { original_name: '../exports/report\u0000.csv' },
      url: '/api/v1/files/content/token',
    });

    expect(filename).toBe('report.csv');
    click.mockRestore();
  });

  it('formats file sizes for table and detail presentation', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toBe('1.50 KB');
    expect(formatBytes(10 * 1024 * 1024)).toBe('10.0 MB');
    expect(formatBytes('invalid')).toBe('—');
  });
});
