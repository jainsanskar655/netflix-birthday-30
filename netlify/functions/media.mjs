import { getStore } from "@netlify/blobs";

const STORE = "birthday-media";
const MAX_CHUNK = 5 * 1024 * 1024; // 5 MB per part (Netlify request limit is ~6 MB)

function cors(extra) {
  return Object.assign(
    {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
      "access-control-allow-headers": "content-type,range,x-file-type",
      "access-control-expose-headers": "content-range,content-length,accept-ranges",
    },
    extra || {}
  );
}
function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: cors({ "content-type": "application/json", "cache-control": "no-store" }),
  });
}

export default async (req) => {
  const url = new URL(req.url);
  const method = (req.method || "GET").toUpperCase();
  const action = url.searchParams.get("action") || "";
  const id = (url.searchParams.get("id") || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);

  if (method === "OPTIONS") return new Response(null, { status: 204, headers: cors() });

  try {
    const store = getStore(STORE);

    /* -------- upload one chunk -------- */
    if (method === "POST" && action === "put") {
      if (!id) return json({ error: "missing id" }, 400);
      const page = Number(url.searchParams.get("page") || 0);
      const buf = await req.arrayBuffer();
      if (!buf || buf.byteLength === 0) return json({ error: "empty chunk" }, 400);
      if (buf.byteLength > MAX_CHUNK) return json({ error: "chunk too large" }, 413);
      await store.set(`${id}/p${page}`, buf);
      return json({ ok: true, page, size: buf.byteLength });
    }

    /* -------- finalize upload -------- */
    if (method === "POST" && action === "finalize") {
      if (!id) return json({ error: "missing id" }, 400);
      const total = Number(url.searchParams.get("total") || 0);
      const chunk = Number(url.searchParams.get("chunk") || MAX_CHUNK);
      const count = Number(url.searchParams.get("count") || (total && chunk ? Math.ceil(total / chunk) : 1));
      const type = url.searchParams.get("type") || "application/octet-stream";
      const name = (url.searchParams.get("name") || "").slice(0, 200);
      if (!total) return json({ error: "missing total" }, 400);
      const meta = { id, total, chunk, count, type, name, created: Date.now() };
      await store.set(`${id}/meta`, JSON.stringify(meta));
      return json({ ok: true, key: id, url: `/api/media?id=${encodeURIComponent(id)}`, meta });
    }

    /* -------- serve (with HTTP range support) -------- */
    if (method === "GET" && id) {
      const metaRaw = await store.get(`${id}/meta`);
      if (!metaRaw) return new Response("Not found", { status: 404, headers: cors() });
      const meta = JSON.parse(metaRaw);
      const total = meta.total;
      const chunk = meta.chunk;
      const count = meta.count;
      const type = meta.type || "application/octet-stream";

      const range = req.headers.get("range");
      let start = 0;
      let end = total - 1;
      let status = 200;
      if (range) {
        const m = /bytes=(\d*)-(\d*)/.exec(range);
        if (m) {
          if (m[1] !== "") start = parseInt(m[1], 10);
          if (m[2] !== "") end = parseInt(m[2], 10);
          else if (m[1] !== "") end = total - 1;
          if (isNaN(start)) start = 0;
          if (isNaN(end)) end = total - 1;
          if (start > end || start >= total) {
            return new Response(null, { status: 416, headers: cors({ "content-range": `bytes */${total}` }) });
          }
          if (end >= total) end = total - 1;
          status = 206;
        }
      }

      const firstPart = Math.floor(start / chunk);
      const lastPart = Math.floor(end / chunk);
      const pieces = [];
      let outLen = 0;
      for (let p = firstPart; p <= lastPart && p < count; p++) {
        const ab = await store.get(`${id}/p${p}`, { type: "arrayBuffer" });
        if (!ab) continue;
        const u8 = new Uint8Array(ab);
        const partStart = p * chunk;
        const from = Math.max(0, start - partStart);
        const to = Math.min(u8.length, end - partStart + 1);
        if (to > from) {
          const piece = u8.subarray(from, to);
          pieces.push(piece);
          outLen += piece.length;
        }
      }
      const out = new Uint8Array(outLen);
      let off = 0;
      for (const piece of pieces) {
        out.set(piece, off);
        off += piece.length;
      }
      const h = cors({
        "content-type": type,
        "content-length": String(out.length),
        "accept-ranges": "bytes",
        "cache-control": "public, max-age=31536000, immutable",
      });
      if (status === 206) h["content-range"] = `bytes ${start}-${end}/${total}`;
      return new Response(out, { status, headers: h });
    }

    /* -------- delete -------- */
    if (method === "DELETE" && id) {
      try {
        const metaRaw = await store.get(`${id}/meta`);
        if (metaRaw) {
          const meta = JSON.parse(metaRaw);
          for (let p = 0; p < meta.count; p++) await store.delete(`${id}/p${p}`);
        }
        await store.delete(`${id}/meta`);
      } catch (e) {
        /* best effort */
      }
      return json({ ok: true });
    }

    return json({ error: "bad request" }, 400);
  } catch (e) {
    return json({ error: String((e && e.message) || e) }, 500);
  }
};
