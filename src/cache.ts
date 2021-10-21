import type * as http from "http";
import * as express from "express";
import * as fs from "fs";
import * as crypto from "crypto";

const PASS_THROUGH_HEADERS = ["content-type"];

function toUrl(req: http.IncomingMessage): string {
  return `${req.headers.host}${req.url}`;
}

export class Cache {
  constructor(private cache_directory: string) {}

  private toPaths(req: http.IncomingMessage) {
    const url = toUrl(req);
    const hash = crypto.createHash("sha256").update(url).digest("hex");
    const directory = `${this.cache_directory}/${hash}`;
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
    return {
      directory,
      url: `${directory}/url`,
      body: `${directory}/body`,
      headers: `${directory}/headers`,
    };
  }

  private async read(
    req: http.IncomingMessage,
    res: express.Response
  ): Promise<boolean> {
    if (req.method !== "GET") return false;

    const paths = this.toPaths(req);
    const hit = fs.existsSync(paths.headers);
    console.error(
      `[Cache.read] (${hit ? "HIT" : "MISS"}:${paths.directory}) ${toUrl(req)}`
    );
    if (!hit) return false;
    res.setHeader("x-cache-proxy", "hit");

    const headers = JSON.parse(
      (await fs.promises.readFile(paths.headers)).toString()
    );
    const buffer = await fs.promises.readFile(paths.body);

    for (const key of PASS_THROUGH_HEADERS) {
      if (headers[key]) {
        res.setHeader(key, headers[key]);
      }
    }
    res.send(buffer);
    return true;
  }

  private async write(
    buffer: Buffer,
    proxyRes: http.IncomingMessage,
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    res.setHeader("x-cache-proxy", "miss");

    if (req.method !== "GET" || proxyRes.statusCode !== 200) return;

    const paths = this.toPaths(req);
    console.error(`[Cache.write] (${paths.directory}) ${toUrl(req)}`);

    const headers = JSON.stringify(proxyRes.headers, null, 2);
    let body: Buffer | string = buffer;
    if (proxyRes.headers["content-type"]?.startsWith("application/json")) {
      body = JSON.stringify(JSON.parse(buffer.toString()), null, 2);
    }

    await Promise.all([
      fs.promises.writeFile(paths.url, toUrl(req)),
      fs.promises.writeFile(paths.headers, headers),
      fs.promises.writeFile(paths.body, body),
    ]);
  }

  middleware = async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): Promise<void> => {
    if (await this.read(req, res)) return;
    next();
  };

  interceptor = async (
    buffer: Buffer,
    proxyRes: http.IncomingMessage,
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<Buffer> => {
    await this.write(buffer, proxyRes, req, res);
    return buffer;
  };
}
