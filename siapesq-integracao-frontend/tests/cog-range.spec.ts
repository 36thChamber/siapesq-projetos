import { test, expect } from "@playwright/test";
import { createServer, type Server } from "node:http";
import { readFile } from "node:fs/promises";
import { build } from "esbuild";

let server: Server;
let origin: string;
let requests: Array<{ ranged: boolean; status: number }>;

test.beforeAll(async () => {
  const bytes = await readFile("tests/fixtures/range-cog.tif");
  const bundle = await build({ stdin: {
    contents: `import { loadCogRaster } from './utils/loadCogRaster';
      window.readCog = async url => {
        const raster = await loadCogRaster(url);
        const values = await raster.getValues({left:0,top:0,right:4,bottom:4,width:4,height:4});
        return {width:raster.width,height:raster.height,projection:raster.projection,
          values:values[0].flat().map(v=>Number.isNaN(v)?null:v)};
      };`, resolveDir: process.cwd(), loader: "ts",
  }, bundle: true, format: "iife", platform: "browser", write: false });
  server = createServer((req, res) => {
    if (req.url === "/bundle.js") { res.setHeader("Content-Type", "text/javascript"); res.end(bundle.outputFiles[0].contents); return; }
    if (!req.url?.endsWith(".tif")) { res.setHeader("Content-Type", "text/html"); res.end('<!doctype html><title>COG Range test</title><script src="/bundle.js"></script>'); return; }
    const match = /^bytes=(\d+)-(\d+)$/.exec(req.headers.range || "");
    if (!match || req.url === "/no-range.tif") {
      requests.push({ ranged: Boolean(match), status: 200 });
      res.writeHead(200, { "Content-Type": "image/tiff", "Content-Length": bytes.length }); res.end(bytes); return;
    }
    const start = Number(match[1]), end = Math.min(Number(match[2]), bytes.length - 1);
    requests.push({ ranged: true, status: 206 });
    res.writeHead(206, { "Content-Type": "image/tiff", "Accept-Ranges": "bytes", "Content-Range": `bytes ${start}-${end}/${bytes.length}`, "Content-Length": end - start + 1 });
    res.end(bytes.subarray(start, end + 1));
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server failed");
  origin = `http://127.0.0.1:${address.port}`;
});
test.beforeEach(() => { requests = []; });
test.afterAll(async () => { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); });

test("reads tiled COG windows by Range and preserves exact pixels and NoData", async ({ page }) => {
  await page.goto(origin);
  const result = await page.evaluate(async url => {
    const read = (window as unknown as { readCog: (url: string) => Promise<unknown> }).readCog;
    return read(url);
  }, origin + "/range.tif");
  expect(result).toEqual({ width: 4, height: 4, projection: 4326, values: [0, 1, 2, 3, 4, null, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] });
  expect(requests.length).toBeGreaterThan(0);
  expect(requests.every(request => request.ranged && request.status === 206)).toBe(true);
});

test("rejects a server that ignores Range instead of downloading the full TIFF", async ({ page }) => {
  await page.goto(origin);
  const rejected = await page.evaluate(async url => {
    try { await (window as unknown as { readCog: (url: string) => Promise<unknown> }).readCog(url); return false; }
    catch { return true; }
  }, origin + "/no-range.tif");
  expect(rejected).toBe(true);
  expect(requests.some(request => request.status === 200)).toBe(true);
});
