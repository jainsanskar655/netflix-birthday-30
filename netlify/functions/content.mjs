import { getStore } from "@netlify/blobs";

const STORE = "birthday";
const KEY = "content";

function headers(extra) {
  return Object.assign(
    {
      "content-type": "application/json",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,PUT,POST,OPTIONS",
      "access-control-allow-headers": "content-type",
    },
    extra || {}
  );
}

export default async (req) => {
  const method = (req.method || "GET").toUpperCase();
  try {
    if (method === "OPTIONS") return new Response(null, { status: 204, headers: headers() });

    const store = getStore(STORE);

    if (method === "GET") {
      const data = await store.get(KEY, { type: "json" });
      return new Response(JSON.stringify(data ?? null), { status: 200, headers: headers() });
    }

    if (method === "PUT" || method === "POST") {
      let body;
      try {
        body = await req.json();
      } catch (e) {
        return new Response(JSON.stringify({ error: "invalid json" }), { status: 400, headers: headers() });
      }
      if (!body || typeof body !== "object" || !body.library) {
        return new Response(JSON.stringify({ error: "invalid content" }), { status: 400, headers: headers() });
      }
      await store.setJSON(KEY, body);
      return new Response(
        JSON.stringify({ ok: true, titles: Object.keys(body.library).length, updated: new Date().toISOString() }),
        { status: 200, headers: headers() }
      );
    }

    return new Response(JSON.stringify({ error: "method not allowed" }), { status: 405, headers: headers() });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String((e && e.message) || e) }),
      { status: 500, headers: headers() }
    );
  }
};
