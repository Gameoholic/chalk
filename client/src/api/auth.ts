import { fetchHelper } from ".";
import { Result, UserData } from "../types/data";

export async function login(email: string, password: string) {
    const result = await fetchHelper<undefined>("auth/login", "POST", {
        email,
        password,
    });
    if (!result.success) {
        console.error("Error executing login: " + result.error);
        throw Error(result.error);
    }
}

export async function logout() {
    const result = await fetchHelper<undefined>("auth/logout", "POST", {});
    if (!result.success) {
        console.error("Error executing logout: " + result.error);
        throw Error(result.error);
    }
}
