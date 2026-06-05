import { headers } from "next/headers";
import { createSafeActionClient } from "next-safe-action";
import authServer from "./auth/server";

export const action = createSafeActionClient({
  handleServerError(e) {
    if (e instanceof Error) {
      return e.message;
    }
    return "An unknown error occurred";
  },
});

export const authentificatedAction = action.use(async ({ next }) => {
  const session = await authServer.api.getSession({
    headers: await headers(),
  });

  //@ts-ignore
  if (!session || session.user.role !== "user") {
    throw new Error("Unauthorized.");
  }

  return next({
    ctx: {
      userId: session.user.id,
      user: session.user,
    },
  });
});

export const anyAuthenticatedAction = action.use(async ({ next }) => {
  const session = await authServer.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized.");
  }

  return next({
    ctx: {
      userId: session.user.id,
      user: session.user,
    },
  });
});
