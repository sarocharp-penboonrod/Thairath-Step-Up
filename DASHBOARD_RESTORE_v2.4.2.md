# Dashboard Restore v2.4.2

Frontend-only update based on v2.4.1.

## Restored
- Lucky Draw card with total tickets, monthly earned tickets, and pending potential tickets.
- Health Insight card using verified monthly averages and prior-month trend.
- Weekly submission status cards for every configured campaign week.

## Monthly summary logic
- Submitted: all statuses.
- Verified: AUTO_VERIFIED and APPROVED.
- Target met: verified and average steps >= 7,000.
- Pending: NEEDS_REVIEW.
- Rejected: REJECTED.
- Monthly average: verified records only.

No Google Apps Script or Vercel environment-variable change is required.
