import { request } from './request';
import type { AuthUser, CreateUserPayload } from './types';

export const authApi = {
  login: (username: string, password: string) =>
    request<AuthUser>('/auth/login/', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () =>
    request<void>('/auth/logout/', { method: 'POST' }),
  me: () =>
    request<AuthUser>('/auth/me/'),
  getUsers: () =>
    request<AuthUser[]>('/auth/users/'),
  createUser: (data: CreateUserPayload) =>
    request<AuthUser>('/auth/users/', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: number, data: Partial<Pick<AuthUser, 'email' | 'first_name' | 'last_name' | 'role' | 'is_active'>>) =>
    request<AuthUser>(`/auth/users/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteUser: (id: number) =>
    request<void>(`/auth/users/${id}/`, { method: 'DELETE' }),
};
