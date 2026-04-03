export type BackendActor = {
  authSubject: string;
  email?: string | null;
};

type BuildHeadersParams = {
  token?: string | null;
  actor?: BackendActor | null;
  contentType?: boolean;
};

export function buildBackendHeaders(params: BuildHeadersParams): HeadersInit {
  const headers: Record<string, string> = {};
  const serviceToken = process.env.INTERNAL_SERVICE_TOKEN || process.env.BACKEND_SERVICE_TOKEN;

  if (params.contentType) {
    headers["Content-Type"] = "application/json";
  }

  if (params.token) {
    headers.Authorization = `Bearer ${params.token}`;
  }

  if (serviceToken && params.actor?.authSubject) {
    headers["X-Internal-Service-Token"] = serviceToken;
    headers["X-Actor-Auth-Subject"] = params.actor.authSubject;
    if (params.actor.email) {
      headers["X-Actor-Email"] = params.actor.email;
    }
  }

  return headers;
}
