/**
 * Test Clerk password sign-in + admin /api/auth/me
 */
const CLERK_PK = "pk_test_YXJyaXZpbmctbWFuLTU4LmNsZXJrLmFjY291bnRzLmRldiQ";
const CLERK_DOMAIN = "arriving-man-58.clerk.accounts.dev";
const EMAIL = "superadmin@asaancare.pk";
const PASSWORD = "AsaanCare@2025!";
const API = "http://127.0.0.1:3000";

async function main() {
  const signInRes = await fetch(
    `https://${CLERK_DOMAIN}/v1/client/sign_ins?__clerk_api_version=2025-04-10&_clerk_js_version=5.61.3`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Bearer ${CLERK_PK}`,
      },
      body: new URLSearchParams({
        identifier: EMAIL,
        password: PASSWORD,
        strategy: "password",
      }),
    },
  );

  const signInText = await signInRes.text();
  console.log("=== Clerk sign_in ===");
  console.log("status:", signInRes.status);
  console.log("body:", signInText.slice(0, 2000));

  let signInJson;
  try {
    signInJson = JSON.parse(signInText);
  } catch {
    return;
  }

  const sessionId = signInJson?.response?.created_session_id;
  const jwt =
    signInJson?.response?.last_active_token?.jwt ??
    signInJson?.client?.sessions?.[0]?.last_active_token?.jwt;

  if (!jwt) {
    console.log("No JWT in sign-in response");
    return;
  }

  console.log("\n=== /api/auth/me with Clerk JWT ===");
  const meRes = await fetch(`${API}/api/auth/me`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  const meText = await meRes.text();
  console.log("status:", meRes.status);
  console.log("body:", meText);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
