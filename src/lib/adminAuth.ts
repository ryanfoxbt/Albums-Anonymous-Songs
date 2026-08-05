import { currentUser } from "@clerk/nextjs/server";

export async function isCurrentUserAdmin(): Promise<boolean> {
  const adminEmails = (process.env.ADMIN_EMAIL ?? "")
    .split(",")
    .map((email) => email.toLowerCase().trim())
    .filter(Boolean);
  if (adminEmails.length === 0) return false;

  const user = await currentUser();
  if (!user) return false;

  return user.emailAddresses.some((address) =>
    adminEmails.includes(address.emailAddress.toLowerCase()),
  );
}

export async function requireAdmin(): Promise<void> {
  if (!(await isCurrentUserAdmin())) {
    throw new Error("Not authorized.");
  }
}
