export interface N8NWorkflowNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, unknown>;
  credentials?: Record<string, unknown>;
  webhookId?: string;
  disabled?: boolean;
  notes?: string;
  notesInFlow?: boolean;
  color?: string;
  executeOnce?: boolean;
  alwaysOutputData?: boolean;
  continueOnFail?: boolean;
  onError?: string;
  /** @deprecated Use onError instead */
  retryOnFail?: boolean;
  /** Runtime-only field set by n8n — never sent to the API */
  issues?: unknown;
}

export interface N8NWorkflowConnection {
  [sourceNode: string]: {
    [output: string]: Array<
      Array<{
        node: string;
        type: string;
        index: number;
      }>
    >;
  };
}

export interface N8NWorkflowSettings {
  executionOrder?: string;
  saveManualExecutions?: boolean;
  callerPolicy?: string;
  errorWorkflow?: string;
  timezone?: string;
  saveExecutionProgress?: boolean;
  saveDataSuccessExecution?: string;
  saveDataErrorExecution?: string;
  [key: string]: unknown;
}

export interface N8NWorkflow {
  id?: string | number;
  name: string;
  active: boolean;
  nodes: N8NWorkflowNode[];
  connections: N8NWorkflowConnection;
  settings?: N8NWorkflowSettings;
  staticData?: unknown;
  tags?: Array<{ id: string; name: string }>;
  pinData?: Record<string, unknown>;
  versionId?: string;
  meta?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface N8NListResponse<T> {
  data: T[];
  nextCursor?: string | null;
}

export interface EnvironmentConfig {
  url: string;
  apiKey: string;
}

export interface N8NCliConfig {
  environments: Record<string, EnvironmentConfig>;
  source: string;
  target: string;
  workflowsDir?: string;
}


