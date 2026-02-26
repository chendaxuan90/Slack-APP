export type StatusConfig = {
  TODO: string;
  PENDING: string;
  APPROVED: string;
  IN_PROCESS: string;
  IN_REVIEW: string;
  DONE: string;
};

export function readStatusConfig(env: Record<string, string>): StatusConfig {
  const cfg = {
    TODO: (env.JIRA_STATUS_TODO ?? "").trim(),
    PENDING: (env.JIRA_STATUS_PENDING ?? "").trim(),
    APPROVED: (env.JIRA_STATUS_APPROVED ?? "").trim(),
    IN_PROCESS: (env.JIRA_STATUS_IN_PROCESS ?? "").trim(),
    IN_REVIEW: (env.JIRA_STATUS_IN_REVIEW ?? "").trim(),
    DONE: (env.JIRA_STATUS_DONE ?? "").trim(),
  };

  for (const [k, v] of Object.entries(cfg)) {
    if (!v) throw new Error(`Missing env: JIRA_STATUS_${k}`);
  }
  return cfg;
}