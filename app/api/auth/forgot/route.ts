import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { newToken } from "@/lib/auth/auth";
import { sendPasswordReset } from "@/lib/email";
import { enforce } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const limited = enforce(req, "forgot", 5, 60_000);
  if (limited) return limited;

  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "")
    .trim()
    .toLowerCase();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ ok: true });

  const token = newToken();
  await prisma.passwordReset.create({
    data: { token, userId: user.id, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
  });
  const resetUrl = `${process.env.APP_URL || new URL(req.url).origin}/reset?token=${token}`;
  await sendPasswordReset(user.email, resetUrl);
  return NextResponse.json({ ok: true });
}
