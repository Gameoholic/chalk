import * as Sentry from "@sentry/node";

Sentry.init({
    dsn: "https://c9f94b1866f2bb87870981e6d086ebd5@o4510975136432128.ingest.de.sentry.io/4510975149998160",
    // Setting this option to true will send default PII data to Sentry.
    // For example, automatic IP address collection on events
    sendDefaultPii: true,
});
