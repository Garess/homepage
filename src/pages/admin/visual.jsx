import AdminShell from "components/admin/shell";
import VisualForm from "components/admin/visual-form";

export default function AdminVisual() {
  return (
    <AdminShell title="视觉设置" active="/admin/visual">
      <div className="grid gap-4">
        <p className="text-sm text-theme-600 dark:text-theme-300">
          调整首页标题、主题、配色、背景图片和组件模糊程度。
        </p>
        <VisualForm />
      </div>
    </AdminShell>
  );
}
