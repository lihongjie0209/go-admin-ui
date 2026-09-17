import { requestClient } from '#/api/request';

export interface FileDownload {
  expires_at: string;
  file: Record<string, unknown>;
  url: string;
}

export async function uploadFile(file: File) {
  const body = new FormData();
  body.append('file', file, file.name);
  return await requestClient.post<Record<string, unknown>>(
    '/files/upload',
    body,
  );
}

export async function requestFileDownload(id: string): Promise<FileDownload> {
  return await requestClient.post<FileDownload>('/files/download', { id });
}

export function openFileDownload(download: FileDownload) {
  const anchor = document.createElement('a');
  anchor.href = download.url;
  anchor.rel = 'noopener noreferrer';
  anchor.download = String(download.file.original_name ?? '');
  anchor.style.display = 'none';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
}
