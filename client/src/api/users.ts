import { fetchHelper } from ".";
import { Result } from "../types/data";

export async function createUser(
    email: string,
    password: string,
    displayName: string
) {
    const result = await fetchHelper<undefined>("users/", "POST", {
        email,
        password,
        displayName,
    });
    if (!result.success) {
        console.error("Error executing createUser: " + result.error);
        throw Error(result.error);
    }
}
