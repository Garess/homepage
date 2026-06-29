import AdminShell from "components/admin/shell";
import VisualForm from "components/admin/visual-form";

export default function AdminVisual() {
  return (
    <AdminShell title="Visual Settings" active="/admin/visual">
      <div className="grid gap-4">
        <p className="text-sm text-theme-600 dark:text-theme-300">
          Adjust the homepage title, palette, background, and card blur.
        </p>
        <VisualForm />
      </div>
    </AdminShell>
  );
}
