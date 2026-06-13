import { prisma } from "./prisma";
import { hashPin } from "./auth";

// Ensure a default admin account exists on first run (empty DB).
// Username: admin, PIN: from ADMIN_PIN env or "2026".
export async function bootstrapAdmin() {
  try {
    const count = await prisma.user.count();
    if (count > 0) return;
    const pin = process.env.ADMIN_PIN && /^\d{4,6}$/.test(process.env.ADMIN_PIN)
      ? process.env.ADMIN_PIN
      : "2026";
    await prisma.user.create({
      data: { username: "admin", pinHash: await hashPin(pin), role: "ADMIN" },
    });
    console.log(`✅ Utworzono konto administratora — login: admin, PIN: ${pin}`);
  } catch (e) {
    console.error("Bootstrap admin failed:", e);
  }
}
