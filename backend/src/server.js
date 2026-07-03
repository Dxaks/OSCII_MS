import { createApp } from "./app.js";
import { HOST, PORT } from "./config.js";
import { ensureDb, readDb, writeDb } from "./store/db.js";
import { hashPassword } from "./lib/auth.js";
import { makeId } from "./store/db.js";

const app = createApp();

async function start() {
  try {
    await ensureDb();
    await bootstrapAdminIfNeeded();

    const server = app.listen(PORT, HOST, () => {
      console.log(`Backend running on http://${HOST}:${PORT}`);
    });

    server.on("error", (error) => {
      console.error(`Failed to start backend on ${HOST}:${PORT}`);
      console.error(error.message);
      process.exit(1);
    });
  } catch (error) {
    console.error("Unable to connect to PostgreSQL.");
    console.error(
      "Make sure PostgreSQL is running and backend/.env DATABASE_URL matches your local setup.",
    );
    console.error(error.message);
    process.exit(1);
  }
}

async function bootstrapAdminIfNeeded() {
  const db = await readDb();

  if (db.users.length > 0) {
    return;
  }

  const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD || "admin123";

  db.users.push({
    id: makeId(),
    surname: "Admin",
    firstname: "System",
    username: "admin",
    role: "admin",
    admissionNo: null,
    image: "",
    passwordHash: hashPassword(adminPassword),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await writeDb(db);

  console.log(
    `Seeded default admin account: username=admin password=${adminPassword}`,
  );
}

start();
