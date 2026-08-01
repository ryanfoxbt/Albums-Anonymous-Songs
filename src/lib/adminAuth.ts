import { currentUser } from "@clerk/nextjs/server";

export async function isCurrentUserAdmin(): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  if (!adminEmail) return false;

  const user = await currentUser();
  if (!user) return false;

  return user.emailAddresses.some(
    (address) => address.emailAddress.toLowerCase() === adminEmail,
  );
}

export async function requireAdmin(): Promise<void> {
  if (!(await isCurrentUserAdmin())) {
    throw new Error("Not authorized.");
  }
}
