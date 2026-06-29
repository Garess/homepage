import classNames from "classnames";
import { useEffect, useMemo, useState } from "react";
import { BiPlus, BiSave, BiTrash } from "react-icons/bi";

function createService() {
  return { name: "", href: "", icon: "", description: "", widgets: [{ type: "", url: "" }] };
}

function createBookmark() {
  return { name: "", href: "", abbr: "", icon: "", description: "" };
}

function createGroup(kind) {
  return kind === "bookmarks"
    ? { name: "", bookmarks: [createBookmark()] }
    : { name: "", services: [createService()], groups: [] };
}

function normalizeGroup(kind, group) {
  if (kind === "bookmarks") {
    return { name: group.name ?? "", bookmarks: group.bookmarks ?? [] };
  }

  return {
    name: group.name ?? "",
    services: (group.services ?? []).map((service) => ({
      ...service,
      widgets: service.widgets ?? (service.widget ? [service.widget] : [{ type: "", url: "" }]),
    })),
    groups: group.groups ?? [],
  };
}

function updateService(group, serviceIndex, patch) {
  const next = [...group.services];
  next[serviceIndex] = { ...next[serviceIndex], ...patch };
  return next;
}

function updateServiceWidget(group, service, serviceIndex, field, value) {
  const widgets = service.widgets?.length ? [...service.widgets] : [{ type: "", url: "" }];
  widgets[0] = { ...widgets[0], [field]: value };
  return updateService(group, serviceIndex, { widgets });
}

export default function GroupsForm({ kind, endpoint, title, emptyLabel }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(endpoint)
      .then((res) => res.json())
      .then((data) => {
        if (!alive) return;
        setGroups((Array.isArray(data) ? data : []).map((group) => normalizeGroup(kind, group)));
        setLoading(false);
      })
      .catch(() => {
        if (!alive) return;
        setError(`Failed to load ${title.toLowerCase()}.`);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [endpoint, kind, title]);

  const canSave = useMemo(() => groups.length > 0, [groups]);

  function updateGroup(index, patch) {
    setGroups((current) => current.map((group, i) => (i === index ? { ...group, ...patch } : group)));
  }

  function addGroup() {
    setGroups((current) => [...current, createGroup(kind)]);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(groups),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Unable to save ${title.toLowerCase()}.`);
      }
      await fetch("/api/revalidate");
      window.location.reload();
    } catch (err) {
      setError(err.message || `Unable to save ${title.toLowerCase()}.`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-theme-600 dark:text-theme-300">Loading {title.toLowerCase()}...</div>;
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{title}</h2>
        <button type="button" onClick={addGroup} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
          <BiPlus />
          Add group
        </button>
      </div>

      {groups.length === 0 && <div className="rounded-md border border-dashed p-6 text-sm text-theme-600">{emptyLabel}</div>}

      <div className="grid gap-4">
        {groups.map((group, groupIndex) => (
          <section key={groupIndex} className="grid gap-4 rounded-md border border-theme-500/10 bg-white/70 p-4 shadow-sm dark:bg-white/5">
            <div className="flex items-center gap-3">
              <input
                className="min-w-0 flex-1 rounded-md border bg-transparent px-3 py-2 text-sm"
                value={group.name}
                placeholder="Group name"
                onChange={(e) => updateGroup(groupIndex, { name: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setGroups((current) => current.filter((_, i) => i !== groupIndex))}
                className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <BiTrash />
                Delete
              </button>
            </div>

            {kind === "bookmarks" ? (
              <div className="grid gap-3">
                {group.bookmarks.map((bookmark, bookmarkIndex) => (
                  <div key={bookmarkIndex} className="grid gap-3 rounded-md border border-theme-500/10 p-3 md:grid-cols-2">
                    <input
                      className="rounded-md border bg-transparent px-3 py-2 text-sm"
                      placeholder="Name"
                      value={bookmark.name || ""}
                      onChange={(e) => {
                        const next = [...group.bookmarks];
                        next[bookmarkIndex] = { ...bookmark, name: e.target.value };
                        updateGroup(groupIndex, { bookmarks: next });
                      }}
                    />
                    <input
                      className="rounded-md border bg-transparent px-3 py-2 text-sm"
                      placeholder="Href"
                      value={bookmark.href || ""}
                      onChange={(e) => {
                        const next = [...group.bookmarks];
                        next[bookmarkIndex] = { ...bookmark, href: e.target.value };
                        updateGroup(groupIndex, { bookmarks: next });
                      }}
                    />
                    <input
                      className="rounded-md border bg-transparent px-3 py-2 text-sm"
                      placeholder="Abbr"
                      value={bookmark.abbr || ""}
                      onChange={(e) => {
                        const next = [...group.bookmarks];
                        next[bookmarkIndex] = { ...bookmark, abbr: e.target.value };
                        updateGroup(groupIndex, { bookmarks: next });
                      }}
                    />
                    <input
                      className="rounded-md border bg-transparent px-3 py-2 text-sm"
                      placeholder="Icon"
                      value={bookmark.icon || ""}
                      onChange={(e) => {
                        const next = [...group.bookmarks];
                        next[bookmarkIndex] = { ...bookmark, icon: e.target.value };
                        updateGroup(groupIndex, { bookmarks: next });
                      }}
                    />
                    <input
                      className="rounded-md border bg-transparent px-3 py-2 text-sm md:col-span-2"
                      placeholder="Description"
                      value={bookmark.description || ""}
                      onChange={(e) => {
                        const next = [...group.bookmarks];
                        next[bookmarkIndex] = { ...bookmark, description: e.target.value };
                        updateGroup(groupIndex, { bookmarks: next });
                      }}
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => updateGroup(groupIndex, { bookmarks: [...group.bookmarks, createBookmark()] })}
                  className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <BiPlus />
                  Add bookmark
                </button>
              </div>
            ) : (
              <div className="grid gap-3">
                {group.services.map((service, serviceIndex) => (
                  <div key={serviceIndex} className="grid gap-3 rounded-md border border-theme-500/10 p-3 md:grid-cols-2">
                    <input
                      className="rounded-md border bg-transparent px-3 py-2 text-sm"
                      placeholder="Name"
                      value={service.name || ""}
                      onChange={(e) => updateGroup(groupIndex, { services: updateService(group, serviceIndex, { name: e.target.value }) })}
                    />
                    <input
                      className="rounded-md border bg-transparent px-3 py-2 text-sm"
                      placeholder="Href"
                      value={service.href || ""}
                      onChange={(e) => updateGroup(groupIndex, { services: updateService(group, serviceIndex, { href: e.target.value }) })}
                    />
                    <input
                      className="rounded-md border bg-transparent px-3 py-2 text-sm"
                      placeholder="Icon"
                      value={service.icon || ""}
                      onChange={(e) => updateGroup(groupIndex, { services: updateService(group, serviceIndex, { icon: e.target.value }) })}
                    />
                    <input
                      className="rounded-md border bg-transparent px-3 py-2 text-sm"
                      placeholder="Description"
                      value={service.description || ""}
                      onChange={(e) =>
                        updateGroup(groupIndex, { services: updateService(group, serviceIndex, { description: e.target.value }) })
                      }
                    />
                    <input
                      className="rounded-md border bg-transparent px-3 py-2 text-sm"
                      placeholder="Widget type"
                      value={service.widgets?.[0]?.type || ""}
                      onChange={(e) =>
                        updateGroup(groupIndex, {
                          services: updateServiceWidget(group, service, serviceIndex, "type", e.target.value),
                        })
                      }
                    />
                    <input
                      className="rounded-md border bg-transparent px-3 py-2 text-sm"
                      placeholder="Widget URL"
                      value={service.widgets?.[0]?.url || ""}
                      onChange={(e) =>
                        updateGroup(groupIndex, {
                          services: updateServiceWidget(group, service, serviceIndex, "url", e.target.value),
                        })
                      }
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => updateGroup(groupIndex, { services: [...group.services, createService()] })}
                  className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <BiPlus />
                  Add service
                </button>
              </div>
            )}
          </section>
        ))}
      </div>

      {error && <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-200">{error}</div>}

      <div className="flex justify-end">
        <button
          type="button"
          disabled={!canSave || saving}
          onClick={handleSave}
          className={classNames("inline-flex items-center gap-2 rounded-md bg-theme-600 px-3 py-2 text-sm text-white", saving && "opacity-60")}
        >
          <BiSave />
          Save
        </button>
      </div>
    </div>
  );
}
