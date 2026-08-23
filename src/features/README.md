# Features Development Guide

This guide will help you create custom features for the Advanced Discord OwO Tool Farm.

## Overview

Features are modular automation components that handle specific tasks like hunting, praying, using items, etc. Each feature runs independently with its own cooldown and conditions.

## Feature Structure

All features follow this basic structure:

```typescript
import { Schematic } from "@/structure/Schematic.js";
import { ranInt } from "@/utils/math.js";
import { logger } from "@/utils/logger.js";

export default Schematic.registerFeature({
    name: "featureName",
    cooldown: () => ranInt(30_000, 60_000), // 30-60 seconds
    condition: async ({ agent, t, locale }) => {
        // Return true if feature should run
        return agent.config.enableFeature && !agent.captchaDetected;
    },
    run: async ({ agent, t, locale }) => {
        // Feature logic here
        await agent.send("owo command");
        logger.info(t("features.featureName.executed"));
    }
});
```

## Creating a Custom Feature

### Step 1: Create the Feature File

Create a new TypeScript file in the `src/features/` directory:

```bash
src/features/autoBuyRing.ts
```

### Step 2: Example - Auto Buy Ring Feature

Here's a complete example of an auto-buy ring feature:

```typescript
import { Schematic } from "@/structure/Schematic.js";
import { ranInt } from "@/utils/math.js";
import { logger } from "@/utils/logger.js";

export default Schematic.registerFeature({
    name: "autoBuyRing",
    cooldown: () => ranInt(60_000, 180_000), // 1-3 minutes randomized cooldown
    condition: async ({ agent, t, locale }) => {
        // Check if the feature is enabled in config
        if (!agent.config.autoBuyRing) return false;
        
        return true;
    },
    run: async ({ agent, t, locale }) => {
        // Option 1: send a single buy command
        await agent.send("owo buy ring");
        
        // Option 2: send and await for response
        const response = await agent.awaitResponse({
            timeout: 30_000, // 30 seconds timeout
            expectResponse: true,
            filter: (message) => {
                const content = message.content.toLowerCase();
                return content.includes("ring") || 
                    content.includes("cowoncy") || 
                    content.includes("purchased") ||
                    content.includes("don't have enough");
            }
        });
        if (!response) return;
    }
});
```

### Step 3: Add Configuration Schema

Add the configuration option to `src/schemas/ConfigSchema.ts`:

```typescript
// In ConfigSchema.ts, add to the schema:
autoBuyRing: z.boolean().default(true)
```

### Step 4: Add Translations

Add translations to locale files:

**`src/locales/en.json`:**
```json
{
    "features": {
        "autoBuyRing": {
            "attempting": "Attempting to buy a ring...",
            "success": "Successfully purchased a ring!",
            "noMoney": "Not enough cowoncy to buy ring",
            "noResponse": "No response received from buy ring command",
            "unknownResponse": "Unknown response: {content}",
            "error": "Error in autoBuyRing: {error}"
        }
    }
}
```

## Feature Development Best Practices

### 1. Cooldown Management

```typescript
// Use randomized cooldowns to avoid detection
cooldown: () => ranInt(60_000, 180_000), // 1-3 minutes

// Return custom cooldowns based on conditions
run: async ({ agent }) => {
    // ... feature logic ...
    
    if (noMoney) {
        return ranInt(300_000, 600_000); // 5-10 minutes when no money
    }
    
    if (error) {
        return ranInt(180_000, 300_000); // 3-5 minutes on error
    }
    
    // Use default cooldown if no return value
}
```

### 2. Condition Checking

```typescript
condition: async ({ agent, t, locale }) => {
    // Always check basic conditions
    if (!agent.config.featureName) return false;
    if (agent.captchaDetected) return false;
    if (agent.farmLoopPaused) return false;
    
    // Add feature-specific conditions
    if (agent.totalCommands < 10) return false; // Wait for bot to warm up
    
    // Time-based conditions
    const hour = new Date().getHours();
    if (hour >= 2 && hour <= 6) return false; // "Sleep" hours
    
    return true;
}
```

### 3. Response Handling

```typescript
// Always use timeout and proper filtering
const response = await agent.awaitResponse({
    timeout: 10_000,
    expectResponse: true,
    filter: (message) => {
        // Filter for relevant responses only
        return message.content.toLowerCase().includes("keyword");
    }
});

// Handle different response types
if (response) {
    const content = response.content.toLowerCase();
    
    if (content.includes("success_keyword")) {
        // Handle success
    } else if (content.includes("error_keyword")) {
        // Handle error
    }
}
```

### 4. Error Handling

```typescript
run: async ({ agent, t, locale }) => {
    try {
        // Feature logic here
        await agent.send("command");
        
    } catch (error) {
        logger.error(t("features.featureName.error", { error: error.message }));
        
        // Return longer cooldown on error to avoid spam
        return ranInt(180_000, 300_000);
    }
}
```

## Testing Your Feature

1. **Add to config.json:**
```json
{
    "autoBuyRing": true
}
```

2. **Test with verbose logging:**
```bash
npm start import config.json --verbose
```

3. **Monitor logs for:**
   - Feature execution messages
   - Cooldown timings
   - Error handling
   - Response processing

## Common Patterns

### 1. Item Purchase Feature
```typescript
// For buying items: rings, lootboxes, etc.
cooldown: () => ranInt(60_000, 180_000)
```

### 2. Daily Action Feature
```typescript
// For daily commands: daily, checklist
cooldown: () => 24 * 60 * 60 * 1000 // 24 hours
```

### 3. Battle/Combat Feature
```typescript
// For combat commands: battle, hunt
cooldown: () => ranInt(15_000, 30_000)
```

### 4. Social Feature
```typescript
// For social commands: pray, curse
cooldown: () => ranInt(30_000, 120_000)
```

## File Structure

```
src/features/
├── autoBattle.ts
├── autoClover.ts
├── autoCookie.ts
├── autoDaily.ts
├── autoHunt.ts
├── autoHuntbot.ts
├── autoPray.ts
├── autoQuote.ts
├── autoRPP.ts
├── autoReload.ts
├── autoSleep.ts
├── changeChannel.ts
├── autoBuyRing.ts  ← Your new feature
└── README.md       ← This file
```

## Tips for Advanced Features

1. **Use existing utilities:**
   - `ranInt()` for random numbers
   - `formatTime()` for time formatting
   - `shuffleArray()` for randomization

2. **Follow naming conventions:**
   - Feature files: `autoFeatureName.ts`
   - Feature names: `"autoFeatureName"`
   - Config keys: `autoFeatureName`

3. **Consider dependencies:**
   - Some features depend on others (huntbot depends on hunt)
   - Check if other features need to run first

4. **Performance considerations:**
   - Don't make features too frequent
   - Use appropriate timeouts
   - Handle rate limiting gracefully

Happy coding! 🚀
