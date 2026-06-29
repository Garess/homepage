import { promises as fs } from "fs";
import path from "path";

import yaml from "js-yaml";

import { adminAuthorized, unauthorized } from "utils/bangumi/auth";
import { CONF_DIR } from "utils/config/config";

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function readSettings() {
  try {
    const contents = await fs.readFile(path.join(CONF_DIR, "settings.yaml"), "utf8");
    return yaml.load(contents) ?? {};
  } catch (error) {
    return {};
  }
}

function normalizeBackground(background) {
  if (typeof background === "string") {
    return { image: background };
  }
  if (isPlainObject(background)) {
    return {
      image: background.image ?? "",
      opacity: background.opacity,
      blur: background.blur ?? "",
      saturate: background.saturate,
      brightness: background.brightness,
    };
  }
  return { image: "", opacity: undefined, blur: "", saturate: undefined, brightness: undefined };
}

function normalizeVisualSettings(settings) {
  return {
    title: settings.title ?? "",
    theme: settings.theme ?? "",
    color: settings.color ?? "",
    cardBlur: settings.cardBlur ?? "",
    background: normalizeBackground(settings.background),
  };
}

function toNumber(value, fieldName) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  throw new Error(`${fieldName} must be a number`);
}

function normalizeVisualPatch(body) {
  if (!isPlainObject(body)) {
    throw new Error("visual payload must be an object");
  }

  const patch = {};
  for (const field of ["title", "theme", "color", "cardBlur"]) {
    if (body[field] === undefined) continue;
    if (typeof body[field] !== "string") {
      throw new Error(`${field} must be a string`);
    }
    patch[field] = body[field];
  }

  if (body.background !== undefined) {
    if (!isPlainObject(body.background)) {
      throw new Error("background must be an object");
    }
    patch.background = {};
    if (body.background.image !== undefined) {
      if (typeof body.background.image !== "string") throw new Error("background.image must be a string");
      patch.background.image = body.background.image;
    }
    if (body.background.opacity !== undefined) patch.background.opacity = toNumber(body.background.opacity, "opacity");
    if (body.background.blur !== undefined) {
      if (typeof body.background.blur !== "string") throw new Error("background.blur must be a string");
      patch.background.blur = body.background.blur;
    }
    if (body.background.saturate !== undefined) {
      patch.background.saturate = toNumber(body.background.saturate, "saturate");
    }
    if (body.background.brightness !== undefined) {
      patch.background.brightness = toNumber(body.background.brightness, "brightness");
    }
  }

  return patch;
}

function mergeVisualSettings(current, patch) {
  const merged = { ...current };

  for (const field of ["title", "theme", "color", "cardBlur"]) {
    if (patch[field] !== undefined) merged[field] = patch[field];
  }

  if (patch.background !== undefined) {
    const currentBackground = normalizeBackground(current.background);
    merged.background = { ...currentBackground, ...patch.background };
  } else if (current.background !== undefined) {
    merged.background = current.background;
  }

  return merged;
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
    const settings = await readSettings();
    return res.status(200).json(normalizeVisualSettings(settings));
  }

  if (req.method === "PUT") {
    try {
      const current = await readSettings();
      const patch = normalizeVisualPatch(req.body || {});
      const merged = mergeVisualSettings(current, patch);
      await atomicWriteYamlConfig("settings.yaml", merged);
      return res.status(200).json(normalizeVisualSettings(merged));
    } catch (error) {
      return res.status(400).json({ error: error.message || "invalid_visual_payload" });
    }
  }

  res.setHeader("Allow", "GET, PUT");
  return res.status(405).end("Method Not Allowed");
}
