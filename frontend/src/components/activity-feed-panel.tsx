import styles from "@/app/page.module.css";
import type { ActivityEvent } from "@/lib/api";
import Link from "next/link";

type Props = {
  events: ActivityEvent[];
};

export function ActivityFeedPanel({ events }: Props) {
  if (events.length === 0) {
    return (
      <div className="emptyStateBlock">
        <div className="emptyStateIcon" aria-hidden="true">&#x23F3;</div>
        <p className="emptyStateTitle">No recent activity</p>
        <p className="emptyStateDesc">Your screening and portfolio activity will appear here as you explore stocks.</p>
      </div>
    );
  }

  return (
    <div className={styles.simpleList}>
      {events.map((event) => (
        <div className={styles.simpleRow} key={event.id}>
          <div>
            <strong>{event.title}</strong>
            <span>{event.kind?.replaceAll("_", " ") || event.level}</span>
          </div>
          <p>
            {event.detail}
            {event.symbol && (
              <>
                {" "}
                <Link className={styles.inlineLink} href={`/stocks/${encodeURIComponent(event.symbol)}`}>
                  View {event.symbol} →
                </Link>
              </>
            )}
          </p>
        </div>
      ))}
    </div>
  );
}
