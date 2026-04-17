#!/usr/bin/env python3
"""
Run the internal daily refresh pipeline.

Calls:
    POST /api/internal/daily-refresh
with:
    X-Internal-Service-Token

Usage:
    PYTHONPATH=. python3 scripts/run_daily_refresh.py
    PYTHONPATH=. python3 scripts/run_daily_refresh.py --screen-chunk-size 200
"""

import argparse
import logging
import os
import sys

try:
    import httpx
except ImportError:
    print("ERROR: httpx required. Install with `pip install httpx`.")
    sys.exit(1)


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("run_daily_refresh")


_LAST_SENT_BY_KEY: dict[str, float] = {}


def _env_bool(name: str, default: bool) -> bool:
    raw = (os.getenv(name) or "").strip().lower()
    if raw == "":
        return default
    return raw == "true"


def _within_quiet_window(alert_key: str) -> bool:
    enabled = _env_bool("OPS_ALERT_QUIET_WINDOW_ENABLED", False)
    if not enabled:
        return False
    try:
        seconds = max(0, int(os.getenv("OPS_ALERT_QUIET_WINDOW_SECONDS", "1800")))
    except ValueError:
        seconds = 1800
    now = __import__("time").time()
    last = _LAST_SENT_BY_KEY.get(alert_key)
    if last is not None and now - last < seconds:
        return True
    _LAST_SENT_BY_KEY[alert_key] = now
    return False


def _post_slack_text(text: str) -> None:
    webhook = (os.getenv("OPS_SLACK_WEBHOOK_URL") or "").strip()
    if not webhook:
        return
    with httpx.Client(timeout=10.0) as client:
        response = client.post(webhook, json={"text": text})
    if response.status_code >= 400:
        log.warning(
            "[job-b-cron-slack] Slack webhook rejected payload (%s): %s",
            response.status_code,
            response.text[:300],
        )


def _send_cron_alert(*, level: str, title: str, details: dict[str, object], alert_key: str) -> None:
    level_normalized = (level or "").strip().lower()
    if level_normalized == "success" and not _env_bool("OPS_ALERT_SUCCESSES_ENABLED", True):
        return
    if level_normalized in {"warning", "error"} and not _env_bool("OPS_ALERT_FAILURES_ENABLED", True):
        return
    if not (os.getenv("OPS_SLACK_WEBHOOK_URL") or "").strip():
        return
    if _within_quiet_window(alert_key):
        log.info("[job-b-cron-slack] Suppressed by quiet window: %s", alert_key)
        return

    app_env = (os.getenv("APP_ENV") or "development").strip().upper()
    lines = [f"*[{app_env}]* {title}"]
    for key, value in details.items():
        if value is None:
            continue
        lines.append(f"• {key}: {value}")

    try:
        _post_slack_text("\n".join(lines))
    except Exception as exc:
        log.warning("[job-b-cron-slack] Failed sending Slack alert: %s", exc)


def _normalize_api_base(raw: str) -> str:
    candidate = (raw or "").strip()
    if not candidate:
        candidate = "http://localhost:8001/api"
    if not candidate.startswith(("http://", "https://")):
        # Render cron can inject internal service host:port (e.g. "barakfi-api:10000")
        # via fromService.hostport, which is plain HTTP on the private network.
        lowered = candidate.lower()
        is_internal_hostport = (
            ":" in candidate
            and not lowered.startswith(("localhost", "127.", "0.0.0.0"))
            and "." not in candidate.split(":", 1)[0]
        )
        scheme = "http" if is_internal_hostport else "https"
        candidate = f"{scheme}://{candidate}"
    normalized = candidate.rstrip("/")
    if not normalized.endswith("/api"):
        normalized = f"{normalized}/api"
    return normalized


def main() -> int:
    parser = argparse.ArgumentParser(description="Run /api/internal/daily-refresh")
    parser.add_argument(
        "--screen-chunk-size",
        type=int,
        default=150,
        help="Chunk size for internal screening warm-up (default: 150)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print request details without making network calls",
    )
    parser.add_argument(
        "--test-slack",
        action="store_true",
        help="Send a Slack test alert and exit (no API call).",
    )
    args = parser.parse_args()

    api_base = _normalize_api_base(os.getenv("API_BASE_URL", "http://localhost:8001/api"))
    token = (os.getenv("INTERNAL_SERVICE_TOKEN") or "").strip()

    url = f"{api_base}/internal/daily-refresh"
    params = {"screen_chunk_size": str(args.screen_chunk_size)}
    headers = {"Accept": "application/json"}
    if token:
        headers["X-Internal-Service-Token"] = token

    log.info("Daily refresh URL: %s", url)
    log.info("screen_chunk_size=%d", args.screen_chunk_size)

    if args.test_slack:
        _send_cron_alert(
            level="warning",
            title="Job B Slack test",
            alert_key="daily-refresh:cron:test",
            details={"mode": "TEST"},
        )
        return 0

    if args.dry_run:
        log.info("DRY RUN: no request sent")
        return 0
    if not token:
        log.error("INTERNAL_SERVICE_TOKEN is required for /api/internal/daily-refresh")
        return 1

    try:
        with httpx.Client(timeout=360.0) as client:
            response = client.post(url, params=params, headers=headers)
        if response.status_code >= 400:
            snippet = response.text[:700]
            log.error("Daily refresh failed: HTTP %d — %s", response.status_code, snippet)
            _send_cron_alert(
                level="error",
                title="Job B (daily refresh) failed",
                alert_key="daily-refresh:cron:failure",
                details={
                    "http_status": response.status_code,
                    "response_snippet": snippet,
                },
            )
            return 1
        payload = response.json()
        log.info("Daily refresh completed: %s", payload)
        _send_cron_alert(
            level="success",
            title="Job B (daily refresh) success",
            alert_key="daily-refresh:cron:success",
            details={
                "run_id": payload.get("run_id"),
                "prices": payload.get("prices"),
                "screening": {
                    "symbols_completed": payload.get("screening", {}).get("symbols_completed"),
                    "symbols_expected": payload.get("screening", {}).get("symbols_expected"),
                },
                "indices_updated": payload.get("indices", {}).get("updated"),
            },
        )
        return 0
    except Exception as exc:
        log.error("Daily refresh request failed: %s", exc)
        _send_cron_alert(
            level="error",
            title="Job B (daily refresh) crashed",
            alert_key="daily-refresh:cron:failure",
            details={"error": str(exc)},
        )
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
