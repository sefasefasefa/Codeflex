import { Router, type IRouter, type Request } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/diag", (req: Request, res) => {
  const ua = req.headers["user-agent"] ?? "unknown";
  const sid = (req.cookies as Record<string, string>)?.sid ? "✓ mevcut" : "✗ yok";
  const host = req.headers.host ?? "unknown";
  const proto = req.headers["x-forwarded-proto"] ?? req.protocol;
  const html = `<!DOCTYPE html>
<html lang="tr" style="background:#0a0f1e;color:#e2e8f0;font-family:monospace">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Diagnostik</title>
<style>body{margin:0;padding:20px}h1{color:#22d3ee}table{border-collapse:collapse;width:100%}
td{padding:8px 12px;border:1px solid #1e2d3d}td:first-child{color:#94a3b8;width:50%}
.ok{color:#4ade80}.err{color:#f87171}</style></head>
<body>
<h1>⚡ SWARM_CTRL Diagnostik</h1>
<table>
<tr><td>API Sunucu</td><td class="ok">✓ Çalışıyor</td></tr>
<tr><td>Host</td><td>${host}</td></tr>
<tr><td>Protokol</td><td>${proto}</td></tr>
<tr><td>Oturum (sid cookie)</td><td class="${(req.cookies as Record<string, string>)?.sid ? "ok" : "err"}">${sid}</td></tr>
<tr><td>User-Agent</td><td style="font-size:11px;word-break:break-all">${ua}</td></tr>
</table>
<h2 style="color:#22d3ee;margin-top:24px">Uygulama Linkleri</h2>
<ul>
<li><a href="/" style="color:#22d3ee">Swarm UI (Ana Uygulama)</a></li>
<li><a href="/studio/" style="color:#6366f1">AI Studio</a></li>
<li><a href="/cli/" style="color:#4ade80">CLI</a></li>
</ul>
<p style="color:#64748b;font-size:12px">Bu sayfa JavaScript kullanmaz. JS hatası değil ise uygulamalar yüklenebilir.</p>
</body></html>`;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

export default router;
