"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeapCrewwError = void 0;
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
class LeapCrewwError extends Error {
    constructor(message, status, body) {
        super(message);
        this.status = status;
        this.body = body;
        this.name = "LeapCrewwError";
        // Maintain a proper prototype chain in compiled JS (TS quirk).
        Object.setPrototypeOf(this, LeapCrewwError.prototype);
    }
}
exports.LeapCrewwError = LeapCrewwError;
//# sourceMappingURL=errors.js.map