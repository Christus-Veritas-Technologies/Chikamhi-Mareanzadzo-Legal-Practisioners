import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  clientPrefix: "EXPO_PUBLIC_",
  client: {
    EXPO_PUBLIC_SERVER_URL: z.url(),
  },
  // Metro only inlines EXPO_PUBLIC_* vars where it finds a literal, static
  // `process.env.EXPO_PUBLIC_XXX` reference to replace at bundle time — passing the whole
  // `process.env` object (as this used to) means the actual property lookup happens inside
  // @t3-oss/env-core's own code, which Metro never scans, so it silently stays undefined in
  // a production export. This was the actual cause of the "works in dev, crashes instantly
  // on launch in production" bug: createEnv()'s own zod validation threw on the missing
  // value. Spelling out the reference here lets Metro find and inline it correctly.
  runtimeEnv: {
    EXPO_PUBLIC_SERVER_URL: process.env.EXPO_PUBLIC_SERVER_URL,
  },
  emptyStringAsUndefined: true,
});
