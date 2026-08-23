import { CaptchalyClient } from "captchaly";
import { CaptchaSolver } from "@/typings/index.js";

export class CaptchalySolver implements CaptchaSolver {
    private client: CaptchalyClient;

    constructor(apiKey: string) {
        this.client = new CaptchalyClient(apiKey);
    }

    public solveImage = async (imageData: Buffer): Promise<string> => {
        // Captchaly's official offering (Cloudflare Turnstile, reCAPTCHA v2/v3, hCaptcha,
        // hCaptcha Enterprise, Geetest - per https://captchaly.com/ pricing) does not
        // include plain image-to-text solving like 2captcha/YesCaptcha do, and the SDK
        // README does not expose a matching client method. If Captchaly adds this later,
        // swap this for the corresponding client.<method>() call.
        throw new Error(
            "[Captchaly] Plain image captcha solving is not supported by Captchaly. Use a different captchaAPI provider for image captchas, or check https://v1.captchaly.com/docs for updates."
        );
    }

    public solveHcaptcha = async (sitekey: string, siteurl: string): Promise<string> => {
        // Argument order/return shape inferred from the official SDK README's
        // `client.turnstile(url, sitekey)` -> `{ token }` example, since hCaptcha is
        // listed alongside Turnstile as a supported type. If `hcaptcha()` differs
        // (argument order, or throws on invalid args), adjust this call accordingly -
        // see https://github.com/captchaly/captchaly-typescript for the latest README.
        const result = await this.client.hcaptcha(siteurl, sitekey);
        return result.token;
    }
}
