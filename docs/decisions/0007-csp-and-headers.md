# ADR-0007 — Content-Security-Policy and security headers

**Status:** Accepted (with a tracked follow-up)
**Date:** 16 November 2026

## Context

The platform serves controlled clinical documents and staff PII to government browsers, some of
them shared machines on constrained networks. Headers are the cheapest defence-in-depth available
because they cost no JavaScript.

The original configuration shipped a CSP with `script-src 'self' 'unsafe-inline'`, an unrestricted
`img-src https:`, and no `object-src`, `base-uri`, `form-action` or `frame-ancestors` directives.
It also leaned on `X-Frame-Options` alone for framing protection.

Two constraints shape the decision:

1. Next.js injects its own inline bootstrap scripts (React flight data) into the HTML. A CSP that
   simply drops `'unsafe-inline'` breaks the application.
2. The theme boot script must run *before first paint* to avoid a flash of the wrong theme, so it
   cannot be an async/deferred external file without a flash.

## Decision

Ship a hardened policy that keeps `'unsafe-inline'` **only** where Next requires it:

```
default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none';
form-action 'self'; img-src 'self' data: blob: https://images.unsplash.com <S3_ENDPOINT origin>;
script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self' data:;
connect-src 'self' <S3_ENDPOINT origin>; media-src 'self' <S3_ENDPOINT origin>;
manifest-src 'self'; worker-src 'self' blob:; upgrade-insecure-requests
```

Plus `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-origin`,
`Permissions-Policy` denying camera, microphone, geolocation, payment, USB and cohort interest, HSTS
with preload, `nosniff`, and `Referrer-Policy: origin-when-cross-origin`. `img-src` is limited to
the hosts that `images.remotePatterns` already allows.

Fonts are self-hosted (`src/assets/fonts`, SIL OFL) so `font-src` needs no third party and builds
do not depend on `fonts.googleapis.com`.

## Consequences

* Markup injection cannot load plugins, rewrite the base URL, submit forms off-origin, or be framed.
* Data exfiltration is limited to `'self'` and the storage endpoint (ADR‑0015: any S3 bucket, read from `S3_ENDPOINT` at build time).
* `script-src` still permits inline script, so this is **not** equivalent to a nonce-based policy:
  an HTML-injection bug would still execute script. Every user-supplied string is therefore
  rendered as text (React default) and `dangerouslySetInnerHTML` is limited to the one static theme
  boot script.
* Follow-up (tracked, not blocking): migrate to per-request nonces — generate the nonce in
  `src/proxy.ts`, read it with `headers()` in the root layout, and drop `'unsafe-inline'`. This
  forces dynamic rendering on every route, which is why it is a separate decision with its own
  performance budget, especially for the marketing pages.
