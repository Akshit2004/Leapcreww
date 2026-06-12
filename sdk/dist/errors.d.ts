/**
 * Thrown whenever the WappFlow API returns a non-2xx status code.
 *
 * @example
 * try {
 *   await client.messages.send({ to: "+91...", text: "hi" });
 * } catch (err) {
 *   if (err instanceof WappFlowError && err.status === 402) {
 *     console.error("Top up your wallet:", err.message);
 *   }
 * }
 */
export declare class WappFlowError extends Error {
    readonly status: number;
    readonly body: unknown;
    constructor(message: string, status: number, body: unknown);
}
//# sourceMappingURL=errors.d.ts.map