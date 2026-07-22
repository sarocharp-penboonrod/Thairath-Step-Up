# Login input spacing fix v2.4.1

แก้ปัญหา icon ด้านซ้ายบังข้อความในช่อง Username และ Password

ไฟล์ที่แก้:
- `src/components/LoginView.tsx`
- `src/index.css`

รายละเอียด:
- เพิ่ม class `field-input-leading` เพื่อเว้นพื้นที่ด้านซ้าย 3.25rem
- เพิ่ม class `field-input-trailing` เพื่อเว้นพื้นที่ให้ปุ่มแสดง/ซ่อนรหัสผ่าน
- กำหนดพื้นที่ icon ซ้ายและขวาคงที่ 48px
- เพิ่ม `pointer-events-none` ให้ icon ซ้าย
- เพิ่ม accessible label ให้ปุ่มแสดง/ซ่อนรหัสผ่าน
