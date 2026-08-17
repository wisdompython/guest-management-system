import { request } from './request'
import type { QueueMonitorSnapshot } from './types'

export const operationsApi = {
  getQueueMonitor: () => request<QueueMonitorSnapshot>('/auth/operations/queue/'),
}
