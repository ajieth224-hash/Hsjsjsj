import { Client, ClientOptions } from "discord.js-selfbot-v13";

import { SendMessageOptions } from "@/typings/index.js";
import { logger } from "@/utils/logger.js";
import { ranInt } from "@/utils/math.js";

export class ExtendedClient<Ready extends boolean = boolean> extends Client<Ready> {
    constructor(options: ClientOptions = {}) {
        super(options);
    }

    public registerEvents = () => {
        this.on("debug", logger.debug);
        this.on("warn", logger.warn);
        this.on("error", logger.error);
    }

    public sendMessage = async (
        message: string,
        {
            channel,
            prefix = "",
            typing = ranInt(500, 1000),
            skipLogging = false,
        }: SendMessageOptions
    ) => {
        await channel.sendTyping()
        await this.sleep(typing);

        const command = message.startsWith(prefix) ? message : `${prefix} ${message}`;

        channel.send(command);
        if (!skipLogging) logger.sent(command)
    }

    public checkAccount = (token?: string) => {
        return new Promise<string>((resolve, reject) => {
            this.once("ready", () => resolve(this.user?.id!));

            try {
                if (token) {
                    this.login(token)
                } else {
                    this.QRLogin()
                }
            } catch (error) {
                reject(error);
            }
        });
    }
}