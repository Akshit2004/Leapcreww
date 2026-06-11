"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WappFlowError = void 0;
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
class WappFlowError extends Error {
    constructor(message, status, body) {
        super(message);
        this.status = status;
        this.body = body;
        this.name = "WappFlowError";
        // Maintain a proper prototype chain in compiled JS (TS quirk).
        Object.setPrototypeOf(this, WappFlowError.prototype);
    }
}
exports.WappFlowError = WappFlowError;
//# sourceMappingURL=errors.js.map