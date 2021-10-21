import * as express from "express";
import {
  createProxyMiddleware,
  responseInterceptor,
} from "http-proxy-middleware";
import { Cache } from "./cache";
import { ArgumentParser } from "argparse";
import * as fs from "fs";

const DEFAULT_TARGET = "https://httpbin.org";

interface Args {
  host: string;
  port: number;
  cache_directory: string;
  proxy_config?: string;
}

export function createApp(
  args: Pick<Args, "cache_directory" | "proxy_config">
) {
  const config =
    args.proxy_config && fs.existsSync(args.proxy_config)
      ? JSON.parse(fs.readFileSync(args.proxy_config).toString())
      : {};
  const app = express();
  const cache = new Cache(args.cache_directory);
  const proxyMiddleware = createProxyMiddleware({
    target: DEFAULT_TARGET,
    changeOrigin: true,
    selfHandleResponse: true,
    onProxyRes: responseInterceptor(cache.interceptor),
    ...config,
  });
  app.use(cache.middleware, proxyMiddleware);
  return app;
}

function main(args: Args) {
  const app = createApp(args);
  console.error(`listen ${args.host}:${args.port}`);
  app.listen(args.port, args.host);
}

function mainCli() {
  const parser = new ArgumentParser();
  parser.add_argument("--host", { default: "0.0.0.0" });
  parser.add_argument("--port", { default: 9876, type: "int" });
  parser.add_argument("--cache-directory", { default: ".proxy_cache" });
  parser.add_argument("--proxy-config", { default: ".proxy.json" });
  main(parser.parse_args());
}

if (require.main === module) {
  mainCli();
}
