import { promises as fs } from "fs";
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "fs";
import { join } from "path";
import path from "path";

import yaml from "js-yaml";
import cache from "memory-cache";

const cacheKey = "homepageEnvironmentVariables";
const homepageVarPrefix = "HOMEPAGE_VAR_";
const homepageFilePrefix = "HOMEPAGE_FILE_";

export const CONF_DIR = process.env.HOMEPAGE_CONFIG_DIR
  ? process.env.HOMEPAGE_CONFIG_DIR
  : join(process.cwd(), "config");

const ADMIN_EDITABLE_CONFIG_FILES = new Set(["settings.yaml", "services.yaml", "bookmarks.yaml"]);
const ADMIN_VISUAL_SETTINGS_KEYS = ["background", "cardBlur", "theme", "color", "title"];

function configPath(fileName) {
  if (!ADMIN_EDITABLE_CONFIG_FILES.has(fileName)) {
    throw new Error(`Unsupported admin config file '${fileName}'`);
  }
  return join(CONF_DIR, fileName);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cloneConfig(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => cloneConfig(entry));
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, cloneConfig(entry)]));
  }
  return value;
}

function mergeSettingsObjects(current, patch) {
  const merged = cloneConfig(current ?? {});

  for (const [key, value] of Object.entries(patch ?? {})) {
    if (isPlainObject(value) && isPlainObject(merged[key])) {
      merged[key] = mergeSettingsObjects(merged[key], value);
    } else {
      merged[key] = cloneConfig(value);
    }
  }

  return merged;
}

function normalizeSettings(settings) {
  const source = cloneConfig(settings ?? {});
  if (Array.isArray(source.layout)) {
    const layoutItems = source.layout;
    source.layout = {};
    layoutItems.forEach((item) => {
      const name = Object.keys(item)[0];
      source.layout[name] = item[name];
    });
  }
  return source;
}

export default function checkAndCopyConfig(config) {
  // Ensure config directory exists
  if (!existsSync(CONF_DIR)) {
    try {
      mkdirSync(CONF_DIR, { recursive: true });
    } catch (e) {
      console.warn(`Could not create config directory ${CONF_DIR}: ${e.message}`);
      return false;
    }
  }

  const configYaml = join(CONF_DIR, config);

  // If the config file doesn't exist, try to copy the skeleton
  if (!existsSync(configYaml)) {
    const configSkeleton = join(process.cwd(), "src", "skeleton", config);
    try {
      copyFileSync(configSkeleton, configYaml);
      console.info("%s was copied to the config folder", config);
    } catch (err) {
      console.error("❌ Failed to initialize required config: %s", configYaml);
      console.error("Reason: %s", err.message);
      console.error("Hint: Make /app/config writable or manually place the config file.");
      process.exit(1);
    }

    return true;
  }

  try {
    yaml.load(readFileSync(configYaml, "utf8"));
    return true;
  } catch (e) {
    return { ...e, config };
  }
}

export function readYamlConfig(fileName) {
  checkAndCopyConfig(fileName);
  const rawFileContents = readFileSync(configPath(fileName), "utf8");
  const parsed = yaml.load(substituteEnvironmentVars(rawFileContents));
  return parsed ?? (fileName === "settings.yaml" ? {} : []);
}

export async function atomicWriteYamlConfig(fileName, data) {
  const filePath = configPath(fileName);
  await fs.mkdir(CONF_DIR, { recursive: true });
  const temporaryPath = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`,
  );

  try {
    const dumped = `${yaml.dump(data, { lineWidth: -1, noRefs: true })}\n`;
    await fs.writeFile(temporaryPath, dumped, "utf8");
    await fs.rename(temporaryPath, filePath);
  } catch (error) {
    await fs.rm(temporaryPath, { force: true });
    throw error;
  }
}

export function normalizeSettingsForAdmin(settings) {
  const source = normalizeSettings(settings);
  return Object.fromEntries(
    ADMIN_VISUAL_SETTINGS_KEYS.filter((key) => Object.hasOwn(source, key)).map((key) => [key, cloneConfig(source[key])]),
  );
}

export function mergeSettingsPatch(current, patch) {
  return mergeSettingsObjects(normalizeSettings(current), patch);
}

export async function writeSettingsConfig(patch, validate = () => true) {
  const current = readYamlConfig("settings.yaml");
  const next = mergeSettingsPatch(current, patch);
  const validationResult = await validate(next);
  if (validationResult === false) {
    throw new Error("settings validation failed");
  }
  await atomicWriteYamlConfig("settings.yaml", next);
  return next;
}

function getCachedEnvironmentVars() {
  let cachedVars = cache.get(cacheKey);
  if (!cachedVars) {
    // initialize cache
    cachedVars = Object.entries(process.env).filter(
      ([key]) => key.includes(homepageVarPrefix) || key.includes(homepageFilePrefix),
    );
    cache.put(cacheKey, cachedVars);
  }
  return cachedVars;
}

export function substituteEnvironmentVars(str) {
  let result = str;
  if (result.includes("{{")) {
    // crude check if we have vars to replace
    const cachedVars = getCachedEnvironmentVars();
    cachedVars.forEach(([key, value]) => {
      if (key.startsWith(homepageVarPrefix)) {
        result = result.replaceAll(`{{${key}}}`, value);
      } else if (key.startsWith(homepageFilePrefix)) {
        const filename = value;
        const fileContents = readFileSync(filename, "utf8");
        result = result.replaceAll(`{{${key}}}`, fileContents);
      }
    });
  }
  return result;
}

export function getSettings() {
  checkAndCopyConfig("settings.yaml");

  return normalizeSettings(readYamlConfig("settings.yaml"));
}
