import BangumiManager from "components/admin/bangumi-manager";
import AdminShell from "components/admin/shell";

export default function AdminBangumi() {
  return (
    <AdminShell title="追番管理" active="/admin/bangumi">
      <BangumiManager />
    </AdminShell>
  );
}
