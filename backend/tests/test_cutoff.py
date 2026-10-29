from __future__ import annotations

from datetime import datetime, time, timezone

import pytest

from app.domain.cutoff import CutoffRule, cutoff_for_delivery, is_eligible

UTC = timezone.utc


def test_cutoff_is_previous_local_day_at_0930_in_winter():
    rule = CutoffRule(time(9, 30), "Europe/London", True)
    cutoff = cutoff_for_delivery(datetime(2026, 1, 1, 0, 0, tzinfo=UTC), rule)
    assert cutoff == datetime(2025, 12, 31, 9, 30, tzinfo=UTC)


def test_cutoff_handles_spring_dst_transition():
    rule = CutoffRule(time(9, 30), "Europe/London", True)
    # Delivery 30 Mar 2026 00:00 local is 29 Mar 23:00 UTC; cutoff is 09:30 BST.
    cutoff = cutoff_for_delivery(datetime(2026, 3, 29, 23, 0, tzinfo=UTC), rule)
    assert cutoff == datetime(2026, 3, 29, 8, 30, tzinfo=UTC)


def test_cutoff_handles_autumn_dst_transition():
    rule = CutoffRule(time(9, 30), "Europe/London", True)
    # UK clocks went back at 02:00 BST on 25 Oct 2026, so 09:30 local is GMT.
    cutoff = cutoff_for_delivery(datetime(2026, 10, 26, 0, 0, tzinfo=UTC), rule)
    assert cutoff == datetime(2026, 10, 25, 9, 30, tzinfo=UTC)


def test_eligibility_is_inclusive_by_default():
    cutoff = datetime(2025, 12, 31, 9, 30, tzinfo=UTC)
    assert is_eligible(datetime(2025, 12, 31, 9, 30, tzinfo=UTC), cutoff, True)
    assert not is_eligible(datetime(2025, 12, 31, 9, 31, tzinfo=UTC), cutoff, True)


def test_eligibility_can_be_exclusive():
    cutoff = datetime(2025, 12, 31, 9, 30, tzinfo=UTC)
    assert not is_eligible(datetime(2025, 12, 31, 9, 30, tzinfo=UTC), cutoff, False)


def test_naive_timestamps_are_rejected():
    rule = CutoffRule(time(9, 30), "Europe/London", True)
    with pytest.raises(ValueError):
        cutoff_for_delivery(datetime(2026, 1, 1), rule)
