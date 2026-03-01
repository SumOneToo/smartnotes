import { auth } from "@clerk/nextjs/server";

export async function requireUserId(): Promise<string> {
  const { userId } = auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  return userId;
}
