import { fetchHelper } from ".";
import { Result, UserData } from "../types/data";

export async function getUserData(): Promise<UserData> {
    const result = await fetchHelper<UserData>("auth/me", "GET");
    if (!result.success) {
        console.log("Error executing getUserData: " + result.error);
        throw Error(result.error);
    }

    return result.data;
}
