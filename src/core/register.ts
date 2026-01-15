import { registerMiniGameMenu } from "../modules/minigames";
import { registerPrivateRoomModule } from "../modules/privateRoom";

export function registerCoreHooks(): void {
	registerMiniGameMenu();
	registerPrivateRoomModule();
}
