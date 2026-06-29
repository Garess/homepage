import classNames from "classnames";
import Block from "components/services/widget/block";
import Container from "components/services/widget/container";
import useSWR from "swr";

function statusClass(status) {
  return {
    arrived: "text-emerald-500 dark:text-emerald-300",
    waiting: "text-amber-500 dark:text-amber-300",
    today: "text-sky-500 dark:text-sky-300",
    overdue: "text-rose-500 dark:text-rose-300",
  }[status];
}

function episodeLabel(value) {
  if (value === null || value === undefined || value === "") return "";
  return `EP ${value}`;
}

function QueueRow({ item }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-sm bg-theme-200/50 dark:bg-theme-900/20 px-2 py-1 text-xs">
      <div className="min-w-0">
        <div className="truncate font-medium text-theme-900 dark:text-theme-100">{item.title}</div>
        <div className="text-[11px] text-theme-500 dark:text-theme-400">
          {[item.airTime, episodeLabel(item.expectedEpisode)].filter(Boolean).join(" · ")}
        </div>
      </div>
      <span className={classNames("shrink-0 font-semibold uppercase", statusClass(item.status))}>{item.status}</span>
    </div>
  );
}

function RecentEvent({ event }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-sm px-2 py-1 text-xs">
      <span className="truncate text-theme-700 dark:text-theme-200">{event.seriesTitle || event.showKey}</span>
      <span className="shrink-0 text-theme-500 dark:text-theme-400">
        {event.episodeDisplay || episodeLabel(event.episodeNumbers?.[0])}
      </span>
    </div>
  );
}

export default function Component({ service }) {
  const { data, error } = useSWR("/api/bangumi/status");

  if (error || data?.error) {
    return <Container service={service} error={error || data?.error} />;
  }

  if (!data) {
    return (
      <Container service={service}>
        <Block label="Total" />
        <Block label="Today" />
        <Block label="Overdue" />
        <Block label="Unmatched" />
      </Container>
    );
  }

  const summary = data.summary || {};
  const queue = Array.isArray(data.todayQueue) ? data.todayQueue.slice(0, 4) : [];
  const recentEvents = Array.isArray(data.recentEvents) ? data.recentEvents.slice(0, 2) : [];

  return (
    <Container service={service}>
      <div className="flex w-full flex-col gap-1">
        <div className="grid grid-cols-4 gap-1">
          <Block label="Total" value={summary.total ?? 0} />
          <Block label="Today" value={summary.today ?? 0} />
          <Block label="Overdue" value={summary.overdue ?? 0} highlightValue={summary.overdue ?? 0} />
          <Block label="Unmatched" value={summary.unmatchedEvents ?? 0} />
        </div>

        {queue.length > 0 && (
          <div className="flex flex-col gap-1">
            {queue.map((item) => (
              <QueueRow key={item.key} item={item} />
            ))}
          </div>
        )}

        {recentEvents.length > 0 && (
          <div className="mt-1 border-t border-theme-300/40 pt-1 dark:border-theme-700/40">
            {recentEvents.map((event) => (
              <RecentEvent key={event.id || `${event.seriesTitle}-${event.receivedAt}`} event={event} />
            ))}
          </div>
        )}
      </div>
    </Container>
  );
}
