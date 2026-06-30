import classNames from "classnames";
import Link from "next/link";

const items = [
  { href: "/admin/visual", label: "视觉设置" },
  { href: "/admin/content", label: "服务与书签" },
];

export default function AdminNav({ active = "/admin" }) {
  return (
    <nav className="flex flex-wrap gap-2">
      {items.map((item) => {
        const selected = active === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={classNames(
              "rounded-md border px-3 py-2 text-sm font-medium transition",
              selected
                ? "border-theme-500 bg-theme-500/15 text-theme-900 dark:text-theme-100"
                : "border-theme-500/20 bg-white/60 text-theme-700 hover:bg-white/90 dark:border-white/10 dark:bg-white/5 dark:text-theme-200 dark:hover:bg-white/10",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
