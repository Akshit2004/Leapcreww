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
export class LeapCrewwError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown
  ) {
    super(message);
    this.name = "LeapCrewwError";
    // Maintain a proper prototype chain in compiled JS (TS quirk).
    Object.setPrototypeOf(this, LeapCrewwError.prototype);
  }
}
