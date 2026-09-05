export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const init: RequestInit = {
    method,
    credentials: 'include',
    headers: {},
  };
  if (body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(body);
  }
  const res = await fetch(`/admin/api${path}`, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, (data as any).error || `请求失败 (${res.status})`);
  }
  return data as T;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export interface User {
  id: string;
  username: string;
  displayName: string | null;
  email: string;
  role: string;
}

export interface StorageConfig {
  provider: 'local' | 'r2' | 's3' | 'github';
  r2: {
    region: string;
    endpoint: string;
    publicUrl: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
  s3: {
    region: string;
    endpoint: string;
    publicUrl: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
  github: {
    repo: string;
    path: string;
    branch?: string;
    token: string;
    publicUrl: string;
  };
}

export interface ResourceItem {
  key: string;
  name: string;
  url: string;
  size: number;
  uploaded?: string;
  type: 'image' | 'video' | 'other';
  provider: 'local' | 'r2' | 's3' | 'github';
}

export interface ResourceListResult {
  data: ResourceItem[];
  listable: boolean;
  message?: string;
}

export const api = {
// auth
login: (usernameOrEmail: string, password: string) =>
  request<ApiEnvelope<User>>('POST', '/auth/login', { usernameOrEmail, password }),
me: () => request<ApiEnvelope<User>>('GET', '/auth/me'),
logout: () => request<ApiEnvelope<null>>('POST', '/auth/logout'),
changePassword: (currentPassword: string, newPassword: string) =>
  request<ApiEnvelope<null>>('POST', '/auth/change-password', { currentPassword, newPassword }),

  // posts
  listPosts: (params: Record<string, string> = {}) =>
    request<ApiEnvelope<{ items: any[]; total: number; page: number; limit: number }>>(
      'GET',
      `/posts/list?${new URLSearchParams(params)}`,
    ),
  getPost: (id: string) => request<ApiEnvelope<any>>('GET', `/posts/${id}`),
  createPost: (data: any) => request<ApiEnvelope<{ id: string }>>('POST', '/posts', data),
  updatePost: (id: string, data: any) =>
    request<ApiEnvelope<{ id: string }>>('PUT', `/posts/${id}`, data),
  deletePost: (id: string) => request<ApiEnvelope<null>>('DELETE', `/posts/${id}`),
  updatePostStatus: (id: string, status: 'draft' | 'published') =>
    request<ApiEnvelope<{ id: string }>>('PATCH', `/posts/${id}/status`, { status }),

  // tags & categories
  listTags: () => request<ApiEnvelope<any[]>>('GET', '/posts/tags'),
  createTag: (data: any) => request<ApiEnvelope<{ id: string }>>('POST', '/posts/tags', data),
  deleteTag: (id: string) => request<ApiEnvelope<null>>('DELETE', `/posts/tags/${id}`),
  listCategories: () => request<ApiEnvelope<any[]>>('GET', '/posts/categories'),
  createCategory: (data: any) =>
    request<ApiEnvelope<{ id: string }>>('POST', '/posts/categories', data),
  deleteCategory: (id: string) =>
    request<ApiEnvelope<null>>('DELETE', `/posts/categories/${id}`),

  // content: pages, links, subscribers
  listPages: () => request<ApiEnvelope<any[]>>('GET', '/content/pages'),
  createPage: (data: any) => request<ApiEnvelope<{ id: string }>>('POST', '/content/pages', data),
  updatePage: (id: string, data: any) =>
    request<ApiEnvelope<{ id: string }>>('PUT', `/content/pages/${id}`, data),
  deletePage: (id: string) => request<ApiEnvelope<null>>('DELETE', `/content/pages/${id}`),
  listLinks: () => request<ApiEnvelope<any[]>>('GET', '/content/links'),
  createLink: (data: any) => request<ApiEnvelope<{ id: string }>>('POST', '/content/links', data),
  updateLink: (id: string, data: any) =>
    request<ApiEnvelope<{ id: string }>>('PUT', `/content/links/${id}`, data),
  deleteLink: (id: string) => request<ApiEnvelope<null>>('DELETE', `/content/links/${id}`),
  listSubscribers: (q = '') =>
    request<ApiEnvelope<any[]>>('GET', `/content/subscribers${q ? `?q=${q}` : ''}`),
  deleteSubscriber: (id: string) =>
    request<ApiEnvelope<null>>('DELETE', `/content/subscribers/${id}`),

  // site config
  getConfig: () => request<ApiEnvelope<any>>('GET', '/config'),
  saveConfig: (config: any) => request<ApiEnvelope<any>>('PUT', '/config', config),

  // media
  uploadMedia: async (file: File, provider?: string) => {
    const form = new FormData();
    form.append('file', file);
    const url = provider ? `/admin/api/media/upload?provider=${encodeURIComponent(provider)}` : '/admin/api/media/upload';
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      body: form,
    });
    const data = await res.json();
    if (!res.ok) throw new ApiError(res.status, data.error || '上传失败');
    return data as { success: boolean; data: { key: string; url: string } };
  },
  listMedia: (prefix = '') =>
    request<ApiEnvelope<{ key: string; url: string; size: number }[]>>(
      'GET',
      `/media/list${prefix ? `?prefix=${prefix}` : ''}`,
    ),
  deleteMedia: (key: string) =>
    request<ApiEnvelope<null>>('DELETE', `/media/${encodeURIComponent(key)}`),

  // storage
  saveStorageConfig: (config: any) =>
    request<ApiEnvelope<null>>('PUT', '/config/storage', config),
  testStorageConn: (config: any) =>
    request<ApiEnvelope<{ status: string; message: string }>>('POST', '/config/storage/test', config),
  getStorageConfig: () => request<ApiEnvelope<StorageConfig>>('GET', '/config/storage'),
  // resources
  listResources: (provider: 'local' | 'r2' | 's3' | 'github') =>
    request<ResourceListResult>('GET', `/resources/list?provider=${provider}`),
  deleteResource: (key: string, provider?: 'local' | 'r2' | 's3' | 'github') =>
    request<ApiEnvelope<null>>('DELETE', `/resources/${encodeURIComponent(key)}${provider ? `?provider=${provider}` : ''}`),
};
