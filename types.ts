export type UserRole = 'user' | 'admin';
export type SubscriptionTier = 'free' | 'premium';

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role: UserRole;
  subscription_tier: SubscriptionTier;
  gemini_api_key?: string; // Encrypted or stored securely in DB
}

export interface ChatSource {
  title: string;
  uri: string;
  type: 'web' | 'map';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  isError?: boolean;
  images?: string[]; // base64 data URIs
  sources?: ChatSource[];
  toolUsed?: ToolMode;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
}

export enum AppView {
  AUTH = 'AUTH',
  HOME = 'HOME',
  CHAT = 'CHAT',
  PROFILE = 'PROFILE',
  SETTINGS = 'SETTINGS'
}

export type ToolMode = 'chat' | 'search' | 'maps' | 'image' | 'thinking';