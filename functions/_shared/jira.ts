/**
 * Jira REST helpers for Slack Deno functions
 * - Normalizes base URL (fixes common mistake: adding /jira)
 * - Provides verbose error context (method/url/status/body)
 * - Trims issue keys to avoid 404 caused by whitespace/newlines
 */

function b64(s: string) {
  return btoa(unescape(encodeURIComponent(s)));
}

function normalizeBaseUrl(raw: string) {
  let url = (raw ?? "").trim();

  if (!url) return "";

  // remove trailing slashes
  url = url.replace(/\/+$/, "");

  // common mistake: https://<site>.atlassian.net/jira  (should be root)
  // remove ending "/jira" or "/jira/" safely
  url = url.replace(/\/jira$/i, "");

  return url;
}

export function jiraBaseUrl(env: Record<string, string>) {
  const baseUrl = normalizeBaseUrl(env.JIRA_BASE_URL ?? "");
  if (!baseUrl) throw new Error("Missing env: JIRA_BASE_URL");
  return baseUrl;
}

async function readJsonOrText(resp: Response): Promise<{ json?: any; text?: string }> {
  const text = await resp.text().catch(() => "");
  if (!text) return { json: {}, text: "" };

  try {
    return { json: JSON.parse(text), text };
  } catch {
    return { text };
  }
}

export async function jiraFetch(env: Record<string, string>, path: string, init?: RequestInit) {
  const baseUrl = jiraBaseUrl(env);
  const email = (env.JIRA_EMAIL ?? "").trim();
  const token = (env.JIRA_API_TOKEN ?? "").trim();

  if (!email || !token) throw new Error("Missing env: JIRA_EMAIL / JIRA_API_TOKEN");

  const method = (init?.method ?? "GET").toUpperCase();
  const url = `${baseUrl}${path}`;

  const resp = await fetch(url, {
    ...init,
    method,
    headers: {
      Authorization: "Basic " + b64(`${email}:${token}`),
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const parsed = await readJsonOrText(resp);
  const data = parsed.json ?? (parsed.text ?? {});

  return {
    ok: resp.ok,
    status: resp.status,
    data,
    url,
    method,
    baseUrl,
  };
}

export async function getIssueStatusName(env: Record<string, string>, issueKeyInput: string) {
  const issueKey = (issueKeyInput ?? "").trim();
  if (!issueKey) throw new Error(`Issue key is empty (input="${issueKeyInput}")`);

  const r = await jiraFetch(
    env,
    `/rest/api/3/issue/${encodeURIComponent(issueKey)}?fields=status`,
    { method: "GET" },
  );

  if (!r.ok) {
    throw new Error(
      `GET issue failed. status=${r.status} method=${r.method} url=${r.url} body=${JSON.stringify(r.data)}`,
    );
  }

  return (r.data?.fields?.status?.name ?? "Unknown") as string;
}

export async function transitionByName(env: Record<string, string>, issueKeyInput: string, transitionNameInput: string) {
  const issueKey = (issueKeyInput ?? "").trim();
  const transitionName = (transitionNameInput ?? "").trim();

  if (!issueKey) throw new Error("issueKey is empty");
  if (!transitionName) throw new Error("transitionName is empty");

  const getRes = await jiraFetch(
    env,
    `/rest/api/3/issue/${encodeURIComponent(issueKey)}/transitions`,
    { method: "GET" },
  );

  if (!getRes.ok) {
    throw new Error(
      `GET transitions failed. status=${getRes.status} method=${getRes.method} url=${getRes.url} body=${JSON.stringify(getRes.data)}`,
    );
  }

  const transitions: any[] = getRes.data?.transitions ?? [];
  const match = transitions.find((t) => (t?.name ?? "").trim() === transitionName);

  if (!match?.id) {
    const available = transitions.map((t) => t?.name).filter(Boolean).slice(0, 50).join(", ");
    throw new Error(`Transition "${transitionName}" not found. Available: ${available || "(none)"}`);
  }

  const postRes = await jiraFetch(
    env,
    `/rest/api/3/issue/${encodeURIComponent(issueKey)}/transitions`,
    {
      method: "POST",
      body: JSON.stringify({ transition: { id: match.id } }),
    },
  );

  if (!postRes.ok) {
    throw new Error(
      `POST transition failed. status=${postRes.status} method=${postRes.method} url=${postRes.url} body=${JSON.stringify(postRes.data)}`,
    );
  }

  return postRes.baseUrl;
}