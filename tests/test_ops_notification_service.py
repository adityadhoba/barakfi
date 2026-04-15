from app.services import ops_notification_service as svc


def test_send_ops_alert_skips_when_success_alerts_disabled(monkeypatch):
    sent: list[str] = []
    monkeypatch.setattr(svc, "OPS_SLACK_WEBHOOK_URL", "https://hooks.slack.test/abc")
    monkeypatch.setattr(svc, "OPS_ALERT_SUCCESSES_ENABLED", False)
    monkeypatch.setattr(svc, "OPS_ALERT_FAILURES_ENABLED", True)
    monkeypatch.setattr(svc, "_post_slack_text", lambda text: sent.append(text))

    svc.send_ops_alert(
        level="success",
        title="Daily refresh complete",
        details={"run_id": "r1"},
        alert_key="daily-refresh:success",
    )
    assert sent == []


def test_send_ops_alert_sends_failure_when_enabled(monkeypatch):
    sent: list[str] = []
    monkeypatch.setattr(svc, "OPS_SLACK_WEBHOOK_URL", "https://hooks.slack.test/abc")
    monkeypatch.setattr(svc, "OPS_ALERT_SUCCESSES_ENABLED", True)
    monkeypatch.setattr(svc, "OPS_ALERT_FAILURES_ENABLED", True)
    monkeypatch.setattr(svc, "OPS_ALERT_QUIET_WINDOW_ENABLED", False)
    monkeypatch.setattr(svc, "_post_slack_text", lambda text: sent.append(text))

    svc.send_ops_alert(
        level="error",
        title="Daily refresh failed",
        details={"run_id": "r2", "phase": "screening"},
        alert_key="daily-refresh:failure:partial-screening",
    )
    assert len(sent) == 1
    assert "Daily refresh failed" in sent[0]
    assert "run_id: r2" in sent[0]


def test_send_ops_alert_respects_quiet_window(monkeypatch):
    sent: list[str] = []
    monkeypatch.setattr(svc, "OPS_SLACK_WEBHOOK_URL", "https://hooks.slack.test/abc")
    monkeypatch.setattr(svc, "OPS_ALERT_SUCCESSES_ENABLED", True)
    monkeypatch.setattr(svc, "OPS_ALERT_FAILURES_ENABLED", True)
    monkeypatch.setattr(svc, "OPS_ALERT_QUIET_WINDOW_ENABLED", True)
    monkeypatch.setattr(svc, "OPS_ALERT_QUIET_WINDOW_SECONDS", 3600)
    monkeypatch.setattr(svc, "_post_slack_text", lambda text: sent.append(text))
    monkeypatch.setattr(svc, "_LAST_SENT_BY_KEY", {})

    svc.send_ops_alert(
        level="success",
        title="Daily refresh complete",
        details={"run_id": "r3"},
        alert_key="daily-refresh:success",
    )
    svc.send_ops_alert(
        level="success",
        title="Daily refresh complete",
        details={"run_id": "r4"},
        alert_key="daily-refresh:success",
    )

    assert len(sent) == 1
    assert "run_id: r3" in sent[0]
