import Head from "next/head";

import AdminNav from "./nav";

export default function AdminShell({ title, active, children }) {
  return (
    <>
      <Head>
        <title>{title ? `${title} - Admin` : "Admin"}</title>
      </Head>
      <div className="min-h-screen bg-theme-50 text-theme-900 dark:bg-slate-950 dark:text-theme-100">
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
          <header className="flex flex-col gap-3 border-b border-theme-500/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-theme-600 dark:text-theme-300">
                Homepage Admin
              </p>
              <h1 className="mt-1 text-2xl font-semibold">{title || "Overview"}</h1>
            </div>
            <AdminNav active={active} />
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </>
  );
}
