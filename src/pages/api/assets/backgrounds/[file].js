import { promises as fs } from "fs";
import path from "path";

import { CONF_DIR } from "utils/config/config";

const CONTENT_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function publicDir() {
  return process.env.HOMEPAGE_PUBLIC_DIR || path.join(path.dirname(CONF_DIR), "public");
}

function requestedFile(queryFile) {
  const value = Array.isArray(queryFile) ? queryFile[0] : queryFile;
  return typeof value === "string" ? value : "";
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).end("Method Not Allowed");
  }

  const fileName = requestedFile(req.query?.file);
  const extension = path.extname(fileName).toLowerCase();
  const contentType = CONTENT_TYPES[extension];

  if (!fileName || path.basename(fileName) !== fileName || !contentType) {
    return res.status(404).end("Not Found");
  }

  try {
    const filePath = path.join(publicDir(), "backgrounds", fileName);
    const body = await fs.readFile(filePath);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "no-store, max-age=0");
    if (req.method === "HEAD") return res.status(200).end();
    return res.status(200).send(body);
  } catch (error) {
    return res.status(404).end("Not Found");
  }
}
