import GroupsForm from "./groups-form";

export default function ServicesForm() {
  return (
    <GroupsForm
      kind="services"
      endpoint="/api/admin/config/services"
      title="Services"
      emptyLabel="Add your first service group."
      saveLabel="Save services"
    />
  );
}
