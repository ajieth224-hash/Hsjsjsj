Yes, **this code violates the Single Responsibility Principle (SRP)** quite extensively.

---

### 🔍 **What is SRP?**

**SRP (Single Responsibility Principle)** states that a class should have **one and only one reason to change**, meaning it should only have **one job or responsibility**.

---

### ❌ Violations of SRP in `BaseAgent`

The `BaseAgent` class does **way too much**, including but not limited to:

1. **Discord Client Lifecycle**:

   * Handles bot login and readiness.
   * Emits and manages Discord events.

2. **Command Dispatching & Execution**:

   * Stores, shuffles, and triggers bot commands.

3. **Quest and Checklist Logic**:

   * Parses messages to detect quests, logs, and checklists.

4. **Inventory Management**:

   * Fetches and parses inventory and gems.

5. **Message Sending Logic**:

   * Sends messages with delays and prefixes.
   * Logs sent commands and their context.

6. **Automation of Game Features**:

   * Automates daily, pray, quote, checklist, cookie, clover, and quest handling.

7. **Configuration & State Handling**:

   * Tracks cooldowns, reload times, and temporary settings.

8. **Logging & Debugging**:

   * Uses logger extensively across unrelated concerns.

---

### ✅ How to Refactor (`SRP`-compliant design)

Refactor by **splitting the class into multiple services/modules**, each with a single clear responsibility. Here’s a suggested breakdown:

---

#### 1. **`DiscordClientManager`**

**Responsibility**: Lifecycle & event management of the Discord bot.

```ts
class DiscordClientManager {
	constructor(private client: BaseAgent) {}

	public registerEvents() { ... }
	public checkAccount(token?: string): Promise<Client> { ... }
}
```

---

#### 2. **`CommandExecutor`**

**Responsibility**: Handle sending commands/messages and rate limiting.

```ts
class CommandExecutor {
	constructor(private client: BaseAgent) {}

	public send(message: string, options?: SendOptions) { ... }
	public ordinaryAction() { ... }
}
```

---

#### 3. **`QuestManager`**

**Responsibility**: Handle quest parsing, command enabling, rewards.

```ts
class QuestManager {
	constructor(private client: BaseAgent) {}

	public handleQuest() { ... }
	public handleChecklist() { ... }
}
```

---

#### 4. **`InventoryManager`**

**Responsibility**: Inventory parsing, gem detection, and gem usage.

```ts
class InventoryManager {
	constructor(private client: BaseAgent) {}

	public fetchInventory() { ... }
	public useGems(...) { ... }
}
```

---

#### 5. **`AutomationScheduler`**

**Responsibility**: Determine what automation should run based on conditions.

```ts
class AutomationScheduler {
	constructor(private client: BaseAgent) {}

	public getNextTasks(): CommandCondition[] { ... }
}
```

---

#### 6. **`StateTracker`**

**Responsibility**: Manages cooldowns, timers, and persistent state across features.

```ts
class StateTracker {
	public lastCommandTime: number;
	public reloadTime: number;
	public prayCooldown: number;
	// etc...
}
```

---

#### 7. **Main Agent Class (`BaseAgent`)**

**Responsibility**: Composition root – wires everything together, orchestrates flow.

```ts
export class BaseAgent extends Client {
	private commandExecutor: CommandExecutor;
	private questManager: QuestManager;
	private inventoryManager: InventoryManager;
	private scheduler: AutomationScheduler;
	private lifecycle: DiscordClientManager;

	constructor(...) {
		super(...);
		// initialize helpers
	}

	public mainLoop() {
		// just orchestrates feature calls in a loop
	}
}
```

---

### ✨ Benefits of SRP Refactor

* ✅ Easier to **test** each feature independently.
* ✅ More **readable** and **maintainable**.
* ✅ Easier to **extend** or replace features (e.g., plug in new command handling).
* ✅ Enables **separation of concerns** and avoids fragile code.

---

### 🔚 Final Advice

Don't try to refactor all at once. Start by **extracting responsibilities** into separate classes/files (e.g., quest handling, inventory logic). Use dependency injection or composition to wire them back into `BaseAgent`.

Would you like a starting example of one of these refactors (like `CommandExecutor`)?


Great — here's a structured and complete breakdown of how to refactor your `BaseAgent` into **SRP-compliant modules**. Each module is designed with one clear responsibility, following best practices for clean architecture and maintainability.

---

## 🧠 Overview of Refactor Strategy

We'll split `BaseAgent` into the following components:

| Class/Module           | Responsibility                               |
| ---------------------- | -------------------------------------------- |
| `BaseAgent`            | Orchestration & composition root             |
| `DiscordClientManager` | Event registration & login logic             |
| `CommandExecutor`      | Message sending and command triggering       |
| `QuestManager`         | Handling quest logic and temporary features  |
| `InventoryManager`     | Inventory parsing and gem usage              |
| `AutomationScheduler`  | Determines which automated tasks to run      |
| `StateTracker`         | Holds cooldowns, timeouts, and configuration |

---

## ✅ 1. `BaseAgent` (Core Composition)

```ts
export class BaseAgent extends Client {
	public config!: Configuration;
	public cache!: Configuration;

	public state: StateTracker;
	public commandExecutor: CommandExecutor;
	public questManager: QuestManager;
	public inventoryManager: InventoryManager;
	public scheduler: AutomationScheduler;
	public clientManager: DiscordClientManager;

	constructor(options: AgentOptions = {}) {
		super(options.options);
		this.state = new StateTracker(this);

		// Composition
		this.commandExecutor = new CommandExecutor(this);
		this.questManager = new QuestManager(this);
		this.inventoryManager = new InventoryManager(this);
		this.scheduler = new AutomationScheduler(this);
		this.clientManager = new DiscordClientManager(this);
	}

	public run(config: Configuration) {
		this.config = config;
		this.cache = structuredClone(config);
		this.clientManager.registerEvents();
	}
}
```

---

## ✅ 2. `DiscordClientManager`

```ts
export class DiscordClientManager {
	constructor(private agent: BaseAgent) {}

	public registerEvents() {
		this.agent.once("ready", async () => {
			logger.info("Logged in as " + this.agent.user?.displayName);
			// RPC, commands, presence etc.
		});

		// External handlers
		owoHandler(this.agent);
		commandHandler(this.agent);
		dmsHandler(this.agent);
	}

	public async checkAccount(token?: string): Promise<Client> {
		return new Promise((resolve, reject) => {
			this.agent.once("ready", () => resolve(this.agent));
			try {
				token ? this.agent.login(token) : this.agent.QRLogin();
			} catch (error) {
				reject(error);
			}
		});
	}
}
```

---

## ✅ 3. `CommandExecutor`

```ts
export class CommandExecutor {
	constructor(private agent: BaseAgent) {}

	public async send(message: string, options: SendOptions = {}) {
		if (this.agent.state.captchaDetected || this.agent.state.paused) return;
		// Delay, prefix, send, logging logic
	}

	public async ordinaryAction() {
		const cmd = this.agent.state.owoCommands.random();
		await this.send(cmd);
		// Logic for triggering gem if needed
	}
}
```

---

## ✅ 4. `QuestManager`

```ts
export class QuestManager {
	constructor(private agent: BaseAgent) {}

	public async handleQuest() {
		await this.agent.commandExecutor.send("quest");
		// Collect message, parse quest logs
		// Update config, enable temporary features
	}

	public async handleChecklist() {
		await this.agent.commandExecutor.send("checklist");
		// Parse checklist logic here
	}
}
```

---

## ✅ 5. `InventoryManager`

```ts
export class InventoryManager {
	constructor(private agent: BaseAgent) {}

	public async fetchAndUseGems(useGem1: boolean, useGem2: boolean, useGem3: boolean) {
		await this.agent.commandExecutor.send("inv");
		// Collect inventory message, parse gems
		// Use appropriate gems
	}
}
```

---

## ✅ 6. `AutomationScheduler`

```ts
export class AutomationScheduler {
	constructor(private agent: BaseAgent) {}

	public getScheduledTasks(): CommandCondition[] {
		const config = this.agent.config;
		const now = Date.now();

		return [
			{
				condition: () => config.autoDaily,
				action: () => this.agent.commandExecutor.send("daily")
			},
			{
				condition: () => config.autoQuote.length > 0,
				action: () => this.agent.commandExecutor.send("quote") // or owo
			},
			{
				condition: () => config.autoPray.length > 0 &&
								now - this.agent.state.toutPray >= 360_000,
				action: () => this.agent.commandExecutor.send("pray")
			},
			// Add others similarly...
		];
	}
}
```

---

## ✅ 7. `StateTracker`

```ts
export class StateTracker {
	public lastCommandTime = 0;
	public reloadTime = Date.now() + 60_000;
	public toutPray = 0;
	public toutOther = 0;
	public captchaDetected = false;
	public paused = false;

	public readonly owoID = "408785106942164992";
	public readonly prefix = "owo";
	public readonly owoCommands = shuffleArray([
		...Array<string>(5).fill("hunt"),
		...Array<string>(5).fill("battle"),
	]);

	constructor(private agent: BaseAgent) {}
}
```

---

## 🧩 Optional: Helper Utilities

You can also split utilities like `sleep`, `ranInt`, `shuffleArray`, etc., into a shared helper module.

---

## 🚀 Final Touch: Orchestrate in `mainLoop`

In `BaseAgent`, the `mainLoop` simply becomes:

```ts
public async mainLoop() {
	if (this.state.paused || this.state.captchaDetected) return;

	const commands = shuffleArray(
		this.scheduler.getScheduledTasks().concat(this.state.questCommands)
	);

	for (const command of commands) {
		if (command.condition()) await command.action();
		await sleep(ranInt(1000, 3000)); // avoid flooding
	}
	await sleep(ranInt(2000, 5000));
	this.mainLoop();
}
```

---

## 🧱 Folder Structure Suggestion

```
src/
├── agent/
│   ├── BaseAgent.ts
│   ├── DiscordClientManager.ts
│   ├── CommandExecutor.ts
│   ├── QuestManager.ts
│   ├── InventoryManager.ts
│   ├── AutomationScheduler.ts
│   ├── StateTracker.ts
├── utils/
│   ├── utils.ts
│   ├── logger.ts
│   └── timeHandler.ts
├── handlers/
│   └── ... (owoHandler, commandHandler, etc.)
```

---

Would you like code templates scaffolded for each file/module based on this breakdown?

Yes, the `ConfigManager` class **violates the Single Responsibility Principle (SRP)** as well. It tries to manage **too many concerns** in one class, making it hard to maintain or extend.

---

### 🔍 **SRP Violations in `ConfigManager`**

This class is responsible for:

1. **File system operations**

   * Reading/writing config files.
   * Handling legacy file migration.

2. **User input and CLI UI**

   * Interactive prompts using `@inquirer/prompts`.

3. **Discord login handling**

   * Calling `BaseAgent.checkAccount()`.

4. **Configuration structure and validation**

   * Assembling and validating the `Configuration` object.

5. **Account management**

   * Selecting, exporting, deleting accounts.

Each of these is a distinct responsibility and should be separated for clarity, testability, and maintainability.

---

### ✅ Suggested Refactor: SRP-Friendly Modules

Break `ConfigManager` into **4 or more distinct classes**:

| Class                | Responsibility                                |
| -------------------- | --------------------------------------------- |
| `ConfigStorage`      | Read/write `data.json`, handle paths          |
| `CLIAccountSelector` | Prompt for account choice and action          |
| `ConfigEditor`       | Interactive creation/editing of configuration |
| `LoginManager`       | Run/check login via `BaseAgent`               |
| `ConfigManager`      | **Orchestrator** – coordinates the above      |

---

### ✅ 1. `ConfigStorage`

```ts
export class ConfigStorage {
	private folderPath = path.resolve(os.homedir(), "b2ki-ados");
	private dataPath = path.resolve(this.folderPath, "data.json");

	constructor() {
		if (!fs.existsSync(this.folderPath)) {
			fs.mkdirSync(this.folderPath, { recursive: true });
			fs.writeFileSync(this.dataPath, JSON.stringify({}, null, 4));
		}
	}

	public load(): Record<string, Configuration> {
		return JSON.parse(fs.readFileSync(this.dataPath, "utf-8"));
	}

	public save(data: Record<string, Configuration>) {
		fs.writeFileSync(this.dataPath, JSON.stringify(data, null, 4));
	}

	public getPath(): string {
		return this.dataPath;
	}
}
```

---

### ✅ 2. `CLIAccountSelector`

Handles account selection, token input, and action selection.

```ts
export class CLIAccountSelector {
	constructor(private accounts: Record<string, Configuration>) {}

	async chooseAccount(): Promise<string | undefined> {
		return select({ ... }); // Your existing listAccount() logic
	}

	async chooseAction(hasConfig: boolean): Promise<"run" | "edit" | "export" | "delete"> {
		return select({ ... }); // Your existing accountAction() logic
	}

	async inputToken(): Promise<string> {
		return input({ ... }); // Your getToken() logic
	}
}
```

---

### ✅ 3. `ConfigEditor`

Encapsulates all the prompt/input logic to edit configuration options. This part is long, so you can break it down further by category (notifications, combat, quote, crates, etc.)

```ts
export class ConfigEditor {
	constructor(private agent: BaseAgent) {}

	public async edit(existing?: Configuration): Promise<Configuration> {
		// Use prompts to edit and return a new config object
		const config: Configuration = { ...existing };
		config.guildID = (await this.selectGuild()).id;
		config.channelID = await this.selectChannels(...);
		config.autoDaily = await this.confirmToggle("Auto daily?");
		// ...
		return config;
	}
}
```

---

### ✅ 4. `LoginManager`

```ts
export class LoginManager {
	constructor(private agent: BaseAgent) {}

	async login(token?: string): Promise<void> {
		try {
			await this.agent.checkAccount(token);
		} catch (error) {
			logger.error("Login failed:", error);
			process.exit(-1);
		}
	}
}
```

---

### ✅ 5. `ConfigManager` (Coordinator)

Now simplified to just coordinate the workflow.

```ts
export class ConfigManager {
	private static instance: ConfigManager;

	constructor(
		private agent: BaseAgent,
		private storage = new ConfigStorage(),
		private editor = new ConfigEditor(agent),
		private loginManager = new LoginManager(agent)
	) {}

	public static getInstance(agent: BaseAgent): ConfigManager {
		if (!ConfigManager.instance) {
			ConfigManager.instance = new ConfigManager(agent);
		}
		return ConfigManager.instance;
	}

	public async collectData(): Promise<Configuration> {
		console.clear();
		await checkUpdate();

		const rawData = this.storage.load();
		const selector = new CLIAccountSelector(rawData);
		let config: Configuration | undefined;
		let cache: Configuration | undefined;

		let token = await selector.chooseAccount();
		if (token === "token") token = await selector.inputToken();

		await this.loginManager.login(token);
		const userID = this.agent.user?.id!;
		cache = rawData[userID];

		if (!cache) {
			config = await this.editor.edit();
		} else {
			const action = await selector.chooseAction(!!cache);
			switch (action) {
				case "run":
					config = cache;
					break;
				case "edit":
					config = await this.editor.edit(cache);
					break;
				case "export":
					fs.writeFileSync(`${this.agent.user?.username}.json`, JSON.stringify(cache, null, 4));
					logger.info("Exported.");
					process.exit(0);
				case "delete":
					delete rawData[userID];
					this.storage.save(rawData);
					logger.info("Deleted.");
					process.exit(0);
			}
		}

		rawData[userID] = config!;
		this.storage.save(rawData);
		logger.info("Saved config.");

		return config!;
	}
}
```

---

### ✅ Benefits of This Refactor

* **SRP compliant**: Each module handles exactly one job.
* **Testable**: You can unit test the CLI logic, config parsing, or login separately.
* **Modular**: Swap storage backend, edit prompts, or login logic easily.
* **Reusable**: `ConfigStorage` and `LoginManager` can be reused in other contexts (e.g., headless mode, web GUI, etc.)

---

Would you like a file-by-file scaffold of this refactor so you can copy and implement it gradually?

Great! Since you're planning to refactor your architecture into clean SRP-based modules and want to maintain clarity and separation of concerns, here's a **new folder structure** recommendation tailored for your project.

---

## 🧱 **Refactored Folder Structure**

```
project-root/
│
├── .gitignore
├── index.ts
├── package.json
├── tsconfig.json
├── README.md
├── run.bat
├── test.js
├── LICENSE
├── SECURITY.md
├── CHANGELOG.md
├── obfuscate.cmd
│
├───docs/
│   └───security/
│       └───[Mid0aria] owofarmbot_stable/
│
├───logs/
│   └── console.log
│
├───src/
│
│   ├───main/                     # App entry and orchestration
│   │   ├── App.ts                # Entry composition root
│   │   └── Bootstrap.ts          # Initialization logic (e.g., run.ts logic)
│
│   ├───core/                     # Domain logic (SRP modules here)
│   │   ├── BaseAgent.ts
│   │   ├── CommandExecutor.ts
│   │   ├── QuestManager.ts
│   │   ├── InventoryManager.ts
│   │   ├── StateTracker.ts
│   │   ├── AutomationScheduler.ts
│   │   ├── DiscordClientManager.ts
│   │   └── LoginManager.ts
│
│   ├───config/                   # Configuration management
│   │   ├── ConfigManager.ts
│   │   ├── ConfigEditor.ts
│   │   ├── ConfigStorage.ts
│   │   ├── CLIAccountSelector.ts
│   │   └── prompts/              # Subfolder for all CLI prompt helpers
│   │       ├── notifyPrompts.ts
│   │       ├── tokenPrompt.ts
│   │       └── otherPrompts.ts
│
│   ├───commands/                 # CLI or bot commands
│   │   ├── config.ts
│   │   ├── help.ts
│   │   ├── say.ts
│   │   └── ...
│
│   ├───features/                 # Isolated features (can later be converted into plugins)
│   │   ├── captcha.ts
│   │   ├── checklist.ts
│   │   ├── notify.ts
│   │   ├── presence.ts
│   │   ├── quest.ts
│   │   ├── sweeper.ts
│   │   ├── update.ts
│   │   └── ...
│
│   ├───handlers/                 # Event/message handlers
│   │   ├── commandHandler.ts
│   │   ├── dmsHandler.ts
│   │   └── owoHandler.ts
│
│   ├───security/                 # Encryption/decryption modules
│   │   ├── encrypt.ts
│   │   ├── decrypt.ts
│   │   └── ...
│
│   ├───shared/                   # Shared utilities and helpers
│   │   ├── logger.ts
│   │   ├── utils.ts
│   │   └── timeHandler.ts
│
│   ├───typings/                  # Type definitions and constants
│   │   ├── typings.ts
│   │   └── quotes.ts
│
└───tree.txt                      # Your old structure snapshot (keep for reference)
```

---

## 📌 Key Improvements

* **`main/`**: Separates the **bootstrapping logic** from the core agent logic.
* **`core/`**: Contains **SRP-focused service classes** (e.g., `CommandExecutor`, `QuestManager`).
* **`config/`**: Handles all user input and file storage logic cleanly, broken into editable modules.
* **`features/`**: Groups feature-specific logic (daily, questing, etc.) in one place.
* **`shared/`**: For common utility functions and shared code.
* **`handlers/`**: Keeps Discord message/command handling cleanly separated.

---

## 🛠 Suggested Next Steps

1. **Copy and rename existing files** into their new locations (gradually).
2. **Create `index.ts`/`App.ts`** in `main/` to serve as the app's entry point.
3. **Adjust import paths** after moving files.
4. **Break monolithic files** (e.g., `ConfigManager`) into smaller components in `config/`.

---

If you want, I can generate a basic `App.ts` and `Bootstrap.ts` to show how you could wire the system together in this new structure. Would you like that?

Here’s a minimal example of how you can build a “bot status” dashboard like your screenshot using **blessed-contrib’s** grid layout. It will automatically resize when the terminal size changes, and you can plug in your own data-update logic.

```ts
import blessed from 'blessed';
import contrib from 'blessed-contrib';

async function startDashboard() {
  // 1. Create a screen
  const screen = blessed.screen({
    smartCSR: true,
    title: 'Bot Status Dashboard'
  });

  // Quit on ESC, q, or Ctrl+C
  screen.key(['escape', 'q', 'C-c'], () => process.exit(0));

  // 2. Make a 12×12 grid
  const grid = new contrib.grid({ rows: 12, cols: 12, screen });

  // 3. Add widgets to the grid
  // 3.1 Bot status box
  const statusBox = grid.set(0, 0, 3, 4, contrib.log, {
    label: 'Run Status',
    fg: 'green',
    selectedFg: 'green',
    padding: { left: 1 }
  });
  statusBox.log('status: OK');
  statusBox.log('uptime: 00:12:34');

  // 3.2 Total Commands line chart
  const cmdLine = grid.set(0, 4, 5, 8, contrib.line, {
    label: 'Total Commands',
    showLegend: true,
    legend: { width: 10 }
  });

  // 3.3 Errors Rate line chart
  const errLine = grid.set(3, 0, 3, 4, contrib.line, {
    label: 'Error Rate',
    showLegend: false
  });

  // 3.4 CPU utilization bar chart
  const cpuBar = grid.set(3, 4, 3, 4, contrib.bar, {
    label: 'CPU %',
    barWidth: 4,
    barSpacing: 2,
    xOffset: 2,
    maxHeight: 100
  });

  // 3.5 Active Processes table
  const procTable = grid.set(3, 8, 3, 4, contrib.table, {
    keys: true,
    fg: 'green',
    label: 'Active Processes',
    columnSpacing: 1,
    columnWidth: [20, 6]   // Process name, %CPU
  });
  procTable.setData({
    headers: ['Process', 'CPU'],
    data: [
      ['node', '12'],
      ['grep', '4'],
      ['timer', '2']
    ]
  });

  // 3.6 World map
  const map = grid.set(6, 0, 3, 6, contrib.map, { label: 'Servers Location' });
  map.addMarker({ lon: -122.33, lat: 47.61, color: 'red', char: 'X' }); // e.g. Seattle
  map.addMarker({ lon: 2.35, lat: 48.85, color: 'yellow', char: 'Y' });  // e.g. Paris

  // 3.7 Throughput line chart
  const thrLine = grid.set(6, 6, 3, 6, contrib.line, {
    label: 'Throughput (kb/s)',
    showLegend: true,
    legend: { width: 8 }
  });

  // 3.8 Percent Donut
  const donut = grid.set(9, 0, 3, 4, contrib.donut, {
    label: 'Storage Usage',
    radius: 8,
    arcWidth: 3,
    yPadding: 2
  });
  donut.setData([
    { percent: 65, label: 'Used' }
  ]);

  // 3.9 Storage sparkline
  const spark = grid.set(9, 4, 3, 4, contrib.sparkline, {
    label: 'Disk I/O',
    tags: true,
    style: { fg: 'blue' }
  });
  spark.setData([ [ 5,10,5,20,15,10,5 ] ]);

  // 3.10 Server log (scrolling text)
  const logBox = grid.set(9, 8, 3, 4, contrib.log, {
    label: 'Server Log',
    fg: 'white'
  });
  logBox.log('Server started');
  logBox.log('Connected to database');

  // 4. Render once
  screen.render();

  // 5. Hook up your real-time updates
  setInterval(() => {
    // Example: push a new data point every second
    const t = new Date().toLocaleTimeString();

    // Update total commands chart
    const newCmdData = {
      title: 'Bot1',
      x: [ ...(cmdLine.lines[0]?.x || []).slice(-30), t ],
      y: [ ...(cmdLine.lines[0]?.y || []).slice(-30), Math.random() * 100 ]
    };
    cmdLine.setData([ newCmdData ]);

    // Update error rate
    errLine.setData([{
      x: [ t ],
      y: [ Math.random() * 10 ]
    }]);

    // Update CPU bars
    cpuBar.setData({
      titles: ['Bot1','Bot2','DB'],
      data: [ Math.random()*100, Math.random()*100, Math.random()*100 ]
    });

    // Update processes table
    procTable.setData({
      headers: ['Process','CPU'],
      data: [
        ['node', (Math.random()*50).toFixed(1)],
        ['ts-node', (Math.random()*30).toFixed(1)],
        ['timer', (Math.random()*10).toFixed(1)]
      ]
    });

    // Sparkline
    spark.setData([ [...spark.data[0].slice(1), Math.random()*30 ] ]);

    // LogBox
    logBox.log(`${t} — heartbeat`);

    screen.render();
  }, 1000);

  // 6. Auto-resize is built in to grid—no extra code necessary
}

startDashboard();
```

### 🔑 What’s going on here?

1. **`grid.set(row, col, rowSpan, colSpan, widget, opts)`**
   Divides your screen into a 12×12 grid. All widgets will scale proportionally when you resize the terminal.

2. **Widgets**

   * **`contrib.line`** for time-series charts
   * **`contrib.bar`** for bar charts
   * **`contrib.table`** for tabular data
   * **`contrib.map`** for ASCII world maps
   * **`contrib.donut`** for donut charts
   * **`contrib.sparkline`** for micro-charts
   * **`contrib.log`** for scrolling text

3. **Real-time updates**
   In the `setInterval` you call `.setData(...)` or `.log(...)` on each widget, then `screen.render()` to repaint.

4. **Responsive**
   Because everything lives in the `contrib.grid`, you get automatic resizing for free. You can even hook `screen.on('resize')` if you need to completely reflow or swap layouts at certain widths.

---

#### ▶️ Give it a try

* Copy/paste the snippet into a file, e.g. `dashboard.ts`.

* Install dependencies:

  ```bash
  npm install blessed blessed-contrib
  npm install -D ts-node typescript @types/blessed @types/blessed-contrib
  ```

* Run with:

  ```bash
  npx ts-node dashboard.ts
  ```

You’ll get a fully responsive TUI rack of status panels—you can then wire each widget to your actual bot metrics.

Absolutely! You can dynamically update the **uptime** display in the `Run Status` widget by:

1. Tracking the start time.
2. Updating the `statusBox` log line every second using `setInterval`.
3. Replacing the last line in the box (not adding a new one each time).

---

## ✅ Here's the updated section for uptime tracking:

Add this **after creating `statusBox`**:

```ts
const startTime = Date.now();

// We'll track the number of log lines so we can overwrite the "uptime" line
statusBox.log('status: RUNNING');
statusBox.log('uptime: 00:00:00');

// Function to format duration as HH:MM:SS
function formatDuration(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}
```

---

## ✅ Add this inside your `setInterval(...)`:

Replace this block (in your update interval):

```ts
const uptime = formatDuration(Date.now() - startTime);
statusBox.setContent(`status: RUNNING\nuptime: ${uptime}`);
```

Alternatively, you can make it more complex if you want to retain scrollable logs and only overwrite the **second line**:

```ts
const uptime = formatDuration(Date.now() - startTime);
const lines = statusBox.getContent().split('\n');
lines[1] = `uptime: ${uptime}`;
statusBox.setContent(lines.join('\n'));
```

Then call:

```ts
screen.render();
```

---

### 🔁 Full Integration in `setInterval`

```ts
setInterval(() => {
  // Update uptime
  const uptime = formatDuration(Date.now() - startTime);
  const lines = statusBox.getContent().split('\n');
  lines[1] = `uptime: ${uptime}`;
  statusBox.setContent(lines.join('\n'));

  // ... update other widgets here ...

  screen.render();
}, 1000);
```

---

✅ **Now your "Run Status" uptime will tick every second** in place without adding new lines.

Would you like to add a color-coded status (e.g. `RUNNING`, `ERROR`, `PAUSED`) too?

Perfect! Let's enhance the **"Run Status"** widget to support **color-coded statuses** like `RUNNING`, `PAUSED`, `ERROR`, etc.

---

## ✅ Goal

Display something like:

```
status: {color}[RUNNING]{/color}
uptime: 00:12:34
```

Using `blessed` formatting tags like `{green-fg}...{/green-fg}`.

---

## 🛠 Step-by-Step Integration

### ✅ 1. Use `blessed` tags in the log content

Modify your initial status setup:

```ts
statusBox.setContent(
  `{green-fg}status: RUNNING{/green-fg}\nuptime: 00:00:00`
);
```

---

### ✅ 2. Add a dynamic `setStatus` helper function

You can change the status dynamically via:

```ts
function setStatus(status: 'RUNNING' | 'PAUSED' | 'ERROR' | 'STOPPED') {
  const colorMap = {
    RUNNING: 'green-fg',
    PAUSED: 'yellow-fg',
    ERROR: 'red-fg',
    STOPPED: 'gray-fg'
  };

  const uptime = formatDuration(Date.now() - startTime);
  const color = colorMap[status] || 'white';

  statusBox.setContent(`{${color}}status: ${status}{/${color}}\nuptime: ${uptime}`);
}
```

Call `setStatus('RUNNING')` when your app starts.

---

### ✅ 3. Update uptime separately every second

In your `setInterval`, use:

```ts
const lines = statusBox.getContent().split('\n');
const uptime = formatDuration(Date.now() - startTime);
lines[1] = `uptime: ${uptime}`;
statusBox.setContent(lines.join('\n'));
```

---

### ✅ 4. Dynamically change status from your logic

You can call `setStatus()` from any part of your app:

```ts
setStatus('ERROR');  // when a failure happens
setStatus('PAUSED'); // when paused
setStatus('RUNNING'); // resume
```

---

### ✅ Final Example Output

```plaintext
{green-fg}status: RUNNING{/green-fg}
uptime: 00:00:23
```

When an error occurs:

```plaintext
{red-fg}status: ERROR{/red-fg}
uptime: 00:00:35
```

---

Would you like this status also mirrored in a `donut` or `gauge` widget as a visual indicator?
