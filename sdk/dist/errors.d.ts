/**
 * Thrown whenever the LeapCreww API returns a non-2xx status code.
 *
 * @example
 * try {
 *   await client.messages.send({ to: "+91...", text: "hi" });
 * } catch (err) {
 *   if (err instanceof LeapCrewwError && err.status === 402) {
 *     console.error("Top up your wallet:", err.message);
 *   }
 * }
 */
export declare class LeapCrewwError extends Error {
    readonly status: number;
    readonly body: unknown;
    constructor(message: string, status: number, body: unknown);
}
//# sourceMappingURL=errors.d.ts.map