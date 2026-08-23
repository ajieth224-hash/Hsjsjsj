import type { Locale } from "@/utils/locales.ts";

declare global {
    const LOCALE: Locale;
    namespace NodeJS {
        interface ProcessEnv {
            NODE_ENV: "development" | "production";
            LOCALE: Locale;
        }
    }
}

export {}