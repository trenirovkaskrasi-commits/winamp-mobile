import type { Context } from "@netlify/edge-functions";

export default async (req: Request, context: Context) => {
  const url = new URL(req.url);
  const targetUrlStr = url.searchParams.get("url");

  if (!targetUrlStr) {
    return new Response("Missing url parameter", { status: 400 });
  }

  try {
    const targetUrl = new URL(targetUrlStr);

    const response = await fetch(targetUrl.toString(), {
      headers: {
        "User-Agent": "VLC/3.0.18",
        "Connection": "keep-alive"
      }
    });

    if (!response.ok) {
        return new Response(`Failed to fetch stream: ${response.status} ${response.statusText}`, { status: response.status });
    }

    const proxyHeaders = new Headers();
    proxyHeaders.set("Content-Type", response.headers.get("Content-Type") || "audio/mpeg");
    proxyHeaders.set("Connection", "keep-alive");
    proxyHeaders.set("Cache-Control", "no-cache");
    proxyHeaders.set("Access-Control-Allow-Origin", "*");

    for (const [key, value] of response.headers.entries()) {
        if (key.toLowerCase().startsWith("icy-")) {
            proxyHeaders.set(key, value);
        }
    }

    return new Response(response.body, {
      status: response.status,
      headers: proxyHeaders
    });

  } catch (error) {
    console.error("Proxy stream error:", error);
    return new Response("Internal Server Error fetching stream", { status: 500 });
  }
};
