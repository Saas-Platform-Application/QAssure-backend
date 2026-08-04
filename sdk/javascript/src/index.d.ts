/**
 * QAssure Platform JavaScript SDK Type Definitions
 */

export interface QAssureClientOptions {
  baseUrl?: string;
  apiVersion?: string;
  tenantId?: string;
  timeout?: number;
}

export interface LoginResponse {
  success: boolean;
  data: {
    user: User;
    tokens: {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };
  };
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  status: string;
  tenant_id: string;
}

export interface Module {
  id: string;
  module_id: string;
  name: string;
  description: string;
  version: string;
  status: ModuleStatus;
  health_status: HealthStatus;
  base_url: string;
  health_endpoint: string;
  endpoints: ModuleEndpoint[];
  kafka_topics: KafkaTopics;
  created_at: string;
  updated_at: string;
}

export type ModuleStatus = 
  | 'pending' 
  | 'starting' 
  | 'running' 
  | 'stopping' 
  | 'stopped' 
  | 'failed' 
  | 'deprecated' 
  | 'maintenance';

export type HealthStatus = 'healthy' | 'unhealthy' | 'unknown';

export interface ModuleEndpoint {
  path: string;
  method: string;
  description: string;
}

export interface KafkaTopics {
  publish: string[];
  subscribe: string[];
}

export interface Document {
  id: string;
  document_number: string;
  title: string;
  description: string;
  document_type: string;
  status: string;
  version: string;
  created_at: string;
  updated_at: string;
}

export interface Capa {
  id: string;
  capa_number: string;
  title: string;
  description: string;
  capa_type: 'corrective' | 'preventive';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  supplier_code: string;
  name: string;
  status: string;
  risk_level: string;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface WebSocketOptions {
  onOpen?: () => void;
  onMessage?: (data: any) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
}

export declare class QAssureClient {
  constructor(options?: QAssureClientOptions);

  // Authentication
  login(email: string, password: string): Promise<LoginResponse>;
  logout(): Promise<ApiResponse<any>>;
  refreshAccessToken(): Promise<ApiResponse<any>>;
  setToken(accessToken: string, refreshToken?: string): void;

  // Modules
  listModules(params?: object): Promise<PaginatedResponse<Module>>;
  getModule(id: string): Promise<ApiResponse<Module>>;
  registerModule(moduleData: Partial<Module>): Promise<ApiResponse<Module>>;
  updateModule(id: string, data: Partial<Module>): Promise<ApiResponse<Module>>;
  startModule(id: string): Promise<ApiResponse<Module>>;
  stopModule(id: string, reason?: string): Promise<ApiResponse<Module>>;
  restartModule(id: string, reason?: string): Promise<ApiResponse<Module>>;
  checkModuleHealth(id: string): Promise<ApiResponse<any>>;
  getModuleStats(): Promise<ApiResponse<any>>;

  // Users
  listUsers(params?: object): Promise<PaginatedResponse<User>>;
  getUser(id: string): Promise<ApiResponse<User>>;
  createUser(userData: Partial<User>): Promise<ApiResponse<User>>;
  updateUser(id: string, data: Partial<User>): Promise<ApiResponse<User>>;

  // Documents
  listDocuments(params?: object): Promise<PaginatedResponse<Document>>;
  getDocument(id: string): Promise<ApiResponse<Document>>;
  createDocument(documentData: Partial<Document>): Promise<ApiResponse<Document>>;

  // CAPAs
  listCapas(params?: object): Promise<PaginatedResponse<Capa>>;
  getCapa(id: string): Promise<ApiResponse<Capa>>;
  createCapa(capaData: Partial<Capa>): Promise<ApiResponse<Capa>>;

  // Training
  listTrainingCourses(params?: object): Promise<PaginatedResponse<any>>;
  getTrainingCourse(id: string): Promise<ApiResponse<any>>;

  // Suppliers
  listSuppliers(params?: object): Promise<PaginatedResponse<Supplier>>;
  getSupplier(id: string): Promise<ApiResponse<Supplier>>;

  // AI Gateway
  aiComplete(prompt: string, options?: object): Promise<ApiResponse<any>>;
  aiAnalyzeDocument(documentId: string, analysisType?: string): Promise<ApiResponse<any>>;

  // WebSocket
  connectWebSocket(options?: WebSocketOptions): WebSocket;

  // Health
  healthCheck(): Promise<ApiResponse<any>>;
}
