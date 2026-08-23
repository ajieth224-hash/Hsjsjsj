# Commands Development Guide

This guide will help you create custom commands for the Advanced Discord OwO Tool Farm bot.

## Overview

Commands are interactive functions that can be triggered by users through Discord messages or the bot's CLI interface. They provide control and information about the bot's operation.

## Command Structure

All commands follow this basic structure:

```typescript
import { Schematic } from "@/structure/Schematic.js";
import { logger } from "@/utils/logger.js";

export default Schematic.registerCommand({
    name: "commandname",
    description: "Brief description of what the command does",
    aliases: ["alias1", "alias2"], // Optional alternative names
    usage: "commandname [arguments]", // How to use the command
    handler: async (params, ...args) => {
        const { agent, t, locale } = params;
        
        // Command logic here
        logger.info("Command executed");
        return "Response message";
    }
});
```

## Creating a Custom Command

### Step 1: Create the Command File

Create a new TypeScript file in the `src/commands/` directory:

```bash
src/commands/shop.ts
```

### Step 2: Example - Shop Command

Here's a complete example of a shop command that shows OwO bot shop and allows purchasing items:

```typescript
import { Schematic } from "@/structure/Schematic.js";
import { logger } from "@/utils/logger.js";

export default Schematic.registerCommand({
    name: "shop",
    description: "View OwO shop and purchase items",
    aliases: ["store", "buy"],
    usage: "shop [item] [quantity]",
    handler: async (params, item?: string, quantity?: string) => {
        const { agent, t, locale } = params;

        try {
            // If no arguments, show the shop
            if (!item) {
                logger.info(t("commands.shop.showing"));
                await agent.send("owo shop");
                return t("commands.shop.displayed");
            }

            // Parse quantity (default to 1)
            const qty = quantity ? parseInt(quantity) : 1;
            if (isNaN(qty) || qty < 1) {
                return t("commands.shop.invalidQuantity");
            }

            // Validate item name
            const validItems = [
                "ring", "lootbox", "fabled", "gem", "cookie", "clover",
                "huntingrifle", "fishingpole", "cowboy", "exp", "lucky"
            ];

            const normalizedItem = item.toLowerCase().replace(/\s+/g, "");
            if (!validItems.some(validItem => normalizedItem.includes(validItem))) {
                return t("commands.shop.invalidItem", { 
                    item, 
                    validItems: validItems.join(", ") 
                });
            }

            // Check if bot is busy
            if (agent.captchaDetected) {
                return t("commands.shop.captchaActive");
            }

            if (agent.farmLoopPaused) {
                return t("commands.shop.botPaused");
            }

            logger.info(t("commands.shop.purchasing", { item, quantity: qty }));

            // Purchase the item
            const command = qty > 1 ? `owo buy ${qty} ${item}` : `owo buy ${item}`;
            await agent.send(command);

            // Wait for response
            const response = await agent.awaitResponse({
                timeout: 15_000,
                expectResponse: true,
                filter: (message) => {
                    const content = message.content.toLowerCase();
                    return content.includes(item.toLowerCase()) ||
                           content.includes("purchased") ||
                           content.includes("bought") ||
                           content.includes("don't have enough") ||
                           content.includes("cowoncy") ||
                           content.includes("invalid");
                }
            });

            if (!response) {
                return t("commands.shop.noResponse");
            }

            const responseContent = response.content.toLowerCase();

            // Parse different response types
            if (responseContent.includes("purchased") || responseContent.includes("bought")) {
                logger.info(t("commands.shop.success", { item, quantity: qty }));
                return t("commands.shop.purchaseSuccess", { item, quantity: qty });
            } 
            
            if (responseContent.includes("don't have enough")) {
                logger.warn(t("commands.shop.insufficientFunds"));
                return t("commands.shop.notEnoughMoney", { item });
            } 
            
            if (responseContent.includes("invalid") || responseContent.includes("not found")) {
                return t("commands.shop.itemNotFound", { item });
            }

            // Unknown response
            logger.warn(t("commands.shop.unknownResponse", { 
                response: response.content.slice(0, 100) 
            }));
            return t("commands.shop.unknownError");

        } catch (error) {
            logger.error(t("commands.shop.error", { error: error.message }));
            return t("commands.shop.executionError", { error: error.message });
        }
    }
});
```

### Step 3: Add Translations

Add translations to locale files:

**`src/locales/en.json`:**
```json
{
    "commands": {
        "shop": {
            "showing": "Displaying OwO shop...",
            "displayed": "Shop displayed successfully!",
            "invalidQuantity": "Invalid quantity. Please provide a positive number.",
            "invalidItem": "Invalid item '{item}'. Valid items: {validItems}",
            "captchaActive": "Cannot purchase items while captcha is active.",
            "botPaused": "Cannot purchase items while bot is paused.",
            "purchasing": "Purchasing {quantity}x {item}...",
            "noResponse": "No response received from shop command.",
            "success": "Successfully purchased {quantity}x {item}!",
            "purchaseSuccess": "✅ Purchased {quantity}x {item} successfully!",
            "insufficientFunds": "Not enough cowoncy for purchase.",
            "notEnoughMoney": "❌ Not enough cowoncy to buy {item}.",
            "itemNotFound": "❌ Item '{item}' not found in shop.",
            "unknownResponse": "Unknown shop response: {response}",
            "unknownError": "❌ Unknown error occurred during purchase.",
            "error": "Error in shop command: {error}",
            "executionError": "❌ Error executing shop command: {error}"
        }
    }
}
```

## Command Development Best Practices

### 1. Input Validation

```typescript
handler: async (params, arg1?: string, arg2?: string) => {
    const { agent, t, locale } = params;

    // Validate required arguments
    if (!arg1) {
        return t("commands.commandName.missingArgument");
    }

    // Validate argument types
    const numericArg = parseInt(arg2 || "1");
    if (isNaN(numericArg) || numericArg < 1) {
        return t("commands.commandName.invalidNumber");
    }

    // Validate argument values
    const validOptions = ["option1", "option2", "option3"];
    if (!validOptions.includes(arg1.toLowerCase())) {
        return t("commands.commandName.invalidOption", { 
            option: arg1, 
            validOptions: validOptions.join(", ") 
        });
    }
}
```

### 2. State Checking

```typescript
handler: async (params, ...args) => {
    const { agent, t, locale } = params;

    // Check bot state before executing
    if (agent.captchaDetected) {
        return t("commands.common.captchaActive");
    }

    if (agent.farmLoopPaused) {
        return t("commands.common.botPaused");
    }

    // Check if bot is ready
    if (!agent.client.isReady()) {
        return t("commands.common.botNotReady");
    }
}
```

### 3. Response Handling with Timeout

```typescript
// Send command and wait for response
await agent.send("owo command");

const response = await agent.awaitResponse({
    timeout: 10_000, // 10 seconds
    expectResponse: true,
    filter: (message) => {
        // Filter for relevant responses
        const content = message.content.toLowerCase();
        return content.includes("keyword1") || 
               content.includes("keyword2") ||
               content.includes("error_keyword");
    }
});

if (!response) {
    return t("commands.commandName.timeout");
}

// Process the response
const content = response.content.toLowerCase();
if (content.includes("success")) {
    return t("commands.commandName.success");
} else if (content.includes("error")) {
    return t("commands.commandName.error");
}
```

### 4. Error Handling

```typescript
handler: async (params, ...args) => {
    const { agent, t, locale } = params;

    try {
        // Command logic here
        await agent.send("command");
        return t("commands.commandName.success");
        
    } catch (error) {
        logger.error(t("commands.commandName.error", { error: error.message }));
        return t("commands.commandName.executionError", { error: error.message });
    }
}
```

## Common Command Patterns

### 1. Information Commands

```typescript
export default Schematic.registerCommand({
    name: "status",
    description: "Show bot status information",
    handler: async (params) => {
        const { agent, t } = params;
        
        const uptime = process.uptime();
        const commandCount = agent.totalCommands;
        const captchaStatus = agent.captchaDetected ? "Active" : "None";
        
        return t("commands.status.info", { 
            uptime: formatTime(0, uptime * 1000),
            commands: commandCount,
            captcha: captchaStatus
        });
    }
});
```

### 2. Control Commands

```typescript
export default Schematic.registerCommand({
    name: "pause",
    description: "Pause the farming loop",
    handler: async (params) => {
        const { agent, t } = params;
        
        if (agent.farmLoopPaused) {
            return t("commands.pause.alreadyPaused");
        }
        
        agent.farmLoopPaused = true;
        logger.info(t("commands.pause.paused"));
        return t("commands.pause.success");
    }
});
```

### 3. Action Commands

```typescript
export default Schematic.registerCommand({
    name: "hunt",
    description: "Force execute hunt command",
    handler: async (params) => {
        const { agent, t } = params;
        
        if (agent.captchaDetected) {
            return t("commands.hunt.captchaActive");
        }
        
        try {
            await agent.send("owo hunt");
            logger.info(t("commands.hunt.executed"));
            return t("commands.hunt.success");
        } catch (error) {
            return t("commands.hunt.error", { error: error.message });
        }
    }
});
```

### 4. Configuration Commands

```typescript
export default Schematic.registerCommand({
    name: "config",
    description: "View or modify configuration",
    usage: "config [key] [value]",
    handler: async (params, key?: string, value?: string) => {
        const { agent, t } = params;
        
        if (!key) {
            // Show current config
            return JSON.stringify(agent.config, null, 2);
        }
        
        if (!value) {
            // Show specific key
            const configValue = agent.config[key as keyof typeof agent.config];
            return t("commands.config.showValue", { key, value: configValue });
        }
        
        // Set value (validate first)
        try {
            // Parse value based on type
            let parsedValue: any = value;
            if (value === "true") parsedValue = true;
            else if (value === "false") parsedValue = false;
            else if (!isNaN(Number(value))) parsedValue = Number(value);
            
            // Update config
            (agent.config as any)[key] = parsedValue;
            return t("commands.config.updated", { key, value: parsedValue });
        } catch (error) {
            return t("commands.config.error", { error: error.message });
        }
    }
});
```

## Advanced Features

### 1. Command Aliases

```typescript
export default Schematic.registerCommand({
    name: "inventory",
    aliases: ["inv", "items", "bag"],
    description: "Check your OwO inventory",
    // ...rest of command
});
```

### 2. Argument Parsing

```typescript
handler: async (params, ...args) => {
    const { agent, t } = params;
    
    // Parse named arguments
    const namedArgs = {};
    const positionalArgs = [];
    
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg.startsWith('--')) {
            const key = arg.slice(2);
            const value = args[i + 1];
            namedArgs[key] = value;
            i++; // Skip next argument
        } else {
            positionalArgs.push(arg);
        }
    }
    
    // Use: shop ring --quantity 5
}
```

### 3. Confirmation Prompts

```typescript
handler: async (params, action?: string) => {
    const { agent, t } = params;
    
    if (action === "dangerous-action") {
        await agent.send(t("commands.commandName.confirmPrompt"));
        
        const confirmation = await agent.awaitResponse({
            timeout: 30_000,
            filter: (msg) => ["yes", "y", "confirm", "no", "n", "cancel"].includes(
                msg.content.toLowerCase().trim()
            )
        });
        
        if (!confirmation || !["yes", "y", "confirm"].includes(
            confirmation.content.toLowerCase().trim()
        )) {
            return t("commands.commandName.cancelled");
        }
    }
    
    // Proceed with action
}
```

## Testing Your Command

1. **Add command to the handlers:**
   The command should be automatically loaded by the command handler.

2. **Test via Discord:**
   ```
   !shop
   !shop ring
   !shop 5 lootbox
   ```

3. **Test via CLI:**
   ```bash
   npm start import config.json
   # In Discord: !shop ring 1
   ```

4. **Check logs:**
   - Command execution messages
   - Error handling
   - Response processing

## File Structure

```
src/commands/
├── eval.ts
├── pause.ts
├── ping.ts
├── reload.ts
├── resume.ts
├── say.ts
├── send.ts
├── status.ts
├── stop.ts
├── uptime.ts
├── shop.ts        ← Your new command
└── readme.md      ← This file
```

## Tips for Advanced Commands

1. **Use existing utilities:**
   - `formatTime()` for duration formatting
   - `ranInt()` for randomization
   - `logger` for consistent logging

2. **Follow naming conventions:**
   - Command files: `commandName.ts`
   - Command names: `"commandname"`
   - Keep names short and memorable

3. **Consider user experience:**
   - Provide helpful error messages
   - Include usage examples
   - Support common aliases
   - Validate input appropriately

4. **Handle edge cases:**
   - Bot offline/not ready
   - Network timeouts
   - Invalid user input
   - Rate limiting

5. **Security considerations:**
   - Validate all user input
   - Don't expose sensitive information
   - Limit dangerous operations
   - Use confirmation prompts for destructive actions

Happy coding! 🛠️
