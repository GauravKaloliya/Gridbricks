from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from app.core.timeutils import ensure_utc


@dataclass(frozen=True)
class CutoffRule:
    local_time: time
    timezone_name: str
    inclusive: bool = True

    @property
    def zone(self) -> ZoneInfo:
        return ZoneInfo(self.timezone_name)


def cutoff_for_delivery(delivery_start: datetime, rule: CutoffRule) -> datetime:
    """Return the decision cutoff for one delivery interval, in UTC.

    The cutoff is the configured local clock time on the calendar day before
    delivery. The local date is derived after converting the delivery instant
    into the configured timezone, so the rule is DST-safe for UK time.
    """
    delivery_start = ensure_utc(delivery_start)
    local_delivery = delivery_start.astimezone(rule.zone)
    decision_date = local_delivery.date() - timedelta(days=1)
    local_cutoff = datetime.combine(decision_date, rule.local_time).replace(
        tzinfo=rule.zone
    )
    return local_cutoff.astimezone(delivery_start.tzinfo)


def is_eligible(publish_time: datetime, cutoff: datetime, inclusive: bool) -> bool:
    publish_time = ensure_utc(publish_time)
    cutoff = ensure_utc(cutoff)
    return publish_time <= cutoff if inclusive else publish_time < cutoff
