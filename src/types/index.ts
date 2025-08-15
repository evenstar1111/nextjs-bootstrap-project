export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  instructions?: string;
  settings?: any;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  conversationCount?: number;
  fileCount?: number;
}

export interface Conversation {
  id: string;
  title: string;
  model: string;
  settings?: any;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  projectId?: string;
  folderId?: string;
  messages?: Message[];
  project?: {
    id: string;
    name: string;
  };
  folder?: {
    id: string;
    name: string;
    color?: string;
  };
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: any;
  createdAt: Date;
  conversationId: string;
  files?: FileAttachment[];
}

export interface FileAttachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  processed: boolean;
  extractedText?: string;
  createdAt: Date;
}

export interface Folder {
  id: string;
  name: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  conversationCount?: number;
}

export interface Memory {
  id: string;
  key: string;
  content: string;
  context?: string;
  importance: number;
  createdAt: Date;
  updatedAt: Date;
  userId?: string;
  projectId?: string;
  conversationId?: string;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source?: string;
}

export interface ChatSettings {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name?: string;
}
