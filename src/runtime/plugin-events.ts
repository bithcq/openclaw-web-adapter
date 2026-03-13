export function createWebAdapterPluginEventPoster(params: {
  pluginEventsUrl: string;
  pluginAuthToken?: string;
  fetchImpl?: typeof fetch;
}) {
  const fetchImpl = params.fetchImpl ?? fetch;

  return async function postWebAdapterPluginEvent(body: string | object): Promise<Response> {
    return await fetchImpl(params.pluginEventsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(params.pluginAuthToken ? { Authorization: `Bearer ${params.pluginAuthToken}` } : {}),
      },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
  };
}
