export function contentSecurityPolicy(nonce: string, development: boolean, upgradeInsecure = false): string {
  if (!/^[A-Za-z0-9+/]{20,}={0,2}$/.test(nonce)) throw new Error("Invalid CSP nonce");
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}`,
    // Leaflet and the application create element styles dynamically.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https: http:",
    "connect-src 'self' https://api.gbif.org https://nominatim.openstreetmap.org" + (development ? " ws: wss:" : ""),
    "worker-src 'self' blob:", "object-src 'none'", "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'",
    ...(upgradeInsecure ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}
