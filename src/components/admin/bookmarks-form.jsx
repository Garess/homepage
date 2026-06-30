import GroupsForm from "./groups-form";

export default function BookmarksForm() {
  return (
    <GroupsForm
      kind="bookmarks"
      endpoint="/api/admin/config/bookmarks"
      title="书签"
      emptyLabel="添加第一个书签分组。"
    />
  );
}
