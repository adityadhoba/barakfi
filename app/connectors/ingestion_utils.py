"""Shared hashing + ingestion run helpers."""

from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.models_data_warehouse import DataIngestionRun, DataRawArtifact


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def start_ingestion_run(db: Session, job_name: str, idempotency_key: str) -> DataIngestionRun:
    row = (
        db.query(DataIngestionRun)
        .filter(DataIngestionRun.idempotency_key == idempotency_key)
        .one_or_none()
    )
    if row:
        row.status = "running"
        row.started_at = datetime.now(timezone.utc)
        row.attempt_count = (row.attempt_count or 0) + 1
        db.commit()
        db.refresh(row)
        return row

    run = DataIngestionRun(
        job_name=job_name,
        idempotency_key=idempotency_key,
        status="running",
        started_at=datetime.now(timezone.utc),
        attempt_count=1,
        metrics_json={},
        error_json={},
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


def finish_ingestion_run(
    db: Session,
    run: DataIngestionRun,
    status: str,
    metrics: dict[str, Any] | None = None,
    error: dict[str, Any] | None = None,
) -> None:
    run.status = status
    run.finished_at = datetime.now(timezone.utc)
    if metrics is not None:
        run.metrics_json = metrics
    if error is not None:
        run.error_json = error
    db.commit()


def record_raw_artifact(
    db: Session,
    *,
    job_run_id: int | None,
    source_name: str,
    source_kind: str,
    source_url: str,
    content: bytes,
    http_status: int | None = None,
) -> DataRawArtifact:
    h = sha256_bytes(content)
    existing = (
        db.query(DataRawArtifact)
        .filter(
            DataRawArtifact.source_name == source_name,
            DataRawArtifact.source_url == source_url,
            DataRawArtifact.content_sha256 == h,
        )
        .one_or_none()
    )
    if existing:
        return existing

    art = DataRawArtifact(
        job_run_id=job_run_id,
        source_name=source_name,
        source_kind=source_kind,
        source_url=source_url,
        content_sha256=h,
        http_status=http_status,
        fetched_at=datetime.now(timezone.utc),
        headers_json={},
        parse_status="pending",
    )
    db.add(art)
    db.commit()
    db.refresh(art)
    return art
