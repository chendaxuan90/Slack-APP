// shared/flow_config.ts
export type NotifyMode = "none" | "channel" | "dm_clicker" | "ephemeral_clicker";

export type FlowStep = {
  label: string;           // 按钮显示用
  transition: string;      // Jira transition.name
  guard?: { allowUsers?: string[] };
  notify?: { mode: NotifyMode; text: string };
};

export type FlowConfig = Record<string, FlowStep>; // key = Jira status.name

export function safeJsonParse<T>(s: string): T | null {
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

export function readFlowConfig(env: Record<string, string>): FlowConfig {
  const raw = (env.JIRA_FLOW_JSON ?? "").trim();
  if (!raw) return {};
  return safeJsonParse<FlowConfig>(raw) ?? {};
}

export function decideNext(flow: FlowConfig, currentStatus: string) {
  const step = flow[currentStatus];
  if (!step?.transition) return null;
  return { label: step.label, transitionName: step.transition, step };
}