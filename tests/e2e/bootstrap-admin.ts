import {
  guestUser,
  register,
  login,
  emailExists,
  closeDatabase,
} from "../../lib/store";
import { resolve } from "node:path";
import { query } from "../../lib/database";

// A fake owner only in the isolated local browser-test database.
if (
  process.env.CAREERMAP_DATABASE_PROVIDER !== "sqlite" ||
  process.env.VERCEL ||
  resolve(process.env.CAREERMAP_DATA_DIR || "") !== resolve(".data/e2e")
) {
  throw new Error("Administrator fixture requires the local E2E database.");
}
const email = "owner@ieum.example.invalid";
const password = "Local-e2e-password-12345";
try {
  await query("DELETE FROM announcements");
  if (!(await login(email, password))) {
    if (await emailExists(email))
      throw new Error("Unexpected existing E2E account.");
    const { user } = await guestUser();
    await register(user.id, email, password);
  }
} finally {
  await closeDatabase();
}
