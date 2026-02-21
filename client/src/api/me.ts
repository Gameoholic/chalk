import { fetchHelper } from ".";
import { Result, UserData } from "../types/data";

export async function getUserData(): Promise<UserData> {
    const result = await fetchHelper<UserData>("me", "GET");
    if (!result.success) {
        console.error("Error executing getUserData: " + result.error);
        throw Error(result.error);
    }

    return result.data;
}

export async function updateUserDisplayName(displayName: string) {
    const result = await fetchHelper<undefined>("me", "PUT", {
        displayName,
    });
    if (!result.success) {
        console.error("Error executing updateUserDisplayName: " + result.error);
        throw Error(result.error);
    }
}
