from __future__ import annotations

import logging
import time
from datetime import datetime
from typing import Any

import httpx

from app.config import (
    APP_ENV,
    OPS_ALERT_FAILURES_ENABLED,
    OPS_ALERT_QUIET_WINDOW_ENABLED,
    OPS_ALERT_QUIET_WINDOW_SECONDS,
    OPS_ALERT_SUCCESSES_ENABLED,
    OPS_SLACK_WEBHOOK_URL,
)

logger = logging.getLogger("barakfi")

_LAST_SENT_BY_KEY: dict[str, float] = {}


def _within_quiet_window(alert_key: str) -> bool:
    if not OPS_ALERT_QUIET_WINDOW_ENABLED:
        return False
    now = time.time()
    last = _LAST_SENT_BY_KEY.get(alert_key)
    if last is not None and now - last < OPS_ALERT_QUIET_WINDOW_SECONDS:
        return True
    _LAST_SENT_BY_KEY[alert_key] = now
    return False


def _post_slack_text(text: str) -> None:
    if not OPS_SLACK_WEBHOOK_URL:
        return
    with httpx.Client(timeout=10.0) as client:
        response = client.post(OPS_SLACK_WEBHOOK_URL, json={"text": text})
    if response.status_code >= 400:
        logger.warning(
            "[ops-alert] Slack webhook rejected payload (%s): %s",
            response.status_code,
            response.text[:500],
        )


def send_ops_alert(
    *,
    level: str,
    title: str,
    details: dict[str, Any],
    alert_key: str,
) -> None:
    """
    Send operational alerts to Slack.
    level: "success" | "warning" | "error"
    """
    level_normalized = (level or "").strip().lower()
    if level_normalized == "success" and not OPS_ALERT_SUCCESSES_ENABLED:
        return
    if level_normalized in {"warning", "error"} and not OPS_ALERT_FAILURES_ENABLED:
        return
    if not OPS_SLACK_WEBHOOK_URL:
        return
    if _within_quiet_window(alert_key):
        logger.info("[ops-alert] Suppressed by quiet window: %s", alert_key)
        return

    lines: list[str] = [
        f"*[{APP_ENV.upper()}]* {title}",
    ]
    for key, value in details.items():
        if value is None:
            continue
        if isinstance(value, datetime):
            rendered = value.isoformat()
        else:
            rendered = str(value)
        lines.append(f"• {key}: {rendered}")

    try:
        _post_slack_text("\n".join(lines))
    except Exception as exc:
        logger.warning("[ops-alert] Failed sending Slack alert: %s", exc)
