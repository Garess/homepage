import { promises as fs } from "fs";
import path from "path";

import yaml from "js-yaml";

import { adminAuthorized, unauthorized } from "utils/bangumi/auth";
import { CONF_DIR } from "utils/config/config";
import { cleanServiceGroups, servicesFromConfig } from "utils/config/service-helpers";

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validateService(service) {
  if (!isPlainObject(service) || typeof service.name !== "string" || !service.name.trim()) {
    throw new Error("service.name must be a non-empty string");
  }
  return {
    ...service,
    name: service.name.trim(),
  };
}

function validateServiceGroup(group) {
  if (!isPlainObject(group) || typeof group.name !== "string" || !group.name.trim()) {
    throw new Error("group.name must be a non-empty string");
  }
  if (!Array.isArray(group.services) || !Array.isArray(group.groups)) {
    throw new Error("each group must include services and groups arrays");
  }

  return {
    name: group.name.trim(),
    services: group.services.map((service) => validateService(service)),
    groups: group.groups.map((child) => validateServiceGroup(child)),
  };
}

function normalizeServicesPayload(body) {
  if (!Array.isArray(body)) {
    throw new Error("services payload must be an array");
  }
  return body.map((group) => validateServiceGroup(group));
}

function serviceRecord(service) {
  const record = {};
  Object.entries(service).forEach(([key, value]) => {
    if (key === "name" || key === "type" || key === "groups") return;
    record[key] = value;
  });
  return record;
}

function serializeServiceGroup(group) {
  const entries = [];

  for (const service of group.services || []) {
    entries.push({ [service.name]: serviceRecord(service) });
  }

  for (const child of group.groups || []) {
    entries.push({ [child.name]: serializeServiceGroup(child) });
  }

  return entries;
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
      const groups = cleanServiceGroups(await servicesFromConfig());
      return res.status(200).json(groups);
    } catch (error) {
      return res.status(500).json({ error: "services_load_failed" });
    }
  }

  if (req.method === "PUT") {
    try {
      const groups = normalizeServicesPayload(req.body || []);
      const content = groups.map((group) => ({ [group.name]: serializeServiceGroup(group) }));
      await atomicWriteYamlConfig("services.yaml", content);
      return res.status(200).json(groups);
    } catch (error) {
      return res.status(400).json({ error: error.message || "invalid_services_payload" });
    }
  }

  res.setHeader("Allow", "GET, PUT");
  return res.status(405).end("Method Not Allowed");
}
