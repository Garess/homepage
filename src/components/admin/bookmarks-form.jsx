import GroupsForm from "./groups-form";

export default function BookmarksForm() {
  return (
    <GroupsForm
      kind="bookmarks"
      endpoint="/api/admin/config/bookmarks"
      title="Bookmarks"
      emptyLabel="Add your first bookmark group."
      saveLabel="Save bookmarks"
    />
  );
}
