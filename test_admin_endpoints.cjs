const jwt = require("jsonwebtoken");

const secret = "local-dev-access-secret-0123456789abcdef";
const token = jwt.sign(
  {
    sub: "admin_muf2y19j",
    email: "admin@cyberjob.co.th",
    role: "ADMIN",
  },
  secret,
  { expiresIn: "1h" }
);

async function test() {
  console.log("=== 1. Testing GET /api/v1/health ===");
  const healthRes = await fetch("http://localhost:3001/api/v1/health");
  console.log("Health:", await healthRes.json());

  console.log("\n=== 2. Testing GET /api/v1/admin/dashboard/stats ===");
  const dashRes = await fetch("http://localhost:3001/api/v1/admin/dashboard/stats", {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log("Dashboard Stats:", await dashRes.json());

  console.log("\n=== 3. Testing POST /api/v1/admin/synonyms/ai-suggest (Cybersecurity) ===");
  const aiRes1 = await fetch("http://localhost:3001/api/v1/admin/synonyms/ai-suggest", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ keyword: "Cybersecurity" }),
  });
  console.log("AI Suggestion (Cyber):", await aiRes1.json());

  console.log("\n=== 4. Testing POST /api/v1/admin/synonyms/ai-suggest (React) ===");
  const aiRes2 = await fetch("http://localhost:3001/api/v1/admin/synonyms/ai-suggest", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ keyword: "React" }),
  });
  console.log("AI Suggestion (React):", await aiRes2.json());

  console.log("\n=== 5. Testing GET /api/v1/admin/companies ===");
  const compRes = await fetch("http://localhost:3001/api/v1/admin/companies", {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log("Companies:", await compRes.json());

  console.log("\n=== 6. Testing GET /api/v1/admin/settings ===");
  const setRes = await fetch("http://localhost:3001/api/v1/admin/settings", {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log("Settings:", await setRes.json());
}

test().catch(console.error);
