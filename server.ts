import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import http from "http";
import https from "https";
import { IcyTransform } from "./src/radio/icyTransform.js"; // note: .js extension for ts-node / tsx if necessary, or just .ts if tsx maps it. Wait, tsx resolves imports automatically, let's omit the extension or use .ts. Wait, actually tsx supports importing without extension. Let's use "./src/radio/icyTransform". 

// Since I just created icyTransform, let's fix the import.
import { IcyTransform as Transformer } from "./src/radio/icyTransform"; 

// Create a global registry for stream metadata
const metadataRegistry = new Map<string, any>();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Stream Metadata SSE Endpoint
  app.get("/api/proxy-meta", (req, res) => {
    const streamUrl = req.query.url as string;
    if (!streamUrl) return res.status(400).send("Missing url");

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    const sendMeta = () => {
      const meta = metadataRegistry.get(streamUrl) || {};
      res.write(`data: ${JSON.stringify(meta)}\n\n`);
    };

    sendMeta(); // Send immediate state
    
    // Poll for changes (simple event bridge)
    const interval = setInterval(sendMeta, 2000);

    req.on('close', () => {
      clearInterval(interval);
    });
  });

  // Proxy audio stream to avoid mixed-content and CORS blocks on radio streams
  app.get("/api/proxy-stream", (req, res) => {
    const streamUrl = req.query.url as string;
    if (!streamUrl) return res.status(400).send("Missing url");

    const protocol = streamUrl.startsWith('https') ? https : http;
    
    // Some radio stations will reject the connection or hang if User-Agent isn't standard
    const options = {
      headers: {
        'User-Agent': 'VLC/3.0.18',
        'Icy-MetaData': '1',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      rejectUnauthorized: false,
      timeout: 10000 // timeout handling
    };

    let streamReq = protocol.get(streamUrl, options, (apiRes: any) => {
      if (apiRes.statusCode >= 300 && apiRes.statusCode < 400 && apiRes.headers.location) {
        let redirectUrl = apiRes.headers.location;
        if (!redirectUrl.startsWith('http')) {
           redirectUrl = new URL(redirectUrl, streamUrl).toString();
        }
        return res.redirect(`/api/proxy-stream?url=${encodeURIComponent(redirectUrl)}`);
      }

      const headersToKeep = ['content-type', 'icy-br', 'icy-genre', 'icy-name', 'icy-url'];
      let hasContentType = false;
      headersToKeep.forEach(h => {
        if (apiRes.headers[h]) {
          res.setHeader(h, apiRes.headers[h]);
          if (h === 'content-type') hasContentType = true;
        }
      });
      
      if (!hasContentType) {
        res.setHeader('Content-Type', 'audio/mpeg');
      }
      res.setHeader('Accept-Ranges', 'none');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Access-Control-Allow-Origin', '*');
      
      const metaIntVal = apiRes.headers['icy-metaint'];
      const metaInt = metaIntVal ? parseInt(metaIntVal, 10) : 0;
      
      res.status(apiRes.statusCode || 200);

      // Strip ICY metadata and send clean audio
      if (metaInt > 0) {
         const transformer = new Transformer(metaInt);
         transformer.on('metadata', (meta) => {
            metadataRegistry.set(streamUrl, meta);
         });
         apiRes.pipe(transformer).pipe(res);
      } else {
         apiRes.pipe(res);
      }
    });

    streamReq.on('timeout', () => {
        streamReq.destroy();
        if (!res.headersSent) res.status(504).end();
    });

    streamReq.on('error', (err: any) => {
      console.error("Proxy error:", err.message);
      if (!res.headersSent) res.status(500).end();
    });

    req.on('close', () => {
      streamReq.destroy();
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
