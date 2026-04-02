# Shariah Rulebook Notes

This file explains the single strict compliance profile used in the app, what it automates, what it only flags for review, and which primary sources informed those choices.

## Primary Sources

1. Indian Centre for Islamic Finance article:
   `https://icif.org.in/icif-news-event.php?event=ei&id=151`
2. S&P Shariah Indices Methodology:
   `https://www.spglobal.com/spdji/en/documents/methodologies/methodology-sp-shariah-indices.pdf`

## Single product profile

The product uses one profile only:

- `india_strict`

This avoids user confusion and keeps compliance decisions consistent across the app.

## Source-backed rules currently implemented as hard rules

### Primary hard rules

- Exclude prohibited business activities and sectors.
- Non-permissible income divided by total business income must be below 5%.
- Debt divided by 36-month average market value of equity must be below 33%.

These are based primarily on the current S&P methodology used for indices including the `S&P BSE 500 Shariah` family.

## Secondary verification layer in the app

- Receivables divided by market capitalization must not exceed 45%.

This is based on the ICIF article text describing India-relevant Shariah investing screens.
The app still keeps one profile only; this layer is used to strengthen verification within that one profile.

## Manual review rule, not final automated compliance

- Fixed-assets guidance is not treated as an automatic hard fail yet.

Why:
- The ICIF article says companies may be screened out if they do not have at least 25% of capital in fixed assets.
- The exact production formula is not defined clearly enough in the source page for us to automate with confidence.

So the app marks this as `REQUIRES_REVIEW` rather than claiming a definitive result.

## Important product policy

The app should only return `HALAL` when:

- all automated hard rules pass, and
- there are no unresolved manual review flags

The app should return `REQUIRES_REVIEW` when:

- the available data is insufficient, or
- the source exists but the formula is too ambiguous for safe automation

The app should return `NON_COMPLIANT` when:

- any automated hard rule fails

## Not implemented yet

- historical monthly review buffers used in index maintenance
- dividend purification calculations for user portfolios
- live audited financial ingestion from licensed data providers
- formal scholar sign-off workflow and compliance versioning approvals
