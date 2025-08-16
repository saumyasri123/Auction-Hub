import { QueryClient } from "@tanstack/react-query";
import { authManager } from "@/lib/auth";

async function throwIfResNotOk(res) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(method, url, data) {
  const headers = {
    ...(data ? { "Content-Type": "application/json" } : {}),
    ...authManager.getAuthHeader(), // { Authorization: "Bearer <token>" }
  };

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });
  } catch (e) {
    // Network error (server unreachable, CORS, etc.)
    throw new Error(`Network error: ${e?.message || e}`);
  }
  if (!res.ok) {
    // try to show a cleaner error from server
    const ct = res.headers.get("content-type") || "";
    const body = ct.includes("application/json") ? await res.json().catch(() => ({})) : await res.text();
    const details = typeof body === "string" ? body : body?.message || JSON.stringify(body);
    throw new Error(`${res.status}: ${details || res.statusText}`);
  }

  return await res.json();
}

export const getQueryFn =
  ({ on401 }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/"), {
      credentials: "include",
      headers: authManager.getAuthHeader(),
    });

    if (on401 === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
