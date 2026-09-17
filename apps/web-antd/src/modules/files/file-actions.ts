import { requestClient } from '#/api/request';

export interface FileDownload {
  expires_at: string;
  file: Record<string, unknown>;
  url: string;
}

export async function uploadFile(file: File, signal?: AbortSignal) {
  const body = new FormData();
  body.append('file', file, file.name);
  return await requestClient.post<Record<string, unknown>>(
    '/files/upload',
    body,
    { signal },
  );
}

export async function requestFileDownload(id: string): Promise<FileDownload> {
  return await requestClient.post<FileDownload>('/files/download', { id });
}

export function openFileDownload(download: FileDownload) {
  let url: URL;
  try {
    url = new URL(String(download.url ?? ''), window.location.origin);
  } catch {
    throw new Error('服务器返回的文件下载地址无效');
  }
  if (
    (url.protocol !== 'http:' && url.protocol !== 'https:') ||
    url.username ||
    url.password
  ) {
    throw new Error('服务器返回的文件下载地址不安全');
  }
  const suggestedName = String(download.file?.original_name ?? 'download')
    .split(/[\\/]/u)
    .at(-1);
  const originalName = [...(suggestedName ?? '')]
    .filter((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint >= 32 && codePoint !== 127;
    })
    .join('')
    .trim();
  const anchor = document.createElement('a');
  anchor.href = url.href;
  anchor.rel = 'noopener noreferrer';
  anchor.download = originalName || 'download';
  anchor.style.display = 'none';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
}
