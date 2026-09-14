# Validation v2.5.0 — Total Department Ranking

## Source validation
- Google Apps Script syntax: PASS (`node --check`)
- TS/TSX parse diagnostics: 0 errors across 20 files
- Full `npm run lint/build`: not completed in this sandbox because dependency installation timed out; this is an environment/package-install limitation, not a source syntax failure.

## Data validation against uploaded Database_Thairath-Step-Run
Current campaign month sample (`week = 3`):
- Verified logs used: 234
- Employee values are averaged per employee inside the selected period, then summed across employees for department ranking.

### Sample consolidated departments
| Department | Canonical BU | Members | Participants | Total Steps | Avg / Person |
|---|---:|---:|---:|---:|---:|
| ฝ่ายวิศวกรรมออกอากาศ | TVB | 97 | 14 | 150,611 | 10,758 |
| ฝ่ายไทยรัฐบันเทิง | TVB | 21 | 14 | 146,235 | 10,445 |
| ฝ่ายบรรณาธิการ | TVB | 253 | 15 | 145,836 | 9,722 |
| ฝ่ายความปลอดภัยอาชีวอนามัยและสภาพแวดล้อมในการทำงาน | TR | 9 | 7 | 130,525 | 18,646 |
| ฝ่ายการเงิน | TR | 22 | 9 | 63,534 | 7,059 |

### Explicit mapping checks
- ฝ่ายไทยรัฐบันเทิง: TVB + VG3 consolidated -> TVB
- ฝ่ายการตลาด: cross-BU consolidated -> TVB
- ฝ่าย Platform Management: cross-BU consolidated -> TVB
- ฝ่าย Thairath Creative: cross-BU consolidated -> VG3
- Safety / จป.: canonical owner -> TR

## Admin additions
- Export Ranking CSV
- Save current Ranking snapshot to Google Sheets `RankingHistory`
- Mapping is maintained in Google Sheets `DepartmentMapping`

## Ranking rules
- BU ranking: unchanged, average steps per person
- Department ranking: total of each participant's verified period average
- Same canonical department across multiple BUs: one combined department row
