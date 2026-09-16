# Validation v2.5.7 — Employee/Admin Ranking Scope Alignment

Checks:
- Google Apps Script syntax: PASS after copying Code.gs to .js and running `node --check`.
- Frontend TypeScript/TSX parse check: PASS (18 source files, 0 parse diagnostics).
- Live spreadsheet arithmetic spot-check:
  - Engineering/TVB Aug = 576,334
  - Engineering/TVB Sep = 274,699
  - Engineering/TVB Jul = 55,998
  - All = 907,031
  - Editorial/TVB Aug 808,103 + Sep 233,204 = All 1,041,307
  - Safety/TR Jul 11,847 + Aug 607,689 + Sep 234,356 = All 853,892
- One-person/one-campaign-week de-duplication remains employee + month + weekOfMonth, latest verified row wins.
