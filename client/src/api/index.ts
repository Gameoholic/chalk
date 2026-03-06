import { Result } from "../types/data";

export * as GuestUsersAPI from "./guest-users.ts";
export * as BoardsAPI from "./boards.ts";
export * as AuthAPI from "./auth.ts";
export * as MeAPI from "./me.ts";
import { env } from "../env";

export async function fetchHelper<T>(
    path: string,
    method: string,
    parameters?: Record<string, any>
): Promise<Result<T>> {
    try {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), env.VITE_FETCH_TIMEOUT);

        const res = await fetch(env.VITE_API_URL + path, {
            method: method,
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
            signal: controller.signal,
            body: parameters ? JSON.stringify(parameters) : undefined,
        });

        const data = await res.json().catch(() => undefined);
        if (!res.ok) {
            let errorMsg = "Unknown error";

            if (data !== undefined && data.error !== undefined)
                errorMsg = data.error;
            else if (res.status === 404) errorMsg = "Resource not found (404)";
            else if (res.status === 401) errorMsg = "Unauthorized (401)";
            else if (res.status === 500) errorMsg = "Server error (500)";

            return { success: false, error: errorMsg };
        }

        if (
            (data === undefined || data.data === undefined) &&
            res.status !== 204
        ) {
            throw new Error("No data was provided with the response!");
        }

        return {
            success: true,
            data: res.status == 204 ? undefined : data.data,
        };
    } catch (err) {
        if (err instanceof Error) {
            return { success: false, error: err.message };
        }

        return { success: false, error: "Unknown error" };
    }
}
