import Link from "next/link";

import AdminShell from "components/admin/shell";

export default function AdminIndex() {
  return (
    <AdminShell title="后台总览" active="/admin/visual">
      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/admin/visual"
          className="rounded-md border border-theme-500/10 bg-white/70 p-5 shadow-sm transition hover:bg-white/90 dark:bg-white/5 dark:hover:bg-white/10"
        >
          <h2 className="text-lg font-semibold">视觉设置</h2>
          <p className="mt-2 text-sm text-theme-600 dark:text-theme-300">调整背景图片、模糊程度、配色、主题和标题。</p>
        </Link>
        <Link
          href="/admin/content"
          className="rounded-md border border-theme-500/10 bg-white/70 p-5 shadow-sm transition hover:bg-white/90 dark:bg-white/5 dark:hover:bg-white/10"
        >
          <h2 className="text-lg font-semibold">服务与书签</h2>
          <p className="mt-2 text-sm text-theme-600 dark:text-theme-300">分别编辑 services.yaml 和 bookmarks.yaml。</p>
        </Link>
      </div>
    </AdminShell>
  );
}
