# Lean Architecture Plan

This project should become world class by being disciplined, not by spending early.

## Stage 1: Founder MVP

Use:
- FastAPI backend
- SQLite database
- Local seed data
- Rulebook-driven compliance engine
- Portfolio, watchlist, and screening logs

Goal:
- validate product shape
- validate compliance workflow
- validate user understanding of halal screening

## Stage 2: Low-cost production launch

Recommended stack:
- FastAPI on a small managed container or VM
- Postgres instead of SQLite
- Managed TLS and DNS
- Object storage for documents and reports
- External auth provider instead of building auth from scratch

Goal:
- avoid spending engineering time on undifferentiated infrastructure
- keep compliance and product logic as your main moat

## Stage 3: Compliance-first fintech platform

Add:
- user accounts and role-based access
- scholar review workflow
- compliance version approvals
- automated rescreening on data refresh
- broker abstraction layer for Zerodha and Upstox
- portfolio alerts and purification reporting

## What should remain custom

Build in-house:
- compliance engine
- India-focused rulebook logic
- screening governance and auditability
- portfolio compliance UX

Prefer external managed services:
- auth
- email delivery
- payments
- observability
- cloud secrets management
