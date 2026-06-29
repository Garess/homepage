import { promises as fs } from "fs";
import path from "path";

import yaml from "js-yaml";

import { adminAuthorized, unauthorized } from "utils/bangumi/auth";
import { bookmarksResponse } from "utils/config/api-response";
import { CONF_DIR } from "utils/config/config";

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validateBookmark(bookmark) {
  if (!isPlainObject(bookmark) || typeof bookmark.name !== "string" || !bookmark.name.trim()) {
    throw new Error("bookmark.name must be a non-empty string");
  }
  return {
    ...bookmark,
    name: bookmark.name.trim(),
  };
}

function validateBookmarkGroup(group) {
  if (!isPlainObject(group) || typeof group.name !== "string" || !group.name.trim()) {
    throw new Error("group.name must be a non-empty string");
  }
  if (!Array.isArray(group.bookmarks)) {
    throw new Error("each group must include a bookmarks array");
  }
  return {
    name: group.name.trim(),
    bookmarks: group.bookmarks.map((bookmark) => validateBookmark(bookmark)),
  };
}

function normalizeBookmarksPayload(body) {
  if (!Array.isArray(body)) {
    throw new Error("bookmarks payload must be an array");
  }
  return body.map((group) => validateBookmarkGroup(group));
}

function bookmarkRecord(bookmark) {
  const record = {};
  Object.entries(bookmark).forEach(([key, value]) => {
    if (key === "name") return;
    record[key] = value;
  });
  return record;
}

function serializeBookmarkGroup(group) {
  return group.bookmarks.map((bookmark) => ({ [bookmark.name]: [bookmarkRecord(bookmark)] }));
}

async function atomicWriteYamlConfig(fileName, data) {
  await fs.mkdir(CONF_DIR, { recursive: true });
  const filePath = path.join(CONF_DIR, fileName);
  const tempPath = path.join(
    CONF_DIR,
    `.${fileName}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`,
  );

  try {
    await fs.writeFile(tempPath, yaml.dump(data, { lineWidth: -1, noRefs: true }), "utf8");
    await fs.rename(tempPath, filePath);
  } catch (error) {
    await fs.rm(tempPath, { force: true }).catch(() => {});
    throw error;
  }
}

export default async function handler(req, res) {
  if (!(await adminAuthorized(req, res))) return unauthorized(res);

  if (req.method === "GET") {
    try {
      return res.status(200).json(await bookmarksResponse());
    } catch (error) {
      return res.status(500).json({ error: "bookmarks_load_failed" });
    }
  }

  if (req.method === "PUT") {
    try {
      const groups = normalizeBookmarksPayload(req.body || []);
      const content = groups.map((group) => ({ [group.name]: serializeBookmarkGroup(group) }));
      await atomicWriteYamlConfig("bookmarks.yaml", content);
      return res.status(200).json(groups);
    } catch (error) {
      return res.status(400).json({ error: error.message || "invalid_bookmarks_payload" });
    }
  }

  res.setHeader("Allow", "GET, PUT");
  return res.status(405).end("Method Not Allowed");
}
