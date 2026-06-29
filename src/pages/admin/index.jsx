import Link from "next/link";

import AdminShell from "components/admin/shell";

export default function AdminIndex() {
  return (
    <AdminShell title="Overview" active="/admin/visual">
      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/admin/visual"
          className="rounded-md border border-theme-500/10 bg-white/70 p-5 shadow-sm transition hover:bg-white/90 dark:bg-white/5 dark:hover:bg-white/10"
        >
          <h2 className="text-lg font-semibold">Visual Settings</h2>
          <p className="mt-2 text-sm text-theme-600 dark:text-theme-300">Edit background, blur, color, theme, and title.</p>
        </Link>
        <Link
          href="/admin/content"
          className="rounded-md border border-theme-500/10 bg-white/70 p-5 shadow-sm transition hover:bg-white/90 dark:bg-white/5 dark:hover:bg-white/10"
        >
          <h2 className="text-lg font-semibold">Content</h2>
          <p className="mt-2 text-sm text-theme-600 dark:text-theme-300">Edit services and bookmarks in separate forms.</p>
        </Link>
      </div>
    </AdminShell>
  );
}
