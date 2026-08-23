import lodash from "lodash"

import locales from "@/locales/index.js"
import { Path } from "@/typings/path-value.js";
import { logger } from "./logger.js";

export const translate = (locale: Locale) => {
    let data = locales[locale];
    if (!data) {
        logger.warn(`Locale "${locale}" not found, falling back to "en"`);
        process.env.LOCALE = "en"; // Set the environment variable to English if the locale is not found
        data = locales.en; // Fallback to English if the locale is not found
    }

    return (path: I18nPath, variables?: Record<string, any>) => {
        const template = lodash.get(data, path) as string;
        if (!template || typeof template !== 'string') {
            logger.warn(`Translation key "${path}" not found or invalid for locale "${locale}"`);
            return path;
        }

        if (!variables) {
            return template;
        }

        // Replace {variable} placeholders with actual values
        return template.replace(/\{(\w+)\}/g, (match: string, key: string) => {
            return variables[key] !== undefined ? String(variables[key]) : match;
        });
    }
}

export const i18n = (locale: Locale = "en") => {
    return {
        t: translate(locale),
        locale,
    }
}

// Dynamic exports that get the current locale from environment
export const t = (path: I18nPath, variables?: Record<string, any>) => {
    const currentLocale = process.env.LOCALE as Locale || "en";
    return translate(currentLocale)(path, variables);
}

// Function to get current locale dynamically
export const getCurrentLocale = (): Locale => {
    return process.env.LOCALE as Locale || "en";
}

// For backward compatibility - this will be the locale at module load time
// Components that need dynamic locale should use getCurrentLocale()
export const locale = process.env.LOCALE as Locale || "en";

export type I18nPath = Path<typeof locales[keyof typeof locales]>;
export type Translationfn = ReturnType<typeof translate>;
export type Locale = keyof typeof locales
