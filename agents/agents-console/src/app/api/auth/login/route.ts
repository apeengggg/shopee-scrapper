import { cookies } from "next/headers";
import { createSession, sessionCookieName } from "@/lib/auth";
import { apiError, json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { loginInput } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const input = loginInput.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user || !verifyPassword(input.password, user.passwordHash)) {
      return json({ error: "Invalid email or password" }, { status: 401 });
    }

    const session = await createSession(user.id);
    const cookieStore = await cookies();
    cookieStore.set(sessionCookieName, session.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      expires: session.expiresAt,
      path: "/"
    });

    return json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    return apiError(error);
  }
}
