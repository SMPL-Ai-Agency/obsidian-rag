// src/models/QueueEvents.ts
import { TaskStatus, ProcessingTask } from './ProcessingTask';

export interface QueueStatusEvent {
    queueSize: number;
    pendingChanges: number;
    processingCount: number;
    status: 'initializing' | 'processing' | 'paused';
    taskStatus?: TaskStatus;
}

export interface QueueProgressEvent {
    processed: number;
    total: number;
    currentTask?: string;
}

export interface TaskCompletedEvent {
    task: ProcessingTask;
}

export interface TaskFailedEvent {
    task: ProcessingTask;
    error: unknown;
}

export type QueueEventTypes = {
    'queue-status': QueueStatusEvent;
    'queue-progress': QueueProgressEvent;
    'task-completed': TaskCompletedEvent;
    'task-failed': TaskFailedEvent;
};

export type QueueEventCallback<T extends keyof QueueEventTypes> =
    (data: QueueEventTypes[T]) => void;
