import { getServerSession } from "next-auth/next";

import { authOptions } from "pages/api/auth/[...nextauth]";

function headerValue(req, name) {
  const headers = req?.headers || {};
  return headers[name] || headers[name.toLowerCase()] || headers[name.toUpperCase()] || "";
}

function bearerToken(req) {
  const authorization = String(headerValue(req, "authorization") || "");
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : "";
}

export function adminTokenAuthorized(req) {
  const expected = process.env.HOMEPAGE_BANGUMI_ADMIN_TOKEN;
  if (!expected) return false;
  return (
    bearerToken(req) === expected ||
    String(headerValue(req, "x-homepage-bangumi-admin-token") || "") === expected
  );
}

export function webhookAuthorized(req) {
  const expected = process.env.HOMEPAGE_BANGUMI_WEBHOOK_TOKEN;
  if (!expected) return false;
  return (
    String(headerValue(req, "x-homepage-bangumi-token") || "") === expected ||
    String(headerValue(req, "x-homelab-webhook-token") || "") === expected
  );
}

export async function adminAuthorized(req, res) {
  if (adminTokenAuthorized(req)) return true;
  if (!process.env.HOMEPAGE_AUTH_ENABLED) return false;
  return Boolean(await getServerSession(req, res, authOptions));
}

export function unauthorized(res) {
  return res.status(401).json({ error: "Unauthorized" });
}
