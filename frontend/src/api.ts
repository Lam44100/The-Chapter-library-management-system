export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  method = "GET",
  data?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (method !== "GET") {
    const r = await fetch("/api/v1/auth/csrf", { credentials: "same-origin" });
    if (!r.ok)
      throw new ApiError(
        "Unable to prepare your request. Please retry.",
        r.status,
      );
    const token = await r.json();
    headers[token.headerName] = token.token;
  }
  let response: Response;
  try {
    response = await fetch("/api/v1" + path, {
      method,
      headers,
      credentials: "same-origin",
      body: data === undefined ? undefined : JSON.stringify(data),
    });
  } catch {
    throw new ApiError(
      "The library could not be reached. Please check your connection and retry.",
      0,
    );
  }
  if (!response.ok) {
    const body = await response
      .json()
      .catch(() => ({ message: "The request could not be completed." }));
    if (response.status === 401)
      window.dispatchEvent(new Event("session-expired"));
    throw new ApiError(
      body.message || "Please try again.",
      response.status,
      body.fields,
    );
  }
  const body = await response.text();
  return (body ? JSON.parse(body) : undefined) as T;
}
