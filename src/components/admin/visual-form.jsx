import classNames from "classnames";
import { useEffect, useState } from "react";
import { BiSave, BiRefresh } from "react-icons/bi";

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

export default function VisualForm() {
  const [state, setState] = useState(initialState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
        setError("Failed to load visual settings.");
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
        throw new Error(data.error || "Unable to save visual settings.");
      }
      setSuccess("Saved.");
      if (typeof window !== "undefined") {
        await fetch("/api/revalidate");
        window.location.reload();
      }
    } catch (err) {
      setError(err.message || "Unable to save visual settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-theme-600 dark:text-theme-300">Loading visual settings...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 rounded-md border border-theme-500/10 bg-white/70 p-4 shadow-sm dark:bg-white/5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span>Title</span>
          <input className="rounded-md border bg-transparent px-3 py-2" value={state.title} onChange={(e) => update("title", e.target.value)} />
        </label>
        <label className="grid gap-1 text-sm">
          <span>Theme</span>
          <select className="rounded-md border bg-transparent px-3 py-2" value={state.theme} onChange={(e) => update("theme", e.target.value)}>
            <option value="">System</option>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span>Color</span>
          <input className="rounded-md border bg-transparent px-3 py-2" value={state.color} onChange={(e) => update("color", e.target.value)} />
        </label>
        <label className="grid gap-1 text-sm">
          <span>Card Blur</span>
          <input className="rounded-md border bg-transparent px-3 py-2" value={state.cardBlur} onChange={(e) => update("cardBlur", e.target.value)} />
        </label>
      </div>

      <div className="grid gap-4 rounded-md border border-theme-500/10 p-4 md:grid-cols-2">
        <label className="grid gap-1 text-sm md:col-span-2">
          <span>Background Image</span>
          <input className="rounded-md border bg-transparent px-3 py-2" value={state.background.image} onChange={(e) => updateBackground("image", e.target.value)} />
        </label>
        <label className="grid gap-1 text-sm">
          <span>Background Opacity</span>
          <input type="number" min="0" max="100" className="rounded-md border bg-transparent px-3 py-2" value={toInputValue(state.background.opacity)} onChange={(e) => updateBackground("opacity", e.target.value)} />
        </label>
        <label className="grid gap-1 text-sm">
          <span>Background Blur</span>
          <input className="rounded-md border bg-transparent px-3 py-2" value={state.background.blur} onChange={(e) => updateBackground("blur", e.target.value)} />
        </label>
        <label className="grid gap-1 text-sm">
          <span>Background Saturate</span>
          <input type="number" className="rounded-md border bg-transparent px-3 py-2" value={toInputValue(state.background.saturate)} onChange={(e) => updateBackground("saturate", e.target.value)} />
        </label>
        <label className="grid gap-1 text-sm">
          <span>Background Brightness</span>
          <input type="number" className="rounded-md border bg-transparent px-3 py-2" value={toInputValue(state.background.brightness)} onChange={(e) => updateBackground("brightness", e.target.value)} />
        </label>
      </div>

      {error && <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-200">{error}</div>}
      {success && <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-200">{success}</div>}

      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={() => window.location.reload()} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
          <BiRefresh />
          Reload
        </button>
        <button type="submit" disabled={saving} className={classNames("inline-flex items-center gap-2 rounded-md bg-theme-600 px-3 py-2 text-sm text-white", saving && "opacity-70")}>
          <BiSave />
          Save
        </button>
      </div>
    </form>
  );
}
