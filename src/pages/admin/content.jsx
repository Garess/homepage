import AdminShell from "components/admin/shell";
import BookmarksForm from "components/admin/bookmarks-form";
import ServicesForm from "components/admin/services-form";

export default function AdminContent() {
  return (
    <AdminShell title="服务与书签" active="/admin/content">
      <div className="grid gap-6">
        <ServicesForm />
        <BookmarksForm />
      </div>
    </AdminShell>
  );
}
