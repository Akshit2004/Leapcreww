export interface RequestOptions {
    params?: Record<string, unknown>;
    body?: unknown;
    headers?: Record<string, string>;
}
export declare class HttpClient {
    private baseUrl;
    private apiKey;
    private timeout;
    constructor(baseUrl: string, apiKey: string, timeout: number);
    get<T>(path: string, options?: RequestOptions): Promise<T>;
    post<T>(path: string, options?: RequestOptions): Promise<T>;
    private request;
}
//# sourceMappingURL=http.d.ts.map