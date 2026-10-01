# CyberJob — Admin Backend (โมดูลผู้ดูแลระบบ)

> **หมายเหตุสำคัญ:** ปัจจุบันโมดูล Backend ของผู้ดูแลระบบ (Admin API) ได้ถูก **รวม (Merge) เข้ากับ Backend หลัก** ในโฟลเดอร์ [`backend/`](../backend) เรียบร้อยแล้ว  
> โค้ดที่รันจริงบน Production และพัฒนาต่อจะอยู่ที่: `d:/CyberJob_/backend/apps/api/src/admin`  
> โปรดดูคู่มือหลักที่: [CYBERJOB_USER_MANUAL.md](../CYBERJOB_USER_MANUAL.md) และ [README.md](../README.md)

---

## สรุปโมดูลและความสามารถของ Admin Backend

- **Companies Management (`/api/admin/companies`):** ตรวจสอบเอกสารนิติบุคคล อนุมัติ หรือปฏิเสธบริษัท
- **Jobs Moderation (`/api/admin/jobs`):** ตรวจสอบและกำกับดูแลประกาศงานทั้งหมดในระบบ
- **Users Management (`/api/admin/users`):** ดูรายชื่อผู้ใช้งานทั้งหมด จัดการสิทธิ์ เปลี่ยน Role และระงับบัญชี
- **Payments & Packages (`/api/admin/packages`):** ตรวจสอบสลิปการโอนเงินและอนุมัติแพ็กเกจ
- **Synonyms & Keywords (`/api/admin/synonyms`):** จัดการคำพ้องความหมายสำหรับระบบ Smart Matching
- **System Settings (`/api/admin/settings`):** ตั้งค่าระบบและจัดการลิงก์วิดีโอคู่มือ YouTube
