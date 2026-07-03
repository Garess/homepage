import classNames from "classnames";
import { useEffect, useState } from "react";
import { BiRefresh, BiSave } from "react-icons/bi";

const weekdays = [
  { value: "", label: "未设置" },
  { value: "1", label: "周一" },
  { value: "2", label: "周二" },
  { value: "3", label: "周三" },
  { value: "4", label: "周四" },
  { value: "5", label: "周五" },
  { value: "6", label: "周六" },
  { value: "7", label: "周日" },
];

function toText(value) {
  return value === undefined || value === null ? "" : String(value);
}

function showToState(show) {
  return {
    key: toText(show.key),
    title: toText(show.title),
    hidden: Boolean(show.hidden),
    weekday: toText(show.weekday),
    time: toText(show.time),
    firstAirDate: toText(show.firstAirDate),
    firstEpisode: toText(show.firstEpisode || 1),
    timezone: toText(show.timezone || "Asia/Shanghai"),
    hasSchedule: Boolean(show.hasSchedule),
    autobangumiNames: Array.isArray(show.autobangumiNames) ? show.autobangumiNames : [],
  };
}

function missingToState(item) {
  const title = toText(item.title || item.autobangumiName);
  return {
    draftId: toText(item.autobangumiName || item.title),
    title,
    hidden: false,
    weekday: "",
    time: "",
    firstAirDate: "",
    firstEpisode: "1",
    timezone: "Asia/Shanghai",
    hasSchedule: false,
    autobangumiNames: [toText(item.autobangumiName || title)].filter(Boolean),
  };
}

function mergeShows(data) {
  return [
    ...(Array.isArray(data?.configured) ? data.configured : []),
    ...(Array.isArray(data?.hidden) ? data.hidden : []),
  ].map(showToState);
}

function splitShows(shows) {
  const visible = [];
  const hidden = [];
  shows.forEach((show) => (show.hidden ? hidden : visible).push(show));
  return { visible, hidden };
}

function savePayload(show) {
  const payload = {
    hidden: show.hidden,
    timezone: show.timezone || "Asia/Shanghai",
  };
  if (show.weekday) payload.weekday = Number(show.weekday);
  if (show.time) payload.time = show.time;
  if (show.firstAirDate) payload.firstAirDate = show.firstAirDate;
  if (show.firstEpisode !== "") payload.firstEpisode = Number(show.firstEpisode);
  return payload;
}

function ShowEditor({ show, onChange, onSave, saving }) {
  const editorId = show.key || show.draftId;
  const aliasText = show.autobangumiNames.filter((name) => name && name !== show.title).join(" / ");

  return (
    <div className="grid gap-3 rounded-md border border-theme-500/10 bg-white/70 p-4 shadow-sm dark:bg-white/5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="truncate text-base font-semibold">{show.title}</div>
          {(aliasText || show.key) && <div className="mt-1 text-xs text-theme-500 dark:text-theme-300">{aliasText || show.key}</div>}
        </div>
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            aria-label={`隐藏 ${show.title}`}
            type="checkbox"
            checked={show.hidden}
            onChange={(event) => onChange(editorId, { hidden: event.target.checked })}
          />
          隐藏
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <label className="grid gap-1 text-sm">
          <span>星期</span>
          <select
            aria-label={`星期 ${show.title}`}
            className="rounded-md border bg-transparent px-3 py-2"
            value={show.weekday}
            onChange={(event) => onChange(editorId, { weekday: event.target.value })}
          >
            {weekdays.map((weekday) => (
              <option key={weekday.value || "unset"} value={weekday.value}>
                {weekday.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span>时间</span>
          <input
            aria-label={`时间 ${show.title}`}
            type="time"
            className="rounded-md border bg-transparent px-3 py-2"
            value={show.time}
            onChange={(event) => onChange(editorId, { time: event.target.value })}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>首播日期</span>
          <input
            aria-label={`首播日期 ${show.title}`}
            type="date"
            className="rounded-md border bg-transparent px-3 py-2"
            value={show.firstAirDate}
            onChange={(event) => onChange(editorId, { firstAirDate: event.target.value })}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>首集</span>
          <input
            aria-label={`首集 ${show.title}`}
            type="number"
            min="0"
            className="rounded-md border bg-transparent px-3 py-2"
            value={show.firstEpisode}
            onChange={(event) => onChange(editorId, { firstEpisode: event.target.value })}
          />
        </label>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={saving}
          onClick={() => onSave(show)}
          className={classNames("inline-flex items-center gap-2 rounded-md bg-theme-600 px-3 py-2 text-sm text-white", saving && "opacity-70")}
        >
          <BiSave />
          保存 {show.title}
        </button>
      </div>
    </div>
  );
}

export default function BangumiManager() {
  const [shows, setShows] = useState([]);
  const [missing, setMissing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/bangumi/manage");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "加载追番列表失败。");
      setShows(mergeShows(data));
      setMissing(Array.isArray(data.missing) ? data.missing.map(missingToState) : []);
    } catch (err) {
      setError(err.message || "加载追番列表失败。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function updateShow(key, patch) {
    setShows((current) => current.map((show) => (show.key === key ? { ...show, ...patch } : show)));
  }

  function updateMissing(draftId, patch) {
    setMissing((current) => current.map((show) => (show.draftId === draftId ? { ...show, ...patch } : show)));
  }

  function validateSchedule(show) {
    if (show.hidden) return true;
    if (show.weekday && show.time && show.firstAirDate) return true;
    setError(`请为 ${show.title} 填写星期、时间和首播日期，或将它设为隐藏。`);
    return false;
  }

  async function saveShow(show) {
    setSavingKey(show.key);
    setError("");
    setSuccess("");
    const payload = savePayload(show);

    try {
      const response = await fetch(`/api/admin/bangumi/shows/${encodeURIComponent(show.key)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "保存追番设置失败。");
      await fetch("/api/revalidate");
      setSuccess(`已保存 ${show.title}`);
      await load();
    } catch (err) {
      setError(err.message || "保存追番设置失败。");
    } finally {
      setSavingKey("");
    }
  }

  async function saveMissing(show) {
    if (!validateSchedule(show)) return;
    setSavingKey(show.draftId);
    setError("");
    setSuccess("");
    const payload = {
      title: show.title,
      autobangumiNames: show.autobangumiNames.length ? show.autobangumiNames : [show.title],
      ...savePayload(show),
    };

    try {
      const response = await fetch("/api/admin/bangumi/shows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "保存追番设置失败。");
      await fetch("/api/revalidate");
      setSuccess(`已保存 ${show.title}`);
      await load();
    } catch (err) {
      setError(err.message || "保存追番设置失败。");
    } finally {
      setSavingKey("");
    }
  }

  if (loading) {
    return <div className="text-sm text-theme-600 dark:text-theme-300">正在加载追番列表...</div>;
  }

  const { visible, hidden } = splitShows(shows);

  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">追番管理</h2>
          <p className="mt-1 text-sm text-theme-600 dark:text-theme-300">编辑追番是否隐藏、播出星期、播出时间和首播日期。</p>
        </div>
        <button type="button" onClick={load} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
          <BiRefresh />
          重新加载
        </button>
      </div>

      {error && <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-200">{error}</div>}
      {success && <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-200">{success}</div>}

      {missing.length > 0 && (
        <section className="grid gap-3">
          <h3 className="text-sm font-semibold text-theme-600 dark:text-theme-300">缺少时间</h3>
          {missing.map((show) => (
            <ShowEditor key={show.draftId} show={show} onChange={updateMissing} onSave={saveMissing} saving={savingKey === show.draftId} />
          ))}
        </section>
      )}

      <section className="grid gap-3">
        <h3 className="text-sm font-semibold text-theme-600 dark:text-theme-300">显示中</h3>
        {visible.map((show) => (
          <ShowEditor key={show.key} show={show} onChange={updateShow} onSave={saveShow} saving={savingKey === show.key} />
        ))}
      </section>

      <section className="grid gap-3">
        <h3 className="text-sm font-semibold text-theme-600 dark:text-theme-300">已隐藏</h3>
        {hidden.map((show) => (
          <ShowEditor key={show.key} show={show} onChange={updateShow} onSave={saveShow} saving={savingKey === show.key} />
        ))}
      </section>
    </div>
  );
}
