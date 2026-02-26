import { getIssueStatusName, transitionByName, jiraBaseUrl } from "./jira.ts";

export function formatJstNow(date = new Date()): string {
  const fmt = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return `${fmt.format(date)} JST`;
}

export function extractIssueKey(input: { issueKey?: string; issueUrl?: string }): string {
  const { issueKey, issueUrl } = input;

  if (issueUrl) {
    const m = issueUrl.match(/\/browse\/([A-Z][A-Z0-9]+-\d+)/);
    if (m?.[1]) return m[1];
  }

  if (issueKey) {
    const m = issueKey.match(/([A-Z][A-Z0-9]+-\d+)/);
    if (m?.[1]) return m[1];
  }

  return (issueKey ?? "").trim();
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function getStatusWithRetry(args: {
  env: Record<string, string>;
  issueKey: string;
  retries?: number;
  intervalMs?: number;
}) {
  const retries = args.retries ?? 3;
  const intervalMs = args.intervalMs ?? 600;

  let lastErr: unknown;
  for (let i = 0; i < retries; i++) {
    try {
      return await getIssueStatusName(args.env, args.issueKey);
    } catch (e) {
      lastErr = e;
      if (i < retries - 1) await sleep(intervalMs);
    }
  }
  throw lastErr;
}

/** transition 後の反映遅延対策：before と違う状態になるまで待つ */
export async function waitForStatusChange(args: {
  env: Record<string, string>;
  issueKey: string;
  before: string;
  timeoutMs?: number;
  intervalMs?: number;
}) {
  const timeoutMs = args.timeoutMs ?? 20000;
  const intervalMs = args.intervalMs ?? 1200;

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const cur = await getIssueStatusName(args.env, args.issueKey);
      if (cur && cur !== args.before) return cur;
    } catch {
      // ignore
    }
    await sleep(intervalMs);
  }

  // timeout：最后再取一次
  try {
    return await getIssueStatusName(args.env, args.issueKey);
  } catch {
    return "Unknown";
  }
}

/**
 * Direct transition:
 * - Status Before: transition 前（API）
 * - Status Now: transition 後（polling + API）
 */
export async function runTransitionDirect(args: {
  env: Record<string, string>;
  issueKey: string;
  issueUrl?: string;
  transitionEnvKey: string;
}) {
  const issueKey = extractIssueKey({ issueKey: args.issueKey, issueUrl: args.issueUrl });
  if (!issueKey) return { ok: false as const, error: "Issue key is empty." };

  const transitionName = (args.env[args.transitionEnvKey] ?? "").trim();
  if (!transitionName) {
    return { ok: false as const, error: `Missing env: ${args.transitionEnvKey}`, issueKey };
  }

  let statusBefore = "Unknown";
  try {
    statusBefore = await getStatusWithRetry({ env: args.env, issueKey, retries: 3, intervalMs: 600 });
  } catch {
    statusBefore = "Unknown";
  }

  try {
    await transitionByName(args.env, issueKey, transitionName);
  } catch (e) {
    return {
      ok: false as const,
      error: `Transition failed (${transitionName}): ${String(e)}`,
      issueKey,
      transitionName,
      statusBefore,
    };
  }

  const statusNow = await waitForStatusChange({
    env: args.env,
    issueKey,
    before: statusBefore,
    timeoutMs: 20000,
    intervalMs: 1200,
  });

  const baseUrl = jiraBaseUrl(args.env);
  const issueUrl = `${baseUrl}/browse/${issueKey}`;

  return {
    ok: true as const,
    issueKey,
    issueUrl,
    transitionName,
    statusBefore,
    statusNow,
  };
}