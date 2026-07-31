# v2.4.4 Leaderboard & Auto Verify Fix

- AUTO_VERIFIED is treated as a final verified status, equal to APPROVED for calculations.
- Admin Approve/Reject buttons are shown only for NEEDS_REVIEW.
- Leaderboard matches Employees and StepLogs through a canonical 6-digit employee key.
- Leaderboard uses BU/Department snapshots from StepLogs when available.
- Verified logs no longer disappear because one row uses employee ID while another uses employee e-mail or a leading-zero variant.
- Code.gs must be replaced and deployed as a new Apps Script Web App version.
