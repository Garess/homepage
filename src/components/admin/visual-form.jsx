import classNames from "classnames";
import { useEffect, useState } from "react";
import { BiSave, BiRefresh } from "react-icons/bi";

const blurOptions = [
  { value: "", label: "无" },
  { value: "sm", label: "轻微" },
  { value: "md", label: "适中" },
  { value: "lg", label: "明显" },
  { value: "xl", label: "强" },
  { value: "2xl", label: "很强" },
  { value: "3xl", label: "最强" },
];

const initialState = {
  title: "",
  theme: "",
  color: "",
  cardBlur: "",
  background: {
    image: "",
    opacity: "",
    blur: "",
    saturate: "",
    brightness: "",
  },
};

function toInputValue(value) {
  return value === undefined || value === null ? "" : String(value);
}

function addOptionalNumber(target, key, value) {
  if (value !== "") {
    target[key] = Number(value);
  }
}

function numberValue(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  return Number(value);
}

function blurIndex(value) {
  const index = blurOptions.findIndex((option) => option.value === value);
  return index >= 0 ? index : 0;
}

function blurLabel(value) {
  return blurOptions[blurIndex(value)].label;
}

function SliderField({ label, value, min, max, step = 1, unit = "", onChange }) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="flex items-center justify-between gap-3">
        <span>{label}</span>
        <span className="tabular-nums text-theme-600 dark:text-theme-300">
          {value}
          {unit}
        </span>
      </span>
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={step}
        className="w-full accent-theme-600"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function BlurSliderField({ label, value, onChange }) {
  const index = blurIndex(value);
  return (
    <label className="grid gap-2 text-sm">
      <span className="flex items-center justify-between gap-3">
        <span>{label}</span>
        <span className="text-theme-600 dark:text-theme-300">{blurLabel(value)}</span>
      </span>
      <input
        aria-label={label}
        type="range"
        min="0"
        max={blurOptions.length - 1}
        step="1"
        className="w-full accent-theme-600"
        value={index}
        onChange={(event) => onChange(blurOptions[Number(event.target.value)]?.value ?? "")}
      />
    </label>
  );
}

export default function VisualForm() {
  const [state, setState] = useState(initialState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let alive = true;
    fetch("/api/admin/config/visual")
      .then((res) => res.json())
      .then((data) => {
        if (!alive) return;
        setState((current) => ({
          ...current,
          ...data,
          background: {
            ...current.background,
            ...(data.background || {}),
          },
        }));
        setLoading(false);
      })
      .catch(() => {
        if (!alive) return;
        setError("加载视觉设置失败。");
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  function update(field, value) {
    setState((current) => ({ ...current, [field]: value }));
  }

  function updateBackground(field, value) {
    setState((current) => ({
      ...current,
      background: { ...current.background, [field]: value },
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const background = {
      image: state.background.image.trim(),
      blur: state.background.blur.trim(),
    };
    addOptionalNumber(background, "opacity", state.background.opacity);
    addOptionalNumber(background, "saturate", state.background.saturate);
    addOptionalNumber(background, "brightness", state.background.brightness);

    const payload = {
      title: state.title.trim(),
      theme: state.theme.trim(),
      color: state.color.trim(),
      cardBlur: state.cardBlur.trim(),
      background,
    };

    try {
      const response = await fetch("/api/admin/config/visual", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "无法保存视觉设置。");
      }
      setSuccess("已保存。");
      if (typeof window !== "undefined") {
        await fetch("/api/revalidate");
        window.location.reload();
      }
    } catch (err) {
      setError(err.message || "无法保存视觉设置。");
    } finally {
      setSaving(false);
    }
  }

  async function handleBackgroundUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/admin/config/visual/background", {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "背景图片上传失败。");
      }
      updateBackground("image", data.path);
      setSuccess("背景图片已上传，请保存后应用。");
    } catch (err) {
      setError(err.message || "背景图片上传失败。");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  if (loading) {
    return <div className="text-sm text-theme-600 dark:text-theme-300">正在加载视觉设置...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 rounded-md border border-theme-500/10 bg-white/70 p-4 shadow-sm dark:bg-white/5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span>标题</span>
          <input className="rounded-md border bg-transparent px-3 py-2" value={state.title} onChange={(e) => update("title", e.target.value)} />
        </label>
        <label className="grid gap-1 text-sm">
          <span>主题</span>
          <select className="rounded-md border bg-transparent px-3 py-2" value={state.theme} onChange={(e) => update("theme", e.target.value)}>
            <option value="">跟随系统</option>
            <option value="dark">深色</option>
            <option value="light">浅色</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span>配色</span>
          <input className="rounded-md border bg-transparent px-3 py-2" value={state.color} onChange={(e) => update("color", e.target.value)} />
        </label>
        <BlurSliderField label="组件模糊程度" value={state.cardBlur} onChange={(value) => update("cardBlur", value)} />
      </div>

      <div className="grid gap-4 rounded-md border border-theme-500/10 p-4 md:grid-cols-2">
        <div className="grid gap-3 md:col-span-2">
          <label className="grid gap-1 text-sm">
            <span>上传背景图片</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="rounded-md border bg-transparent px-3 py-2"
              disabled={uploading}
              onChange={handleBackgroundUpload}
            />
          </label>
          {state.background.image && (
            <div className="overflow-hidden rounded-md border border-theme-500/10">
              <img src={state.background.image} alt="当前背景预览" className="h-40 w-full object-cover" />
            </div>
          )}
        </div>
        <label className="grid gap-1 text-sm md:col-span-2">
          <span>背景图片路径</span>
          <input className="rounded-md border bg-transparent px-3 py-2" value={state.background.image} onChange={(e) => updateBackground("image", e.target.value)} />
        </label>
        <SliderField label="背景遮罩透明度" min="0" max="100" unit="%" value={numberValue(state.background.opacity, 0)} onChange={(value) => updateBackground("opacity", value)} />
        <BlurSliderField label="背景模糊程度" value={state.background.blur} onChange={(value) => updateBackground("blur", value)} />
        <SliderField label="背景饱和度" min="0" max="200" unit="%" value={numberValue(state.background.saturate, 100)} onChange={(value) => updateBackground("saturate", value)} />
        <SliderField label="背景亮度" min="50" max="150" unit="%" value={numberValue(state.background.brightness, 100)} onChange={(value) => updateBackground("brightness", value)} />
      </div>

      {error && <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-200">{error}</div>}
      {success && <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-200">{success}</div>}

      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={() => window.location.reload()} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
          <BiRefresh />
          重新加载
        </button>
        <button type="submit" disabled={saving} className={classNames("inline-flex items-center gap-2 rounded-md bg-theme-600 px-3 py-2 text-sm text-white", saving && "opacity-70")}>
          <BiSave />
          保存
        </button>
      </div>
    </form>
  );
}
