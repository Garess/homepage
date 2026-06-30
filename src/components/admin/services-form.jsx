import GroupsForm from "./groups-form";

export default function ServicesForm() {
  return (
    <GroupsForm
      kind="services"
      endpoint="/api/admin/config/services"
      title="服务"
      emptyLabel="添加第一个服务分组。"
    />
  );
}
