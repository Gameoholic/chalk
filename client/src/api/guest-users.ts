import { fetchHelper } from ".";
import { Result } from "../types/data";

export async function createGuestUser() {
    const result = await fetchHelper<undefined>("guest-users/", "POST");
    if (!result.success) {
        console.log("Error executing createGuestUser: " + result.error);
        throw Error(result.error);
    }
}
