import { registerCoreHooks } from "./core/register";

declare global {
	// eslint-disable-next-line no-var
	var BCMA_VERSION: string;
}

export function bootstrapBCMA(): void {
	console.log(`[BCMA] Loading Bondage Club Multiplayer Activities v${globalThis.BCMA_VERSION ?? "dev"}`);
	registerCoreHooks();
}

// Auto-start when script injected
if (!(globalThis as Record<string, unknown>).BCMA_LOADED) {
	(globalThis as Record<string, unknown>).BCMA_LOADED = true;
	bootstrapBCMA();
}
