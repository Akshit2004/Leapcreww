"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpClient = void 0;
const errors_1 = require("./errors");
class HttpClient {
    constructor(baseUrl, apiKey, timeout) {
        this.baseUrl = baseUrl.replace(/\/$/, "");
        this.apiKey = apiKey;
        this.timeout = timeout;
    }
    async get(path, options = {}) {
        return this.request("GET", path, options);
    }
    async post(path, options = {}) {
        return this.request("POST", path, options);
    }
    async request(method, path, options) {
        const url = new URL(`${this.baseUrl}/api/v1${path}`);
        if (options.params) {
            for (const [k, v] of Object.entries(options.params)) {
                if (v !== undefined && v !== null)
                    url.searchParams.set(k, String(v));
            }
        }
        const headers = {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            "User-Agent": "@leapcreww/sdk/1.0.0",
            ...options.headers,
        };
        const signal = AbortSignal.timeout(this.timeout);
        const res = await fetch(url.toString(), {
            method,
            headers,
            body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
            signal,
        });
        let data;
        try {
            data = await res.json();
        }
        catch {
            data = {};
        }
        if (!res.ok) {
            const message = data?.error ?? `HTTP ${res.status} ${res.statusText}`;
            throw new errors_1.LeapCrewwError(message, res.status, data);
        }
        return data;
    }
}
exports.HttpClient = HttpClient;
//# sourceMappingURL=http.js.map