/**
 * instrumentation.ts — Next.js startup hook.
 * `register()` runs once when the server process boots.
 */
export async function register() {
  // Only run the Node-side checks (skip the Edge runtime invocation).
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertProdSecrets } = await import("@/shared/lib/startup");
    assertProdSecrets();
  }
}
