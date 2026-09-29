# Assignment requirement checklist

This checklist is derived solely from the supplied homework and is used for implementation verification.

## Access and records

- [x] Five exact fictional employees and fixed roles
- [x] Demonstration role selector
- [x] Server-side role enforcement
- [x] Telegram identity mapping controlled by manager
- [x] Original Telegram chat ID retained on each bot submission
- [x] Supabase is source of truth
- [x] Unique references and automatic timestamps

## Transactions and finance

- [x] Required sale and expense fields and positive amounts
- [x] Commission shares each 0–100 and total exactly 100
- [x] Pending sales excluded from results
- [x] Ten-percent commission pool with specified cent rounding tie-break
- [x] Expenses reduce company result immediately
- [x] Project expenses await allocation; overhead auto-allocates
- [x] Original proposals and final decisions preserved
- [x] Idempotent approvals
- [x] Dynamic project, company, pending, overhead, and per-person totals

## Integrations

- [x] Shared website and Telegram transaction service
- [x] Telegram confirmations and decision notifications
- [x] Notification status, failure, and retry
- [x] Two-tab Google Sheet with readable proposed/final columns
- [x] Same-row upsert by reference, status, failure, and retry
- [ ] Real Supabase project configured and schema applied
- [ ] Real Telegram bot configured and webhook tested
- [ ] Real Google Sheet and service account configured and tested
- [ ] Vercel production deployment tested

## Required verification

- [x] Automated formula and rule tests for both supplied datasets
- [ ] Official Test 1 executed with S01 and E01 through real Telegram
- [ ] Official Test 2 executed while retaining Test 1 data
- [ ] Permission and duplicate tests against deployed server processing
- [ ] Deliberate Sheets and Telegram failure/retry tests
- [ ] Final production audit and required public/viewer links
