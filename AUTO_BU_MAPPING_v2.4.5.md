# Automatic BU Mapping v2.4.5

ระบบจะใช้ค่า `Employees!buId` ที่กรอกไว้เป็น Manual Override ก่อนเสมอ  
หากช่องว่างหรือเป็น `UNASSIGNED` ระบบจะคำนวณจาก `employeeId`:

- `00`, `T9`, `R0`, `F9` → `TR`
- `100`, `T10`, `F10` → `VG3`
- `200`, `T20`, `F20` → `TVB`
- `400` → `EVP`
- `500` → `TRL`
- `800` → `YOD`
- `V90005`, `V90099`, `V99999` → `VG3`
- รหัส `V` อื่นทั้งหมด → `TR`
- ไม่เข้าเงื่อนไข → `UNASSIGNED`

## หลัง Deploy Apps Script

รันฟังก์ชันนี้ 1 ครั้งจาก Apps Script Editor:

`syncEmployeeBuIdsFromEmployeeId`

ฟังก์ชันจะ:
1. เติม `Employees!buId` เฉพาะแถวที่ว่าง/UNASSIGNED
2. เติม `StepLogs!buIdAtSubmission` ของข้อมูลเก่าที่ว่าง/UNASSIGNED
3. เติม `departmentIdAtSubmission` ของข้อมูลเก่าเมื่อหา Employee ได้
4. ไม่เขียนทับค่า BU ที่กรอกเอง
5. ล้าง Leaderboard Cache

ระบบยังมี Runtime Fallback จึงคำนวณ BU ได้แม้ยังไม่ได้รัน Sync แต่ควรรัน 1 ครั้งเพื่อให้ข้อมูลใน Sheets สมบูรณ์
