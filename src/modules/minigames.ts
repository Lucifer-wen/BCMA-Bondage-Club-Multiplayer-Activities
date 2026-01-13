/* eslint-disable @typescript-eslint/no-explicit-any */
interface DialogLine {
	Stage: string | null;
	NextStage: string | null;
	Option: string | null;
	Result: string | null;
	Function: string | null;
	Prerequisite: string | null;
	Group: string | null;
	Trait: string | null;
}

interface CharacterLike {
	Dialog?: DialogLine[];
	IsPlayer?: () => boolean;
	IsOnline?: () => boolean;
	[key: string | symbol]: unknown;
}

interface MiniGameDefinition {
	id: string;
	difficulty?: number | string;
	labelSelf: string;
	descriptionSelf: string;
	labelTarget: string;
	descriptionTarget: string;
}

declare global {
	var Player: CharacterLike | undefined;
	var CurrentCharacter: CharacterLike | undefined;
	var ChatRoomCharacter: CharacterLike[] | undefined;
	var CurrentScreen: string;
	var CurrentModule: string;
	// Game helpers provided by Bondage Club
	function MiniGameStart(game: string, difficulty: number | string, returnFunction: string): void;
	function ServerPlayerIsInChatRoom(): boolean;
	function InventoryIsBlockedByDistance(character: CharacterLike): boolean;
	function CommonSetScreen(module: string, screen: string): void;
	function DialogCanPerformCharacterAction(): boolean;
}

const MINI_GAMES: readonly MiniGameDefinition[] = Object.freeze([
	{
		id: "ClubCard",
		difficulty: 0,
		labelSelf: "(Practice the Club Card mini-game.)",
		descriptionSelf: "(Launches a solo Club Card practice round.)",
		labelTarget: "(Invite DialogCharacterObject to play Club Card.)",
		descriptionTarget: "(Launches a Club Card practice round for you and DialogCharacterObject.)",
	},
	{
		id: "Chess",
		difficulty: 0,
		labelSelf: "(Play a practice chess match.)",
		descriptionSelf: "(Loads the chess mini-game locally.)",
		labelTarget: "(Challenge DialogCharacterObject to chess.)",
		descriptionTarget: "(Loads the chess mini-game for you and DialogCharacterObject.)",
	},
	{
		id: "DojoStruggle",
		difficulty: 0,
		labelSelf: "(Run a dojo struggle drill.)",
		descriptionSelf: "(Starts the dojo struggle mini-game.)",
		labelTarget: "(Invite DialogCharacterObject to a dojo struggle drill.)",
		descriptionTarget: "(Starts the dojo struggle mini-game for DialogCharacterObject.)",
	},
	{
		id: "GetUp",
		difficulty: 0,
		labelSelf: "(Attempt the Get Up challenge.)",
		descriptionSelf: "(Starts the Get Up mini-game with a basic difficulty.)",
		labelTarget: "(Make DialogCharacterObject attempt the Get Up challenge.)",
		descriptionTarget: "(Starts the Get Up mini-game so DialogCharacterObject can practice.)",
	},
	{
		id: "MaidCleaning",
		difficulty: "Normal",
		labelSelf: "(Start maid cleaning practice.)",
		descriptionSelf: "(Runs the maid cleaning mini-game at a normal pace.)",
		labelTarget: "(Invite DialogCharacterObject to maid cleaning practice.)",
		descriptionTarget: "(Runs the maid cleaning mini-game for DialogCharacterObject.)",
	},
	{
		id: "MaidDrinks",
		difficulty: "Normal",
		labelSelf: "(Start maid drink service practice.)",
		descriptionSelf: "(Runs the maid drink service mini-game at a normal pace.)",
		labelTarget: "(Invite DialogCharacterObject to maid drink service practice.)",
		descriptionTarget: "(Runs the maid drink service mini-game for DialogCharacterObject.)",
	},
	{
		id: "HorseWalk",
		difficulty: "Hurdle",
		labelSelf: "(Race through a horse walk hurdle course.)",
		descriptionSelf: "(Runs the horse walk mini-game on the hurdle preset.)",
		labelTarget: "(Invite DialogCharacterObject to a horse walk hurdle course.)",
		descriptionTarget: "(Runs the horse walk mini-game so DialogCharacterObject can compete.)",
	},
	{
		id: "MagicPuzzle",
		difficulty: 20,
		labelSelf: "(Practice spell casting puzzles.)",
		descriptionSelf: "(Loads a Magic Puzzle session.)",
		labelTarget: "(Invite DialogCharacterObject to practice spell casting puzzles.)",
		descriptionTarget: "(Loads a Magic Puzzle session for you and DialogCharacterObject.)",
	},
	{
		id: "Therapy",
		difficulty: 1,
		labelSelf: "(Start a therapy mini-game.)",
		descriptionSelf: "(Runs the therapy mini-game locally.)",
		labelTarget: "(Invite DialogCharacterObject to the therapy mini-game.)",
		descriptionTarget: "(Runs the therapy mini-game for DialogCharacterObject.)",
	},
	{
		id: "Tennis",
		difficulty: 1,
		labelSelf: "(Practice a tennis mini-game.)",
		descriptionSelf: "(Loads the tennis mini-game locally.)",
		labelTarget: "(Invite DialogCharacterObject to tennis drills.)",
		descriptionTarget: "(Loads the tennis mini-game for you and DialogCharacterObject.)",
	},
]);

const GAME_LOOKUP = new Map(MINI_GAMES.map((game) => [game.id, game]));

const SELF_MAIN_STAGE = "100";
const SELF_SUBMENU_STAGE = "9100";
const TARGET_MAIN_STAGE = "40";
const TARGET_SUBMENU_STAGE = "9200";

const SELF_DIALOG_FLAG = Symbol("bcma-self-dialog");
const TARGET_DIALOG_FLAG = Symbol("bcma-target-dialog");

type CharacterBuildDialogFn = (character: CharacterLike, csv: string[][], functionPrefix: string, reload?: boolean) => void;

let originalCharacterBuildDialog: CharacterBuildDialogFn | undefined;
let originalDialogCanPerformCharacterAction: (() => boolean) | undefined;

export function registerMiniGameMenu(): void {
	installGlobalHelpers();
	patchCharacterBuildDialog();
	patchCharacterActionCheck();
	tryAugmentExistingDialogs();
}

function installGlobalHelpers(): void {
	const globalObj = globalThis as any;

	if (!globalObj.DialogBCMAStartMiniGame) {
		globalObj.DialogBCMAStartMiniGame = (id: string): boolean => startMiniGame(id);
	}
	if (!globalObj.DialogBCMACanShowMiniGamesSelf) {
		globalObj.DialogBCMACanShowMiniGamesSelf = (): boolean => isInChatRoom();
	}
	if (!globalObj.DialogBCMACanShowMiniGamesTarget) {
		globalObj.DialogBCMACanShowMiniGamesTarget = (): boolean => {
			const target = globalObj.CurrentCharacter;
			if (!target || target === globalObj.Player) return false;
			if (typeof target.IsPlayer === "function" && target.IsPlayer()) return false;
			if (typeof InventoryIsBlockedByDistance === "function" && InventoryIsBlockedByDistance(target)) return false;
			return isInChatRoom();
		};
	}
	if (!globalObj.DialogBCMACanShowMiniGames) {
		globalObj.DialogBCMACanShowMiniGames = (): boolean => {
			const current = globalObj.CurrentCharacter;
			if (current && typeof current.IsPlayer === "function" && current.IsPlayer()) {
				return globalObj.DialogBCMACanShowMiniGamesSelf();
			}
			return globalObj.DialogBCMACanShowMiniGamesTarget();
		};
	}
	if (!globalObj.DialogBCMAMiniGameReturn) {
		globalObj.DialogBCMAMiniGameReturn = (): void => {
			if (typeof CurrentModule === "string" && typeof CurrentScreen === "string" && CurrentScreen === "ChatRoom") return;
			if (typeof CommonSetScreen === "function") {
				CommonSetScreen("Online", "ChatRoom");
			}
		};
	}
}

function patchCharacterBuildDialog(): void {
	const globalObj = globalThis as any;
	if (originalCharacterBuildDialog) return;
	const original = globalObj.CharacterBuildDialog as CharacterBuildDialogFn | undefined;
	if (typeof original !== "function") {
		console.warn("[BCMA] CharacterBuildDialog is not available; mini-game menu injection skipped.");
		return;
	}
	originalCharacterBuildDialog = original;
	globalObj.CharacterBuildDialog = function BCMACharacterBuildDialog(this: unknown, character: CharacterLike, csv: string[][], prefix: string, reload?: boolean) {
		originalCharacterBuildDialog?.call(this, character, csv, prefix, reload);
		tryInjectMiniGameMenu(character);
	};
}

function patchCharacterActionCheck(): void {
	const globalObj = globalThis as any;
	if (originalDialogCanPerformCharacterAction) return;
	const original = globalObj.DialogCanPerformCharacterAction as (() => boolean) | undefined;
	if (typeof original !== "function") return;
	originalDialogCanPerformCharacterAction = original;
	globalObj.DialogCanPerformCharacterAction = function BCMADialogCanPerformCharacterAction(this: unknown): boolean {
		const result = originalDialogCanPerformCharacterAction?.call(this) ?? false;
		if (result) return true;
		if (typeof globalObj.DialogBCMACanShowMiniGames === "function") {
			return globalObj.DialogBCMACanShowMiniGames();
		}
		return false;
	};
}

function tryAugmentExistingDialogs(attempts = 10): void {
	const updated = injectForKnownCharacters();
	if (!updated && attempts > 0) {
		setTimeout(() => tryAugmentExistingDialogs(attempts - 1), 500);
	}
}

function injectForKnownCharacters(): boolean {
	let injected = false;
	if (Player) {
		injected = tryInjectMiniGameMenu(Player) || injected;
	}
	if (Array.isArray(ChatRoomCharacter)) {
		for (const character of ChatRoomCharacter) {
			injected = tryInjectMiniGameMenu(character) || injected;
		}
	}
	return injected;
}

function tryInjectMiniGameMenu(character: CharacterLike | undefined): boolean {
	if (!character || !Array.isArray(character.Dialog)) return false;
	if (character.IsPlayer?.()) {
		return injectSelfMenu(character);
	}
	if (character.IsOnline?.()) {
		return injectTargetMenu(character);
	}
	return false;
}

function injectSelfMenu(character: CharacterLike): boolean {
	if (character[SELF_DIALOG_FLAG]) return false;
	const dialog = character.Dialog;
	if (!Array.isArray(dialog)) return false;
	let modified = false;
	modified = ensureDialogLine(dialog, createLine({
		Stage: SELF_MAIN_STAGE,
		NextStage: SELF_SUBMENU_STAGE,
		Option: "(BCMA: Launch an activity.)",
		Result: "(Pick one of the club's built-in mini-games to play or practice.)",
		Prerequisite: "DialogBCMACanShowMiniGamesSelf()",
	})) || modified;
	for (const definition of buildSubMenuLines(true)) {
		modified = ensureDialogLine(dialog, definition) || modified;
	}
	if (modified) {
		character[SELF_DIALOG_FLAG] = true;
	}
	return modified;
}

function injectTargetMenu(character: CharacterLike): boolean {
	if (character[TARGET_DIALOG_FLAG]) return false;
	const dialog = character.Dialog;
	if (!Array.isArray(dialog)) return false;
	let modified = false;
	modified = ensureDialogLine(dialog, createLine({
		Stage: TARGET_MAIN_STAGE,
		NextStage: TARGET_SUBMENU_STAGE,
		Option: "(BCMA: Invite DialogCharacterObject to an activity.)",
		Result: "(Pick one of the club's built-in mini-games to launch locally.)",
		Prerequisite: "DialogBCMACanShowMiniGamesTarget()",
	})) || modified;
	for (const definition of buildSubMenuLines(false)) {
		modified = ensureDialogLine(dialog, definition) || modified;
	}
	if (modified) {
		character[TARGET_DIALOG_FLAG] = true;
	}
	return modified;
}

function buildSubMenuLines(selfMenu: boolean): DialogLine[] {
	const submenuStage = selfMenu ? SELF_SUBMENU_STAGE : TARGET_SUBMENU_STAGE;
	const backResult = selfMenu ? "(Possible character actions.)" : "(Possible character actions.)";
	const backNextStage = selfMenu ? SELF_MAIN_STAGE : TARGET_MAIN_STAGE;
	const lines: DialogLine[] = [];
	for (const game of MINI_GAMES) {
		lines.push(
			createLine({
				Stage: submenuStage,
				Option: selfMenu ? game.labelSelf : game.labelTarget,
				Result: selfMenu ? game.descriptionSelf : game.descriptionTarget,
				Function: `DialogBCMAStartMiniGame("${game.id}")`,
			}),
		);
	}
	lines.push(createLine({
		Stage: submenuStage,
		NextStage: backNextStage,
		Option: "(Back to character actions.)",
		Result: backResult,
	}));
	return lines;
}

function ensureDialogLine(dialog: DialogLine[], candidate: DialogLine): boolean {
	if (!candidate.Option || !candidate.Stage) return false;
	const exists = dialog.some((line) => line.Stage === candidate.Stage && line.Option === candidate.Option);
	if (exists) return false;
	dialog.push(candidate);
	return true;
}

function createLine({
	Stage,
	NextStage = null,
	Option = null,
	Result = null,
	Function = null,
	Prerequisite = null,
	Group = null,
	Trait = null,
}: Partial<DialogLine>): DialogLine {
	return {
		Stage: Stage ?? null,
		NextStage,
		Option,
		Result,
		Function,
		Prerequisite,
		Group,
		Trait,
	};
}

function startMiniGame(id: string): boolean {
	const definition = GAME_LOOKUP.get(id);
	if (!definition) {
		console.warn(`[BCMA] Unknown mini-game requested: ${id}`);
		return false;
	}
	if (typeof MiniGameStart !== "function") return false;
	try {
		MiniGameStart(definition.id, definition.difficulty ?? 0, "DialogBCMAMiniGameReturn");
		return true;
	} catch (error) {
		console.error("[BCMA] Failed to start mini-game", id, error);
		return false;
	}
}

function isInChatRoom(): boolean {
	try {
		return typeof ServerPlayerIsInChatRoom === "function" && ServerPlayerIsInChatRoom();
	} catch {
		return false;
	}
}

export {};
