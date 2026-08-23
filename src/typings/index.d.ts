import type {
    Client,
    ClientEvents,
    GuildTextBasedChannel,
    Message,
    PermissionResolvable,
    TextBasedChannel,
    UserResolvable
} from "discord.js-selfbot-v13";

import { BaseAgent } from "@/structure/BaseAgent.ts";
import { ExtendedClient } from "@/structure/core/ExtendedClient.ts";
import type { I18nPath, Locale, Translationfn } from "@/utils/locales.ts";

export type MaybePromise<T> = T | Promise<T>;

export interface CaptchaSolver {
    /**
     * Solves an image captcha from a buffer.
     * @param imageData The image data as a Buffer.
     * @returns A promise that resolves with the captcha solution text.
     */
    solveImage(imageData: Buffer): Promise<string>;

    /**
     * Solves an hCaptcha challenge.
     * @param sitekey The hCaptcha sitekey for the target website.
     * @param siteurl The URL of the page where the hCaptcha is present.
     * @returns A promise that resolves with the hCaptcha response token.
     */
    solveHcaptcha(sitekey: string, siteurl: string): Promise<string>;
}

export interface NotificationPayload {
    title: string;
    description: string;
    urgency: "normal" | "critical";
    sourceUrl?: string; // e.g., the URL to the captcha message
    imageUrl?: string;
    content: string;
    fields?: { name: string; value: string; inline?: boolean }[];
}

export interface NotifierStrategy {
    execute(params: FeatureFnParams, payload: NotificationPayload): Promise<void>;
}

type EventOptions<T extends keyof ClientEvents = keyof ClientEvents> = {
    name: string;
    event: T;
    once?: boolean;
    disabled?: boolean;
    handler: (params: BaseParams, ...args: ClientEvents[T]) => MaybePromise<unknown>;
}

interface BaseParams {
    agent: BaseAgent;
    t: Translationfn;
    locale: Locale;
}

export interface CommandParams extends BaseParams {
    message: Message
    args?: Array<string>;
    options?: {
        guildOnly?: boolean;
    }
}

type CommandOptions<InGuild extends boolean = boolean> = {
    cooldown?: number;
    permissions?: PermissionResolvable;
    guildOnly?: InGuild;
}

export interface CommandProps {
    name: string;
    description: I18nPath;
    aliases?: string[];
    usage?: string;

    options?: CommandOptions;
    params?: Map<string, any>;
    subCommandAliases?: Map<string, string>;
    execute: (args: CommandParams) => MaybePromise<unknown>;
}

interface HandlerParams extends BaseParams { }

type HandlerProps = {
    run: (args: HandlerParams) => MaybePromise;
}

interface FeatureFnParams extends BaseParams {
    // channel: GuildTextBasedChannel;
    // cooldown: Cooldown
}

type BaseFeatureOptions = {
    overrideCooldown?: boolean;
    cooldownOnError?: number;
    exclude?: boolean
}
export interface FeatureProps {
    name: string;
    options?: BaseFeatureOptions;
    cooldown: () => number;
    condition: (args: FeatureFnParams) => MaybePromise<boolean>;
    permissions?: PermissionResolvable;
    run: (args: FeatureFnParams) => MaybePromise<unknown>;
}

interface SendMessageOptions {
    channel: TextBasedChannel
    prefix?: string
    typing?: number
    skipLogging?: boolean
}

interface AwaitResponseOptions {
    channel?: GuildTextBasedChannel | TextBasedChannel;
    filter: (message: Message) => boolean;
    trigger: () => MaybePromise<unknown>;
    time?: number;
    max?: number;
    expectResponse?: boolean; // If true, waits for a response from the bot
}

interface AwaitSlashResponseOptions {
    channel?: GuildTextBasedChannel | TextBasedChannel;
    bot: UserResolvable;
    command: string;
    args?: any[];
    time?: number;
    max?: number;
}

interface CLICommand {
    command: string;
    description: string;
    handler: (args: any) => MaybePromise<unknown>;
}