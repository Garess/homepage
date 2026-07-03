import BangumiComponent from "widgets/bangumi/component";

export default function Bangumi({ options = {} }) {
  return <BangumiComponent service={{ widget: { type: "bangumi", ...options } }} />;
}
