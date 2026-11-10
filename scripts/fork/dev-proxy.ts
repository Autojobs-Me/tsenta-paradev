// Local proxy for scripts/fork/dev.sh (127.0.0.1 only). The dev renderer runs at http://localhost:<port>, an
// origin Paradev's hosted API does not accept, so the dev app talks to this proxy instead: it answers CORS
// preflights itself and forwards each request upstream with the web app's origin. The browser sign-in is sent
// straight to the API, because its OAuth cookies live on the API's own domain.
const DEV_ORIGIN = `http://localhost:${process.env.DESKTOP_VITE_PORT || "5937"}`;
const SEND_ORIGIN = process.env.NEXT_PUBLIC_WEB_URL_UPSTREAM || "https://app.superset.sh";
const routes: Array<[number, string]> = [
	[Number(process.env.TSENTA_DEV_API_PORT || 5938), "https://api.superset.sh"],
	[Number(process.env.TSENTA_DEV_STREAMS_PORT || 5939), "https://streams.superset.sh"],
];
for (const [port, upstream] of routes) {
	Bun.serve({
		port,
		hostname: "127.0.0.1",
		idleTimeout: 0,
		async fetch(req) {
			const url = new URL(req.url);
			const origin = req.headers.get("origin") || DEV_ORIGIN;
			const cors: Record<string, string> = {
				"access-control-allow-origin": origin,
				"access-control-allow-credentials": "true",
				vary: "Origin",
				"access-control-expose-headers":
					"ETag, electric-handle, electric-offset, electric-schema, electric-cursor, electric-up-to-date",
			};
			if (req.method === "OPTIONS") {
				return new Response(null, {
					status: 204,
					headers: {
						...cors,
						"access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
						"access-control-allow-headers": req.headers.get("access-control-request-headers") || "*",
						"access-control-max-age": "600",
					},
				});
			}
			if (req.method === "GET" && url.pathname.startsWith("/api/auth/desktop/")) {
				return Response.redirect(upstream + url.pathname + url.search, 302);
			}
			const headers = new Headers(req.headers);
			headers.delete("host");
			if (headers.has("origin")) headers.set("origin", SEND_ORIGIN);
			if (headers.has("referer")) headers.set("referer", `${SEND_ORIGIN}/`);
			const hasBody = !["GET", "HEAD"].includes(req.method);
			let res: Response;
			try {
				res = await fetch(upstream + url.pathname + url.search, {
					method: req.method,
					headers,
					body: hasBody ? req.body : undefined,
					redirect: "manual",
					duplex: "half",
				} as RequestInit);
			} catch (error) {
				return new Response(`dev-proxy: ${error}`, { status: 502, headers: cors });
			}
			const out = new Headers(res.headers);
			for (const key of [...out.keys()]) if (key.startsWith("access-control-")) out.delete(key);
			for (const [key, value] of Object.entries(cors)) out.set(key, value);
			const cookies = res.headers.getSetCookie?.() ?? [];
			out.delete("set-cookie");
			for (const cookie of cookies) out.append("set-cookie", cookie.replace(/;\s*Domain=[^;]*/i, ""));
			out.delete("content-encoding");
			out.delete("content-length");
			return new Response(res.body, { status: res.status, statusText: res.statusText, headers: out });
		},
	});
	console.log(`[tsenta-dev-proxy] 127.0.0.1:${port} -> ${upstream}`);
}
