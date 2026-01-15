import bcModSDK, { PatchHook } from "bondage-club-mod-sdk";

type HookFunction = <TFunctionName extends string>(functionName: TFunctionName, priority: number, hook: PatchHook<any>) => boolean;

let modApi: ReturnType<(typeof bcModSDK)["registerMod"]> | null = null;

(() => {
	try {
		const version = (globalThis as Record<string, unknown>).BCMA_VERSION;
		modApi = bcModSDK.registerMod({
			name: "BCMA",
			fullName: "Bondage Club Multiplayer Activities",
			version: typeof version === "string" ? version : "dev",
			repository: "https://github.com/Lucifer-wen/BCMA-Bondage-Club-Multiplayer-Activities-",
		});
	} catch (error) {
		console.warn("[BCMA] ModSDK registration failed; falling back to manual hooks", error);
		modApi = null;
	}
})();

export const isModSdkAvailable = (): boolean => modApi !== null;

export const hookGameFunction: HookFunction = (functionName, priority, hook) => {
	if (!modApi) return false;
	try {
		modApi.hookFunction(functionName, priority, hook);
		return true;
	} catch (error) {
		console.error(`[BCMA] Failed to hook ${functionName} via ModSDK`, error);
		return false;
	}
};
