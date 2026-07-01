import { promises as fs } from "fs";
import path from "path";

import getRawBody from "raw-body";

import { adminAuthorized, unauthorized } from "utils/bangumi/auth";
import { CONF_DIR } from "utils/config/config";

const UPLOAD_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const BACKGROUND_ASSET_PREFIX = "/api/assets/backgrounds";

function publicDir() {
  return process.env.HOMEPAGE_PUBLIC_DIR || path.join(path.dirname(CONF_DIR), "public");
}

function normalizeContentType(value = "") {
  return value.split(";")[0].trim().toLowerCase();
}

async function readUploadBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === "string") return Buffer.from(req.body);
  return getRawBody(req, { limit: MAX_UPLOAD_BYTES });
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (!(await adminAuthorized(req, res))) return unauthorized(res);

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  const contentType = normalizeContentType(req.headers["content-type"]);
  const extension = UPLOAD_TYPES[contentType];
  if (!extension) {
    return res.status(400).json({ error: "仅支持 JPG、PNG 或 WebP 图片。" });
  }

  try {
    const body = await readUploadBody(req);
    if (!body.length) {
      return res.status(400).json({ error: "上传图片不能为空。" });
    }
    if (body.length > MAX_UPLOAD_BYTES) {
      return res.status(400).json({ error: "上传图片不能超过 8MB。" });
    }

    const backgroundsDir = path.join(publicDir(), "backgrounds");
    await fs.mkdir(backgroundsDir, { recursive: true });
    const fileName = `admin-background.${extension}`;
    await fs.writeFile(path.join(backgroundsDir, fileName), body);

    return res.status(200).json({ path: `${BACKGROUND_ASSET_PREFIX}/${fileName}` });
  } catch (error) {
    if (error?.type === "entity.too.large") {
      return res.status(400).json({ error: "上传图片不能超过 8MB。" });
    }
    return res.status(500).json({ error: "背景图片保存失败。" });
  }
}
