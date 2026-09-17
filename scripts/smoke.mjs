#!/usr/bin/env node
/**
 * ทดสอบ API หลังบ้าน admin กับระบบที่รันอยู่จริง (Feature 3 + Feature 5)
 *
 *   docker compose up -d      (จากโฟลเดอร์ที่มี docker-compose.yml รวม)
 *   node scripts/smoke.mjs
 *
 * ต้องมีข้อมูลจาก seed ของ member (SEED_DEMO_USERS=true)
 * สคริปต์นี้ลบประกาศงาน 1 รายการและผู้สมัคร 1 คนจริง – seed รอบถัดไปจะสร้างผู้สมัครคืน
 */

import { execFileSync } from "node:child_process";

const ADMIN = (process.env.ADMIN_API_URL ?? "http://localhost:3001/api/v1").replace(/\/$/, "");
const MEMBER = (process.env.AUTH_API_URL ?? "http://localhost:4000/api").replace(/\/$/, "");

/** รัน SQL ผ่าน container postgres – คืน null ถ้าไม่มี docker (ข้ามการตรวจส่วนนี้) */
function sql(query) {
  try {
    return execFileSync(
      "docker",
      ["compose", "exec", "-T", "postgres", "psql", "-U", process.env.POSTGRES_USER ?? "cyberjob", "-d", process.env.POSTGRES_DB ?? "cyberjob", "-tAc", query],
      { cwd: process.env.COMPOSE_DIR ?? new URL("../..", import.meta.url), encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
  } catch {
    console.log("  (ข้ามการตรวจฐานข้อมูล: เรียก docker compose ไม่ได้ – ตั้ง COMPOSE_DIR ได้)");
    return null;
  }
}

const results = [];
let group = "";
const section = (name) => {
  group = name;
  console.log(`\n\x1b[1m${name}\x1b[0m`);
};

async function check(name, fn) {
  try {
    await fn();
    results.push({ ok: true });
    console.log(`  \x1b[32mPASS\x1b[0m  ${name}`);
  } catch (error) {
    results.push({ ok: false, name: `[${group}] ${name}`, error: error.message });
    console.log(`  \x1b[31mFAIL\x1b[0m  ${name}\n        ${error.message}`);
  }
}

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

async function call(base, method, path, { token, body } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* CSV หรือข้อความธรรมดา */
  }
  return { status: response.status, headers: response.headers, text, json };
}

const expectStatus = (response, status) =>
  assert(response.status === status, `expected ${status}, got ${response.status} ${response.text.slice(0, 160)}`);

async function login(email, password) {
  const response = await call(MEMBER, "POST", "/auth/login", { body: { email, password } });
  expectStatus(response, 200);
  return response.json.accessToken;
}

async function main() {
  const state = {};

  section("สิทธิ์การเข้าถึง");

  await check("ไม่มี token ได้ 401", async () => {
    expectStatus(await call(ADMIN, "GET", "/admin/users"), 401);
  });

  await check("token ปลอมได้ 401", async () => {
    expectStatus(await call(ADMIN, "GET", "/admin/jobs", { token: "not-a-real-token" }), 401);
  });

  await check("ผู้หางาน (JOBSEEKER) ได้ 403", async () => {
    const token = await login("demo@cyberjob.co.th", "Demo1234!");
    expectStatus(await call(ADMIN, "GET", "/admin/users", { token }), 403);
    state.jobseekerToken = token;
  });

  await check("ผู้ดูแลระบบเข้าได้", async () => {
    state.admin = await login("admin@cyberjob.co.th", "Admin1234!");
    expectStatus(await call(ADMIN, "GET", "/admin/users", { token: state.admin }), 200);
  });

  const t = () => ({ token: state.admin });

  /* ------------------------------------------------------------ */
  section("Feature 5 – จัดการการประกาศงาน");

  await check("รายการประกาศงาน + แบ่งหน้าค่าเริ่มต้น 20", async () => {
    const response = await call(ADMIN, "GET", "/admin/jobs", t());
    expectStatus(response, 200);
    assert(response.json.pageSize === 20, `pageSize=${response.json.pageSize}`);
    assert(response.json.items.length <= 20, "มีรายการเกินหน้า");
    assert(response.json.total > 0, "ไม่มีประกาศงานจาก seed");
    state.jobTotal = response.json.total;
    // ประกาศที่ปิดอยู่ (เช่นฉบับร่างของผู้ประกอบการ) สมัครไม่ได้อยู่แล้ว จึงเลือกประกาศที่เปิดรับ
    state.firstJob = response.json.items.find((item) => item.isActive) ?? response.json.items[0];
  });

  await check("pageSize ที่ไม่ได้อยู่ใน 20/50/100 ได้ 400", async () => {
    expectStatus(await call(ADMIN, "GET", "/admin/jobs?pageSize=25", t()), 400);
  });

  await check("ตัวเลือก dropdown: อายุงาน 5 ช่วง และรายชื่อตำแหน่ง", async () => {
    const response = await call(ADMIN, "GET", "/admin/jobs/filters", t());
    expectStatus(response, 200);
    assert(response.json.experiences.length === 5, "อายุงานไม่ครบ 5 ช่วง");
    assert(response.json.titles.length > 0, "ไม่มีรายชื่อตำแหน่ง");
    state.title = response.json.titles[0];
  });

  await check("ค้นหาด้วยชื่อบริษัท", async () => {
    const company = state.firstJob.companyName.split(" ")[0];
    const response = await call(ADMIN, "GET", `/admin/jobs?q=${encodeURIComponent(company)}`, t());
    expectStatus(response, 200);
    assert(response.json.total > 0, "ค้นหาไม่เจอ");
    assert(
      response.json.items.every((job) => `${job.companyName} ${job.title}`.toLowerCase().includes(company.toLowerCase())),
      "ผลลัพธ์มีรายการที่ไม่ตรงคำค้น",
    );
  });

  await check("กรองตามตำแหน่งที่ต้องการ", async () => {
    const response = await call(ADMIN, "GET", `/admin/jobs?title=${encodeURIComponent(state.title)}`, t());
    expectStatus(response, 200);
    assert(response.json.items.every((job) => job.title === state.title), "มีตำแหน่งอื่นหลุดมา");
  });

  await check("กรองตามอายุงานที่ต้องการ", async () => {
    const response = await call(ADMIN, "GET", "/admin/jobs?experience=THREE_FIVE&pageSize=100", t());
    expectStatus(response, 200);
    assert(response.json.items.every((job) => job.experienceLevel === "THREE_FIVE"), "มีช่วงอายุงานอื่นหลุดมา");
  });

  await check("กรองตามเงินเดือนขั้นต่ำ", async () => {
    const response = await call(ADMIN, "GET", "/admin/jobs?salaryMin=40000&pageSize=100", t());
    expectStatus(response, 200);
    assert(response.json.items.every((job) => job.salaryMin >= 40000), "มีงานเงินเดือนต่ำกว่าขั้นต่ำ");
    assert(response.json.total < state.jobTotal, "ตัวกรองไม่ได้ตัดอะไรออกเลย");
  });

  await check("ลบประกาศงาน: หายจากหลังบ้านและหน้าเว็บทันที", async () => {
    const job = state.firstJob;
    // ผู้หางานสมัครงานนี้ไว้ก่อน เพื่อให้มีประวัติการสมัครที่ต้องไม่หายตามการลบ
    const apply = await call(MEMBER, "POST", "/me/applications", { token: state.jobseekerToken, body: { jobId: job.id } });
    assert([201, 409].includes(apply.status), `สมัครงานไม่ได้: ${apply.status}`);

    expectStatus(await call(MEMBER, "GET", `/jobs/${job.id}`), 200);
    expectStatus(await call(ADMIN, "DELETE", `/admin/jobs/${job.id}`, t()), 200);

    const after = await call(ADMIN, "GET", "/admin/jobs", t());
    assert(after.json.total === state.jobTotal - 1, `total ควรลดเหลือ ${state.jobTotal - 1} ได้ ${after.json.total}`);
    expectStatus(await call(MEMBER, "GET", `/jobs/${job.id}`), 404);
    // ประวัติการสมัครต้องยังอยู่ (Application มี onDelete: Cascade ถ้าลบแถว Job จริงจะหายหมด)
    // API ไม่มีช่องให้เห็นแถวนี้แล้ว จึงนับจากฐานข้อมูลโดยตรง
    const count = sql(`SELECT count(*) FROM "Application" WHERE "jobId" = '${job.id.replace(/'/g, "")}'`);
    if (count !== null) assert(Number(count) >= 1, "ประวัติการสมัครถูกลบตามไปด้วย");
  });

  await check("ลบซ้ำได้ 404", async () => {
    expectStatus(await call(ADMIN, "DELETE", `/admin/jobs/${state.firstJob.id}`, t()), 404);
  });

  await check("ผู้หางานที่ยังไม่เคยสมัคร สมัคร/บันทึกงานที่ถูกลบไม่ได้ (404)", async () => {
    const token = await login("somchai.j@example.com", "Candidate1234!");
    const apply = await call(MEMBER, "POST", "/me/applications", { token, body: { jobId: state.firstJob.id } });
    expectStatus(apply, 404);
    const bookmark = await call(MEMBER, "POST", "/me/bookmarks", { token, body: { jobId: state.firstJob.id } });
    expectStatus(bookmark, 404);
  });

  /* ------------------------------------------------------------ */
  section("Feature 3 – จัดการผู้ใช้");

  await check("การ์ดสรุป: ทั้งหมด / Cyberpay / ภายนอก และเปอร์เซ็นต์รวมกันได้ 100", async () => {
    const response = await call(ADMIN, "GET", "/admin/users/stats", t());
    expectStatus(response, 200);
    const { total, cyberpayIntern, outsider } = response.json;
    assert(cyberpayIntern.count + outsider.count === total, "จำนวนไม่รวมกันเป็นทั้งหมด");
    assert(cyberpayIntern.count >= 8, `Cyberpay จาก seed ต้องมีอย่างน้อย 8 ได้ ${cyberpayIntern.count}`);
    assert(Math.abs(cyberpayIntern.percent + outsider.percent - 100) <= 1, "เปอร์เซ็นต์ไม่รวมกันเป็น 100");
    state.stats = response.json;
  });

  await check("ตารางผู้สมัคร: นับตรงกับการ์ด และมีเฉพาะผู้หางาน", async () => {
    const response = await call(ADMIN, "GET", "/admin/users?pageSize=100", t());
    expectStatus(response, 200);
    assert(response.json.total === state.stats.total, "จำนวนในตารางไม่ตรงกับการ์ดสรุป");
    assert(!response.json.items.some((user) => user.email === "admin@cyberjob.co.th"), "บัญชีแอดมินหลุดมาในตาราง");
    state.users = response.json.items;
    state.anucha = response.json.items.find((user) => user.email === "anucha.m@example.com");
    state.supawadee = response.json.items.find((user) => user.email === "supawadee.k@example.com");
    state.narawit = response.json.items.find((user) => user.email === "narawit.u@example.com");
    assert(state.anucha && state.supawadee && state.narawit, "ไม่พบผู้สมัครตัวอย่างจาก seed");
  });

  await check("คำนวณจากเรซูเม่: อายุงาน ตำแหน่ง คะแนน และจำนวนใบประกาศ", async () => {
    const a = state.anucha;
    assert(a.experienceYears === 6, `อายุงาน ${a.experienceYears} ≠ 6`);
    assert(a.desiredPosition === "วิศวกร DevOps", `ตำแหน่ง ${a.desiredPosition}`);
    // สูตรถูกคัดลอกมาจาก GateService ฝั่ง member – ต้องได้เลขเดียวกับที่ member คำนวณเอง
    const token = await login("anucha.m@example.com", "Candidate1234!");
    const profile = await call(MEMBER, "GET", "/profile", { token });
    expectStatus(profile, 200);
    assert(typeof profile.json.completion === "number", "member ไม่คืนค่า completion");
    assert(a.resumeScore === profile.json.completion, `admin ${a.resumeScore} ≠ member ${profile.json.completion}`);
    assert(a.certificateCount === 3, `ใบประกาศ ${a.certificateCount} ≠ 3`);
    assert(/^CJ-\d{4,}$/.test(a.code), `รหัส ${a.code}`);
  });

  await check("ยังไม่ผ่าน Gate แสดงเป็นยังไม่ประเมิน (null)", async () => {
    assert(state.supawadee.resumeScore === null, `ได้ ${state.supawadee.resumeScore}`);
  });

  await check("ค้นหาด้วย UserID / Email", async () => {
    const byCode = await call(ADMIN, "GET", `/admin/users?q=${state.anucha.code}`, t());
    assert(byCode.json.items.some((user) => user.id === state.anucha.id), "ค้น UserID ไม่เจอ");
    const byEmail = await call(ADMIN, "GET", "/admin/users?q=somchai.j", t());
    assert(byEmail.json.total === 1, `ค้น Email ได้ ${byEmail.json.total} รายการ`);
  });

  await check("กรอง Cyberpay / ภายนอก", async () => {
    const cyberpay = await call(ADMIN, "GET", "/admin/users?source=CYBERPAY_INTERN&pageSize=100", t());
    assert(cyberpay.json.items.every((user) => user.source === "CYBERPAY_INTERN"), "มีคนภายนอกหลุดมา");
    assert(cyberpay.json.total === state.stats.cyberpayIntern.count, "จำนวนไม่ตรงการ์ด");
  });

  await check("เรียงตามอายุงาน มาก → น้อย และ น้อย → มาก", async () => {
    const desc = (await call(ADMIN, "GET", "/admin/users?sort=experience_desc&pageSize=100", t())).json.items;
    assert(desc.every((user, i) => i === 0 || desc[i - 1].experienceYears >= user.experienceYears), "desc ไม่เรียง");
    const asc = (await call(ADMIN, "GET", "/admin/users?sort=experience_asc&pageSize=100", t())).json.items;
    assert(asc.every((user, i) => i === 0 || asc[i - 1].experienceYears <= user.experienceYears), "asc ไม่เรียง");
  });

  await check("Export CSV: UTF-8 BOM, หัวตาราง, จำนวนแถว และกันสูตร Excel", async () => {
    const response = await call(ADMIN, "GET", "/admin/users/export.csv", t());
    expectStatus(response, 200);
    assert(response.headers.get("content-type").includes("text/csv"), "content-type ไม่ใช่ csv");
    assert(response.headers.get("content-disposition")?.includes("attachment"), "ไม่ได้สั่งดาวน์โหลด");
    const raw = new Uint8Array(
      await (await fetch(`${ADMIN}/admin/users/export.csv`, { headers: { Authorization: `Bearer ${state.admin}` } })).arrayBuffer(),
    );
    assert(raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf, "ไม่มี BOM – Excel จะอ่านภาษาไทยเพี้ยน");
    const lines = response.text.trim().split("\r\n");
    assert(lines[0].includes('"UserID"'), "หัวตารางไม่ถูกต้อง");
    assert(lines.length === state.stats.total + 1, `มี ${lines.length - 1} แถว ≠ ${state.stats.total}`);
  });

  await check("Popup ดู Resume", async () => {
    const response = await call(ADMIN, "GET", `/admin/users/${state.anucha.id}/resume`, t());
    expectStatus(response, 200);
    const r = response.json;
    assert(r.contact.email === "anucha.m@example.com" && r.contact.phone, "ข้อมูลติดต่อไม่ครบ");
    assert(r.desiredPositions.includes("วิศวกร DevOps"), "ไม่มีเป้าหมายทางอาชีพ");
    assert(r.educations[0]?.gpa === "3.25", "ไม่มี GPA");
    assert(r.workExperiences[0]?.period.includes("ปัจจุบัน"), "ช่วงเวลาทำงานไม่ถูกต้อง");
    assert(r.languages.length > 0, "ไม่มีข้อมูลภาษา");
    assert(r.projects === null, "seed ตัด projects ของผู้สมัครรายนี้ออก ควรได้ null");
    assert(r.specialties.length > 0, "ไม่มีทักษะเฉพาะทาง");
  });

  await check("Modal ใบประกาศนียบัตร", async () => {
    const response = await call(ADMIN, "GET", `/admin/users/${state.anucha.id}/certificates`, t());
    expectStatus(response, 200);
    assert(response.json.total === 3, `ได้ ${response.json.total} ใบ`);
    assert(response.json.items[0].issuer === "Amazon Web Services", "ไม่มีผู้ออกใบประกาศ");
  });

  await check("แก้ไข: ฟิลด์อื่นนอกจากแหล่งที่มาถูกปฏิเสธ (400)", async () => {
    const response = await call(ADMIN, "PATCH", `/admin/users/${state.anucha.id}`, {
      ...t(),
      body: { candidateSource: "OUTSIDER", name: "แฮ็ก" },
    });
    expectStatus(response, 400);
  });

  await check("แก้ไข: ค่าแหล่งที่มาที่ไม่รู้จักได้ 400", async () => {
    const response = await call(ADMIN, "PATCH", `/admin/users/${state.anucha.id}`, { ...t(), body: { candidateSource: "ALIEN" } });
    expectStatus(response, 400);
  });

  await check("แก้ไขแหล่งที่มาแล้วการ์ดสรุปเปลี่ยนตาม (แล้วตั้งกลับ)", async () => {
    const updated = await call(ADMIN, "PATCH", `/admin/users/${state.anucha.id}`, { ...t(), body: { candidateSource: "CYBERPAY_INTERN" } });
    expectStatus(updated, 200);
    assert(updated.json.source === "CYBERPAY_INTERN", "ค่าไม่ถูกบันทึก");
    const stats = (await call(ADMIN, "GET", "/admin/users/stats", t())).json;
    assert(stats.cyberpayIntern.count === state.stats.cyberpayIntern.count + 1, "การ์ดไม่เปลี่ยนตาม");
    expectStatus(await call(ADMIN, "PATCH", `/admin/users/${state.anucha.id}`, { ...t(), body: { candidateSource: "OUTSIDER" } }), 200);
  });

  await check("ลบบัญชีที่ไม่ใช่ผู้หางาน (ผู้ดูแลระบบ) ไม่ได้", async () => {
    const me = await call(MEMBER, "GET", "/auth/me", t());
    const response = await call(ADMIN, "DELETE", `/admin/users/${me.json.id}`, t());
    assert([400, 404].includes(response.status), `ได้ ${response.status}`);
  });

  await check("ลบผู้สมัคร แล้วหายจากตารางและลบซ้ำได้ 404", async () => {
    expectStatus(await call(ADMIN, "DELETE", `/admin/users/${state.narawit.id}`, t()), 200);
    const after = await call(ADMIN, "GET", "/admin/users", t());
    assert(after.json.total === state.stats.total - 1, "จำนวนไม่ลดลง");
    expectStatus(await call(ADMIN, "DELETE", `/admin/users/${state.narawit.id}`, t()), 404);
    expectStatus(await call(ADMIN, "GET", `/admin/users/${state.narawit.id}/resume`, t()), 404);
  });

  const failed = results.filter((result) => !result.ok);
  console.log(`\n\x1b[1m${results.length - failed.length}/${results.length} checks passed\x1b[0m`);
  if (failed.length) {
    for (const failure of failed) console.log(`  - ${failure.name}: ${failure.error}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`\nSmoke test aborted: ${error.message}`);
  process.exitCode = 1;
});
