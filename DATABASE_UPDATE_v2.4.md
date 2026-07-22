# Database Update — v2.4

## Employees: ช่องที่ต้องเพิ่มเอง

เพิ่ม Header ต่อท้ายข้อมูลเดิมเพียง 1 ช่อง:

```text
buId
```

ตัวอย่างค่า:

```text
TRL
TRO
TVB
YOD
```

ระบบใช้ `departmentId` เดิมต่อได้ ไม่ต้องเพิ่ม Department ใหม่อีกช่อง

> สำคัญ: เพิ่ม `buId` ต่อท้าย Column เดิม ไม่ควรแทรกกลางข้อมูลเดิม เพื่อไม่ให้ตำแหน่งข้อมูลเก่าเหลื่อม

## StepLogs: ระบบเพิ่มให้อัตโนมัติ

เมื่อ Deploy Apps Script v2.4 ระบบจะเพิ่ม Header ต่อท้าย:

```text
buIdAtSubmission
departmentIdAtSubmission
```

ทั้งสองช่องไม่ต้องกรอกเอง ระบบบันทึก Snapshot ตอนพนักงานส่งผล

## Login และ Performance

Login v2.4 ไม่ดึง Employees และ StepLogs ทั้งหมดไปที่ Browser:

1. ค้นหาเฉพาะ `employeeId` หรือ `email`
2. อ่านเฉพาะแถวพนักงานที่ Login
3. อ่านเฉพาะ StepLogs ของพนักงานคนนั้น
4. ใช้ Leaderboard Cache 5 นาที
5. ล้าง Cache ทันทีเมื่อมีการส่งผล อนุมัติ ปฏิเสธ ลบ หรือแก้โครงสร้างพนักงาน

ดังนั้นการเพิ่ม `buId` ไม่ทำให้หน้า Login ต้องโหลดพนักงานทุก BU

## ขั้นตอนหลังวาง Code.gs

1. Deploy Apps Script เป็น New version
2. เปิด Web App `/exec` หนึ่งครั้ง
3. ตรวจ Sheet `Employees` ว่ามี `buId` ต่อท้าย
4. กรอก `buId` ให้พนักงานทุกคน
5. ตรวจ Sheet `StepLogs` ว่ามี Snapshot 2 ช่องต่อท้าย
6. Deploy Frontend บน Vercel
