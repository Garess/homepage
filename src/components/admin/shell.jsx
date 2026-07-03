import Head from "next/head";
import Link from "next/link";

import AdminNav from "./nav";

export default function AdminShell({ title, active, children }) {
  return (
    <>
      <Head>
        <title>{title ? `${title} - 后台管理` : "后台管理"}</title>
      </Head>
      <div className="min-h-screen bg-theme-50 text-theme-900 dark:bg-slate-950 dark:text-theme-100">
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
          <header className="flex flex-col gap-3 border-b border-theme-500/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-theme-600 dark:text-theme-300">
                Homepage 后台
              </p>
              <h1 className="mt-1 text-2xl font-semibold">{title || "总览"}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/"
                className="rounded-md border border-theme-500/20 bg-white/60 px-3 py-2 text-sm font-medium text-theme-700 transition hover:bg-white/90 dark:border-white/10 dark:bg-white/5 dark:text-theme-200 dark:hover:bg-white/10"
              >
                返回主页
              </Link>
              <AdminNav active={active} />
            </div>
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </>
  );
}
