import { CommandProps, EventOptions, FeatureProps, HandlerProps } from "@/typings/index.js";

import { ClientEvents } from "discord.js-selfbot-v13";

export class Schematic {
    static registerEvent = <T extends keyof ClientEvents>(args: EventOptions<T>): EventOptions<T> => {
        return args;
    }

    static registerCommand = (args: CommandProps) => {
        return args;
    }

    static registerFeature = (args: FeatureProps): FeatureProps => {
        return args;
    }

    static registerHandler = (args: HandlerProps) => {
        return args;
    }
}
