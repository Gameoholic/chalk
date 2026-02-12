export type Result<S, E> =
    | { success: true; data: S }
    | { success: false; error: E };
export function ok<S>(data: S): Result<S, never> {
    return { success: true, data: data };
}

export function baseErr<
    const Reason extends string,
    E extends { reason: Reason; previousErrorReasons: string[] },
>({
    reason,
    previousErrorReasons = [],
}: {
    reason: Reason;
    previousErrorReasons?: string[];
}): Result<never, E> {
    return { success: false, error: { reason, previousErrorReasons } as E };
}

/**
 * If provided a previous error, will add its reason to this error's previousErrorReasons array (oldest first).
 * If the provided previous error doesn't have any previous error reasons, will provide an empty array.
 */
export function err<
    const Reason extends string,
    E extends { reason: string; previousErrorReasons?: string[] },
>({
    reason,
    previousError = null,
}: {
    reason: Reason;
    previousError?: E | null;
}) {
    const prevReasons = previousError?.previousErrorReasons ?? []; // we do this just to provide a default value in case previous error reasons wasn't provided (previousErrorReasons? <- this)
    return baseErr({
        reason: reason,
        previousErrorReasons: previousError
            ? // we do this because previousError is optional, but it has a default value of null
              [...prevReasons, previousError.reason]
            : [],
    });
}

/**
 * @returns The error reasons, latest first, separated by newlines.
 */
export function getCompleteErrorStack<
    const Reason extends string,
    E extends { reason: Reason; previousErrorReasons: string[] },
>(error: E) {
    return [error.reason, ...error.previousErrorReasons.reverse()].join("\n");
}
