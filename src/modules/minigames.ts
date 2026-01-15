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

import type { CharacterLike } from "../types/character";
import { applyRemoteNpcSnapshots, collectPrivateNpcSnapshots, getActivePrivateRoomId, isPrivateRoomActive, openPrivateRoomSimulation, closePrivateRoomSimulation } from "./privateRoom";
import type { RoomNpcSnapshotData } from "./privateRoom";
import { hookGameFunction } from "../core/modsdk";

interface MiniGameDefinition {
	id: string;
	difficulty?: number | string;
	labelSelf: string;
	descriptionSelf: string;
	labelTarget: string;
	descriptionTarget: string;
}

interface RoomDefinition {
	id: string;
	name: string;
	module: string;
	screen: string;
	labelSelf: string;
	descriptionSelf: string;
	labelTarget: string;
	descriptionTarget: string;
	mode?: "native" | "privateSimulation";
	requiresCanWalk?: boolean;
	requiresCanChange?: boolean;
	requiresCanTalk?: boolean;
	requiresNotRestrained?: boolean;
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
	function CharacterNickname(character: CharacterLike): string;
	function CommonGetScreen(): string;
	function ServerSend(Message: string, Data: any): void;
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
const ROOM_DEFINITIONS: readonly RoomDefinition[] = Object.freeze([
	{
		id: "Cafe",
		name: "the Cafe",
		module: "Room",
		screen: "Cafe",
		labelSelf: "(Visit the cafe.)",
		descriptionSelf: "(Leave the chatroom and grab a snack at the cafe.)",
		labelTarget: "(Invite DialogCharacterObject to the cafe.)",
		descriptionTarget: "(Requests DialogCharacterObject to accompany you to the cafe.)",
	},
	{
		id: "Arcade",
		name: "the Arcade",
		module: "Room",
		screen: "Arcade",
		labelSelf: "(Visit the arcade.)",
		descriptionSelf: "(Walk over to the club's arcade corner.)",
		labelTarget: "(Invite DialogCharacterObject to the arcade.)",
		descriptionTarget: "(Requests DialogCharacterObject to follow you to the arcade.)",
	},
	{
		id: "Stable",
		name: "the Stable",
		module: "Room",
		screen: "Stable",
		labelSelf: "(Walk to the stables.)",
		descriptionSelf: "(Head over to the horse stables.)",
		labelTarget: "(Invite DialogCharacterObject to the stables.)",
		descriptionTarget: "(Requests DialogCharacterObject to join you at the stables.)",
	},
	{
		id: "Magic",
		name: "the Magic Theater",
		module: "Room",
		screen: "Magic",
		labelSelf: "(Visit the magic theater.)",
		descriptionSelf: "(Go see what's happening at the magic theater.)",
		labelTarget: "(Invite DialogCharacterObject to the magic theater.)",
		descriptionTarget: "(Requests DialogCharacterObject to come with you to the theater.)",
	},
	{
		id: "Nursery",
		name: "the Nursery",
		module: "Room",
		screen: "Nursery",
		labelSelf: "(Visit the nursery.)",
		descriptionSelf: "(Step into the nursery area.)",
		labelTarget: "(Invite DialogCharacterObject to the nursery.)",
		descriptionTarget: "(Requests DialogCharacterObject to enter the nursery with you.)",
	},
	{
		id: "Gambling",
		name: "the Gambling Hall",
		module: "Room",
		screen: "Gambling",
		labelSelf: "(Try your luck in the gambling hall.)",
		descriptionSelf: "(Walk to the main hall's gambling den.)",
		labelTarget: "(Invite DialogCharacterObject to the gambling hall.)",
		descriptionTarget: "(Requests DialogCharacterObject to gamble with you.)",
	},
	{
		id: "Prison",
		name: "the Prison",
		module: "Room",
		screen: "Prison",
		labelSelf: "(Visit the prison wing.)",
		descriptionSelf: "(Go check on the prison cells.)",
		labelTarget: "(Invite DialogCharacterObject to the prison wing.)",
		descriptionTarget: "(Requests DialogCharacterObject to walk to the prison wing with you.)",
	},
	{
		id: "Photographic",
		name: "the Photographic Studio",
		module: "Room",
		screen: "Photographic",
		labelSelf: "(Visit the photographic studio.)",
		descriptionSelf: "(Walk over to the photography studio.)",
		labelTarget: "(Invite DialogCharacterObject to the photographic studio.)",
		descriptionTarget: "(Requests DialogCharacterObject to have a photoshoot with you.)",
	},
	{
		id: "Private",
		name: "your Private Room",
		module: "Room",
		screen: "Private",
		mode: "privateSimulation",
		labelSelf: "(Go to your private room.)",
		descriptionSelf: "(Head over to your own private space.)",
		labelTarget: "(Invite DialogCharacterObject to your private room.)",
		descriptionTarget: "(Requests DialogCharacterObject to join you in your private room.)",
	},
	{
		id: "KidnapLeague",
		name: "the Kidnap League",
		module: "Room",
		screen: "KidnapLeague",
		labelSelf: "(Visit the Kidnap League.)",
		descriptionSelf: "(Walk to the Kidnap League headquarters.)",
		labelTarget: "(Invite DialogCharacterObject to the Kidnap League.)",
		descriptionTarget: "(Requests DialogCharacterObject to head to the Kidnap League.)",
	},
	{
		id: "Shibari",
		name: "the Shibari Dojo",
		module: "Room",
		screen: "Shibari",
		labelSelf: "(Visit the Shibari dojo.)",
		descriptionSelf: "(Practice knots at the dojo.)",
		labelTarget: "(Invite DialogCharacterObject to the Shibari dojo.)",
		descriptionTarget: "(Requests DialogCharacterObject to train with you at the dojo.)",
	},
	{
		id: "SlaveMarket",
		name: "the Slave Market",
		module: "Room",
		screen: "SlaveMarket",
		labelSelf: "(Visit the slave market.)",
		descriptionSelf: "(Leave to browse the slave market.)",
		labelTarget: "(Invite DialogCharacterObject to the slave market.)",
		descriptionTarget: "(Requests DialogCharacterObject to join you at the market.)",
	},
	{
		id: "Cell",
		name: "the Holding Cells",
		module: "Room",
		screen: "Cell",
		labelSelf: "(Visit the holding cells.)",
		descriptionSelf: "(Walk to the detention cells.)",
		labelTarget: "(Invite DialogCharacterObject to the holding cells.)",
		descriptionTarget: "(Requests DialogCharacterObject to step into the cells with you.)",
	},
	{
		id: "Shop",
		name: "the Club Shop",
		module: "Room",
		screen: "Shop",
		labelSelf: "(Visit the club shop.)",
		descriptionSelf: "(Walk over to the club shop.)",
		labelTarget: "(Invite DialogCharacterObject to the club shop.)",
		descriptionTarget: "(Requests DialogCharacterObject to browse the club shop with you.)",
	},
	{
		id: "MagicSchoolLaboratory",
		name: "the Magic School Laboratory",
		module: "Room",
		screen: "MagicSchoolLaboratory",
		labelSelf: "(Visit the magic school laboratory.)",
		descriptionSelf: "(Walk to the magic school's lab.)",
		labelTarget: "(Invite DialogCharacterObject to the magic school laboratory.)",
		descriptionTarget: "(Requests DialogCharacterObject to join you in the lab.)",
		requiresCanChange: true,
	},
	{
		id: "Poker",
		name: "the Poker room",
		module: "Room",
		screen: "Poker",
		labelSelf: "(Head to the poker room.)",
		descriptionSelf: "(Leave the chat and sit down for poker.)",
		labelTarget: "(Invite DialogCharacterObject to the poker room.)",
		descriptionTarget: "(Requests DialogCharacterObject to play poker with you.)",
		requiresCanChange: true,
		requiresCanTalk: true,
		requiresNotRestrained: true,
	},
	{
		id: "Infiltration",
		name: "the Infiltration training",
		module: "Room",
		screen: "Infiltration",
		labelSelf: "(Visit infiltration training.)",
		descriptionSelf: "(Walk to the infiltration course.)",
		labelTarget: "(Invite DialogCharacterObject to infiltration training.)",
		descriptionTarget: "(Requests DialogCharacterObject to join you in infiltration training.)",
		requiresCanChange: true,
	},
	{
		id: "MovieStudio",
		name: "the Movie Studio",
		module: "Room",
		screen: "MovieStudio",
		labelSelf: "(Visit the movie studio.)",
		descriptionSelf: "(Walk to the film studio.)",
		labelTarget: "(Invite DialogCharacterObject to the movie studio.)",
		descriptionTarget: "(Requests DialogCharacterObject to join you on set.)",
		requiresCanChange: true,
	},
]);
const ROOM_LOOKUP = new Map(ROOM_DEFINITIONS.map((room) => [room.id, room]));

interface OpponentGameConfig {
	prepareState: (opponent: CharacterLike) => void;
	initSync?: (opponent: CharacterLike, matchId: string) => void;
}

interface RoomContext {
	hostMember?: number;
	guestMember?: number;
}

const SELF_MAIN_STAGE = "100";
const SELF_SUBMENU_STAGE = "9100";
const TARGET_MAIN_STAGE = "40";
const TARGET_SUBMENU_STAGE = "9200";
const SELF_ROOM_SUBMENU_STAGE = "9300";
const TARGET_ROOM_SUBMENU_STAGE = "9400";

const SELF_DIALOG_FLAG = Symbol("bcma-self-dialog");
const TARGET_DIALOG_FLAG = Symbol("bcma-target-dialog");
const inviteIdToOpponent: Map<string, { gameId: string; opponent: CharacterLike; matchId?: string }> = new Map();
const pendingInviteResponseIds: Set<string> = new Set();
const roomInviteIdToOpponent: Map<string, { roomId: string; opponent: CharacterLike }> = new Map();
const pendingRoomInviteResponseIds: Set<string> = new Set();
interface TennisSyncState {
	matchId: string;
	opponentMember: number;
	leftMember: number;
	rightMember: number;
	lastLeft: number;
	lastRight: number;
}
let tennisSync: TennisSyncState | null = null;
let suppressTennisBroadcast = false;
let tennisHookInstalled = false;
interface SimulatedRoomSessionState {
	roomId: string;
	host: number;
	guest: number;
	opponent?: number;
}
let privateRoomSession: SimulatedRoomSessionState | null = null;

type CharacterBuildDialogFn = (character: CharacterLike, csv: string[][], functionPrefix: string, reload?: boolean) => void;

let originalCharacterBuildDialog: CharacterBuildDialogFn | undefined;
let originalDialogCanPerformCharacterAction: (() => boolean) | undefined;
let chatRoomMessageHookInstalled = false;
let inviteStylesInjected = false;

const OPPONENT_REQUIRED_GAMES: Record<string, OpponentGameConfig> = {
	Tennis: {
		prepareState: (opponent: CharacterLike) => {
			(globalThis as Record<string, unknown>).TennisCharacterLeft = Player ?? null;
			(globalThis as Record<string, unknown>).TennisCharacterRight = opponent ?? null;
			// Ensure names exist so the UI renders properly
			if (Player && !Player.Name) Player.Name = CharacterNickname(Player);
			if (opponent && !opponent.Name) opponent.Name = CharacterNickname(opponent);
		},
		initSync: (opponent: CharacterLike, matchId: string) => initTennisSync(opponent, matchId),
	},
};

export function registerMiniGameMenu(): void {
	installGlobalHelpers();
	patchCharacterBuildDialog();
	patchCharacterActionCheck();
	tryAugmentExistingDialogs();
	ensureChatRoomMessageHook();
	ensureTennisRunHook();
}

function installGlobalHelpers(): void {
	const globalObj = globalThis as any;

	if (!globalObj.DialogBCMAStartMiniGame) {
		globalObj.DialogBCMAStartMiniGame = (id: string): boolean => startMiniGame(id);
	}
	if (!globalObj.DialogBCMAStartMiniGameTarget) {
		globalObj.DialogBCMAStartMiniGameTarget = (id: string): boolean => startMiniGameWithTarget(id);
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
	if (!globalObj.DialogBCMAVisitRoom) {
		globalObj.DialogBCMAVisitRoom = (id: string): boolean => startRoomTravel(id);
	}
	if (!globalObj.DialogBCMAInviteRoom) {
		globalObj.DialogBCMAInviteRoom = (id: string): boolean => startRoomTravelWithTarget(id);
	}
	if (!globalObj.DialogBCMACanShowRoomsSelf) {
		globalObj.DialogBCMACanShowRoomsSelf = (): boolean => canPlayerTravel() && isInChatRoom();
	}
	if (!globalObj.DialogBCMACanShowRoomsTarget) {
		globalObj.DialogBCMACanShowRoomsTarget = (): boolean => {
			const target = globalObj.CurrentCharacter;
			if (!target || target === globalObj.Player) return false;
			if (typeof target.IsPlayer === "function" && target.IsPlayer()) return false;
			if (typeof InventoryIsBlockedByDistance === "function" && InventoryIsBlockedByDistance(target)) return false;
			return canPlayerTravel() && isInChatRoom();
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
	modified = ensureDialogLine(dialog, createLine({
		Stage: SELF_MAIN_STAGE,
		NextStage: SELF_ROOM_SUBMENU_STAGE,
		Option: "(BCMA: Visit a club area.)",
		Result: "(Travel to one of the private club rooms.)",
		Prerequisite: "DialogBCMACanShowRoomsSelf()",
	})) || modified;
	for (const definition of buildSubMenuLines(true)) {
		modified = ensureDialogLine(dialog, definition) || modified;
	}
	for (const definition of buildRoomSubMenuLines(true)) {
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
	modified = ensureDialogLine(dialog, createLine({
		Stage: TARGET_MAIN_STAGE,
		NextStage: TARGET_ROOM_SUBMENU_STAGE,
		Option: "(BCMA: Visit a club area together.)",
		Result: "(Invite DialogCharacterObject to follow you into one of the club rooms.)",
		Prerequisite: "DialogBCMACanShowRoomsTarget()",
	})) || modified;
	for (const definition of buildSubMenuLines(false)) {
		modified = ensureDialogLine(dialog, definition) || modified;
	}
	for (const definition of buildRoomSubMenuLines(false)) {
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
				Function: selfMenu ? `DialogBCMAStartMiniGame("${game.id}")` : `DialogBCMAStartMiniGameTarget("${game.id}")`,
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

function buildRoomSubMenuLines(selfMenu: boolean): DialogLine[] {
	const submenuStage = selfMenu ? SELF_ROOM_SUBMENU_STAGE : TARGET_ROOM_SUBMENU_STAGE;
	const backNextStage = selfMenu ? SELF_MAIN_STAGE : TARGET_MAIN_STAGE;
	const lines: DialogLine[] = [];
	for (const room of ROOM_DEFINITIONS) {
		lines.push(createLine({
			Stage: submenuStage,
			Option: selfMenu ? room.labelSelf : room.labelTarget,
			Result: selfMenu ? room.descriptionSelf : room.descriptionTarget,
			Function: selfMenu ? `DialogBCMAVisitRoom("${room.id}")` : `DialogBCMAInviteRoom("${room.id}")`,
		}));
	}
	lines.push(createLine({
		Stage: submenuStage,
		NextStage: backNextStage,
		Option: "(Back to character actions.)",
		Result: "(Return to the main list of character interactions.)",
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

	const opponentConfig = OPPONENT_REQUIRED_GAMES[id];
	if (opponentConfig) {
		window.alert("BCMA: Please click on the opponent's character actions to start this activity.");
		return false;
	}

	launchMiniGame(definition);
	return true;
}

function startMiniGameWithTarget(id: string): boolean {
	const definition = GAME_LOOKUP.get(id);
	if (!definition) {
		console.warn(`[BCMA] Unknown mini-game requested: ${id}`);
		return false;
	}
	const opponent = CurrentCharacter;
	if (!opponent || typeof opponent.IsOnline !== "function" || !opponent.IsOnline()) {
		console.warn("[BCMA] No valid opponent selected");
		return false;
	}
	const opponentConfig = OPPONENT_REQUIRED_GAMES[id];
	if (opponentConfig && typeof opponent.MemberNumber === "number") {
		const opponentMember = opponent.MemberNumber;
		if (opponent.IsOwnedByPlayer?.()) {
			opponentConfig.prepareState(opponent);
			const matchId = generateMatchId();
			opponentConfig.initSync?.(opponent, matchId);
			sendHiddenBCMAMessage(opponentMember, {
				action: "forceStart",
				gameId: id,
				initiator: Player?.MemberNumber ?? -1,
				matchId,
			});
			launchMiniGame(definition);
			return true;
		}

		const matchId = generateMatchId();
		const inviteId = generateInviteId();
		inviteIdToOpponent.set(inviteId, { gameId: id, opponent, matchId });
		pendingInviteResponseIds.add(inviteId);
		sendHiddenBCMAMessage(opponentMember, {
			action: "invite",
			id: inviteId,
			gameId: id,
			initiator: Player?.MemberNumber ?? -1,
			target: opponentMember,
			initiatorName: getCharacterDisplayName(Player),
			matchId,
		});
		window.alert(`BCMA: Invitation sent to ${getCharacterDisplayName(opponent)}.`);
		return true;
	}

	if (opponentConfig) {
		console.warn("[BCMA] Cannot start this game without a valid opponent.");
		return false;
	}

	launchMiniGame(definition);
	return true;
}

function startRoomTravel(id: string): boolean {
	const definition = ROOM_LOOKUP.get(id);
	if (!definition) {
		console.warn("[BCMA] Unknown room requested", id);
		return false;
	}
	if (!isInChatRoom() || !canPlayerTravel() || !meetsRoomRequirements(definition, Player)) {
		window.alert("BCMA: You cannot travel there right now.");
		return false;
	}
	enterRoom(definition, {
		hostMember: Player?.MemberNumber,
		guestMember: Player?.MemberNumber,
	});
	return true;
}

function startRoomTravelWithTarget(id: string): boolean {
	const definition = ROOM_LOOKUP.get(id);
	if (!definition) {
		console.warn("[BCMA] Unknown room requested", id);
		return false;
	}
	if (!isInChatRoom() || !canPlayerTravel() || !meetsRoomRequirements(definition, Player)) {
		window.alert("BCMA: You cannot travel there right now.");
		return false;
	}
	const opponent = CurrentCharacter;
	if (!opponent || typeof opponent.IsOnline !== "function" || !opponent.IsOnline()) {
		console.warn("[BCMA] No valid opponent selected for room invite");
		return false;
	}
	if (typeof opponent.MemberNumber !== "number") {
		console.warn("[BCMA] Target is missing a member number");
		return false;
	}
	if (opponent.IsOwnedByPlayer?.()) {
		sendHiddenBCMAMessage(opponent.MemberNumber, {
			action: "roomForce",
			roomId: id,
			initiator: Player?.MemberNumber ?? -1,
		});
		enterRoom(definition, {
			hostMember: Player?.MemberNumber,
			guestMember: opponent.MemberNumber,
		});
		return true;
	}
	const inviteId = generateInviteId();
	roomInviteIdToOpponent.set(inviteId, { roomId: id, opponent });
	pendingRoomInviteResponseIds.add(inviteId);
	sendHiddenBCMAMessage(opponent.MemberNumber, {
		action: "roomInvite",
		id: inviteId,
		roomId: id,
		initiator: Player?.MemberNumber ?? -1,
		target: opponent.MemberNumber,
		initiatorName: getCharacterDisplayName(Player),
	});
	window.alert(`BCMA: Invitation sent to ${getCharacterDisplayName(opponent)}.`);
	return true;
}

function launchMiniGame(definition: MiniGameDefinition): void {
	if (typeof MiniGameStart !== "function")
		return;

	if (definition.id !== "Tennis") {
		tennisSync = null;
	}

	try {
		MiniGameStart(definition.id, definition.difficulty ?? 0, "DialogBCMAMiniGameReturn");
	} catch (error) {
		console.error("[BCMA] Failed to start mini-game", definition.id, error);
	}
}

function getCharacterDisplayName(character?: CharacterLike | null): string {
	if (!character)
		return "Unknown player";
	if (character.Nickname)
		return character.Nickname;
	if (character.Name)
		return character.Name;
	if (typeof character.MemberNumber === "number")
		return `Player ${character.MemberNumber}`;
	return "Unknown player";
}

interface BCMAInvitePayloadBase {
	gameId?: string;
	matchId?: string;
}
interface BCMAInvitePayload extends BCMAInvitePayloadBase {
	action: "invite";
	id: string;
	gameId: string;
	initiator: number;
	target: number;
	initiatorName: string;
}
interface BCMAInviteResponsePayload extends BCMAInvitePayloadBase {
	action: "response";
	gameId: string;
	id: string;
	accepted: boolean;
}
interface BCMAForcePayload extends BCMAInvitePayloadBase {
	action: "forceStart";
	gameId: string;
	initiator: number;
}
interface BCMATennisScorePayload extends BCMAInvitePayloadBase {
	action: "tennisScore";
	matchId: string;
	leftMember: number;
	rightMember: number;
	leftPoints: number;
	rightPoints: number;
}
interface BCMARoomInvitePayload extends BCMAInvitePayloadBase {
	action: "roomInvite";
	id: string;
	roomId: string;
	initiator: number;
	target: number;
	initiatorName: string;
}
interface BCMARoomResponsePayload extends BCMAInvitePayloadBase {
	action: "roomResponse";
	id: string;
	roomId: string;
	accepted: boolean;
}
interface BCMARoomForcePayload extends BCMAInvitePayloadBase {
	action: "roomForce";
	roomId: string;
	initiator: number;
}
interface BCMARoomNpcSyncPayload extends BCMAInvitePayloadBase {
	action: "roomNpcSync";
	roomId: string;
	owner: number;
	npcs: RoomNpcSnapshotData[];
}
interface BCMARoomSimClosePayload extends BCMAInvitePayloadBase {
	action: "roomSimClose";
	roomId: string;
}

type BCMAHiddenPayload =
	| BCMAInvitePayload
	| BCMAInviteResponsePayload
	| BCMAForcePayload
	| BCMATennisScorePayload
	| BCMARoomInvitePayload
	| BCMARoomResponsePayload
	| BCMARoomForcePayload
	| BCMARoomNpcSyncPayload
	| BCMARoomSimClosePayload;

function sendHiddenBCMAMessage(target: number, payload: BCMAHiddenPayload): void {
	if (!ServerPlayerIsInChatRoom()) return;
	ServerSend("ChatRoomChat", {
		Content: "BCMA",
		Type: "Hidden",
		Target: target,
		Dictionary: payload,
	});
}

function ensureChatRoomMessageHook(attempt = 0): void {
	if (chatRoomMessageHookInstalled) return;
	const hooked = hookGameFunction("ChatRoomMessage", 0, (args, next) => {
		const [data] = args as [any, ...any[]];
		if (data?.Type === "Hidden" && data.Content === "BCMA" && typeof data.Dictionary === "object") {
			handleBCMAHiddenMessage(data.Sender, data.Dictionary as BCMAHiddenPayload);
			return;
		}
		return next(args);
	});
	if (hooked) {
		chatRoomMessageHookInstalled = true;
		return;
	}
	if (attempt >= 10) {
		console.warn("[BCMA] Failed to hook ChatRoomMessage via ModSDK after multiple attempts");
		return;
	}
	setTimeout(() => ensureChatRoomMessageHook(attempt + 1), 1000);
}

function handleBCMAHiddenMessage(sender: number, payload: BCMAHiddenPayload): void {
	if (typeof payload?.action !== "string") return;
	switch (payload.action) {
		case "invite":
			handleIncomingInvite(sender, payload);
			break;
		case "response":
			handleInviteResponse(payload);
			break;
		case "forceStart":
			handleForceStart(sender, payload);
			break;
		case "tennisScore":
			handleTennisScore(payload);
			break;
		case "roomInvite":
			handleRoomInvite(sender, payload);
			break;
		case "roomResponse":
			handleRoomResponse(payload);
			break;
		case "roomForce":
			handleRoomForce(sender, payload);
			break;
		case "roomNpcSync":
			handleRoomNpcSync(payload);
			break;
		case "roomSimClose":
			handleRoomSimClose(payload);
			break;
		default:
			break;
	}
}

function handleIncomingInvite(sender: number, payload: BCMAInvitePayload): void {
	if (payload.target !== Player?.MemberNumber) return;
	const opponent = findChatRoomCharacter(sender);
	const definition = GAME_LOOKUP.get(payload.gameId);
	if (!definition || !opponent) {
		sendHiddenBCMAMessage(sender, {
			action: "response",
			id: payload.id,
			gameId: payload.gameId,
			accepted: false,
		});
		return;
	}
	const opponentConfig = OPPONENT_REQUIRED_GAMES[payload.gameId];
	showInvitePrompt(`${payload.initiatorName} wants to play ${payload.gameId}. Accept?`, () => {
		if (opponentConfig) {
			opponentConfig.prepareState(opponent);
			opponentConfig.initSync?.(opponent, payload.matchId ?? generateMatchId());
		}
		launchMiniGame(definition);
		sendHiddenBCMAMessage(sender, {
			action: "response",
			id: payload.id,
			gameId: payload.gameId,
			accepted: true,
			matchId: payload.matchId,
		});
		closeInvitePrompt();
	}, () => {
		sendHiddenBCMAMessage(sender, {
			action: "response",
			id: payload.id,
			gameId: payload.gameId,
			accepted: false,
			matchId: payload.matchId,
		});
		closeInvitePrompt();
	});
}

function handleInviteResponse(payload: BCMAInviteResponsePayload): void {
	if (!pendingInviteResponseIds.has(payload.id)) return;
	pendingInviteResponseIds.delete(payload.id);
	const info = inviteIdToOpponent.get(payload.id);
	inviteIdToOpponent.delete(payload.id);
	if (!info) return;
	if (!payload.accepted) {
		window.alert("BCMA: Invitation declined.");
		return;
	}
	const definition = GAME_LOOKUP.get(info.gameId);
	if (!definition) return;
	const opponentConfig = OPPONENT_REQUIRED_GAMES[info.gameId];
	if (opponentConfig) {
		opponentConfig.prepareState(info.opponent);
		opponentConfig.initSync?.(info.opponent, info.matchId ?? payload.matchId ?? generateMatchId());
	}
	launchMiniGame(definition);
}

function handleForceStart(sender: number, payload: BCMAForcePayload): void {
	const opponentConfig = OPPONENT_REQUIRED_GAMES[payload.gameId];
	const definition = GAME_LOOKUP.get(payload.gameId);
	if (!opponentConfig || !definition) return;
	const opponent = findChatRoomCharacter(sender);
	if (!opponent) return;
	opponentConfig.prepareState(opponent);
	opponentConfig.initSync?.(opponent, payload.matchId ?? generateMatchId());
	launchMiniGame(definition);
}

function handleRoomInvite(sender: number, payload: BCMARoomInvitePayload): void {
	if (payload.target !== Player?.MemberNumber) return;
	const opponent = findChatRoomCharacter(sender);
	const room = ROOM_LOOKUP.get(payload.roomId);
	if (!room || !opponent || !meetsRoomRequirements(room, Player)) {
		sendHiddenBCMAMessage(sender, {
			action: "roomResponse",
			id: payload.id,
			roomId: payload.roomId,
			accepted: false,
		});
		return;
	}
	showInvitePrompt(`${payload.initiatorName} wants to bring you to ${room.name}. Accept?`, () => {
		enterRoom(room, {
			hostMember: payload.initiator,
			guestMember: payload.target,
		});
		sendHiddenBCMAMessage(sender, {
			action: "roomResponse",
			id: payload.id,
			roomId: payload.roomId,
			accepted: true,
		});
		closeInvitePrompt();
	}, () => {
		sendHiddenBCMAMessage(sender, {
			action: "roomResponse",
			id: payload.id,
			roomId: payload.roomId,
			accepted: false,
		});
		closeInvitePrompt();
	});
}

function handleRoomResponse(payload: BCMARoomResponsePayload): void {
	if (!pendingRoomInviteResponseIds.has(payload.id)) return;
	pendingRoomInviteResponseIds.delete(payload.id);
	const info = roomInviteIdToOpponent.get(payload.id);
	roomInviteIdToOpponent.delete(payload.id);
	if (!info) return;
	if (!payload.accepted) {
		window.alert("BCMA: Invitation declined.");
		return;
	}
	const room = ROOM_LOOKUP.get(info.roomId);
	if (!room || !meetsRoomRequirements(room, Player)) return;
	const guestMember = info.opponent.MemberNumber ?? Player?.MemberNumber;
	enterRoom(room, {
		hostMember: Player?.MemberNumber,
		guestMember,
	});
}

function handleRoomForce(sender: number, payload: BCMARoomForcePayload): void {
	const room = ROOM_LOOKUP.get(payload.roomId);
	if (!room || !meetsRoomRequirements(room, Player)) return;
	if (!findChatRoomCharacter(sender)) return;
	enterRoom(room, {
		hostMember: sender,
		guestMember: Player?.MemberNumber,
	});
}

function handleRoomNpcSync(payload: BCMARoomNpcSyncPayload): void {
	if (!privateRoomSession || privateRoomSession.roomId !== payload.roomId) return;
	if (privateRoomSession.host === Player?.MemberNumber) return;
	applyRemoteNpcSnapshots(payload.npcs);
}

function handleRoomSimClose(payload: BCMARoomSimClosePayload): void {
	if (!privateRoomSession || privateRoomSession.roomId !== payload.roomId) return;
	closeSimulatedRoom(false);
	window.alert("BCMA: The other player left the private room.");
}

let invitePromptElement: HTMLDivElement | null = null;

function showInvitePrompt(message: string, accept: () => void, decline: () => void): void {
	closeInvitePrompt();
	ensureInviteStyles();
	invitePromptElement = document.createElement("div");
	invitePromptElement.className = "bcma-opponent-overlay";
	const dialog = document.createElement("div");
	dialog.className = "bcma-opponent-dialog";
	const text = document.createElement("p");
	text.textContent = message;
	dialog.appendChild(text);
	const buttons = document.createElement("div");
	buttons.className = "bcma-opponent-list";
	const acceptBtn = document.createElement("button");
	acceptBtn.type = "button";
	acceptBtn.textContent = "Accept";
	acceptBtn.onclick = accept;
	const declineBtn = document.createElement("button");
	declineBtn.type = "button";
	declineBtn.textContent = "Decline";
	declineBtn.onclick = decline;
	buttons.appendChild(acceptBtn);
	buttons.appendChild(declineBtn);
	dialog.appendChild(buttons);
	invitePromptElement.appendChild(dialog);
	document.body.appendChild(invitePromptElement);
}

function closeInvitePrompt(): void {
	if (invitePromptElement) {
		invitePromptElement.remove();
		invitePromptElement = null;
	}
}

function ensureInviteStyles(): void {
	if (inviteStylesInjected) return;
	const style = document.createElement("style");
	style.textContent = `
.bcma-opponent-overlay {
	position: fixed;
	inset: 0;
	background: rgba(0, 0, 0, 0.6);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 5000;
}
.bcma-opponent-dialog {
	background: #1b1b1f;
	color: white;
	border: 1px solid #fff;
	padding: 20px;
	max-width: 420px;
	width: 90%;
	text-align: center;
	font-family: Arial, sans-serif;
	box-shadow: 0 0 15px rgba(0, 0, 0, 0.5);
}
.bcma-opponent-list {
	display: flex;
	flex-direction: column;
	gap: 10px;
	margin-top: 15px;
}
.bcma-opponent-list button {
	padding: 10px;
	border: 1px solid #5a5a74;
	background: #2d2d3a;
	color: white;
	cursor: pointer;
}
.bcma-opponent-list button:hover {
	background: #38384d;
}
`;
	document.head.appendChild(style);
	inviteStylesInjected = true;
}

function findChatRoomCharacter(member: number): CharacterLike | null {
	return (Array.isArray(ChatRoomCharacter) ? ChatRoomCharacter.find(c => c.MemberNumber === member) : null) ?? null;
}

function generateInviteId(): string {
	return `${Player?.MemberNumber ?? "0"}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function generateMatchId(): string {
	return `${Player?.MemberNumber ?? "0"}-match-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isInChatRoom(): boolean {
	try {
		return typeof ServerPlayerIsInChatRoom === "function" && ServerPlayerIsInChatRoom();
	} catch {
		return false;
	}
}

function ensureTennisRunHook(attempt = 0): void {
	if (tennisHookInstalled)
		return;
	const hooked = hookGameFunction("TennisRun", 0, (args, next) => {
		const result = next(args);
		recordTennisScore();
		return result;
	});
	if (hooked) {
		tennisHookInstalled = true;
		return;
	}
	if (attempt >= 10) {
		console.warn("[BCMA] Failed to hook TennisRun via ModSDK after multiple attempts");
		return;
	}
	setTimeout(() => ensureTennisRunHook(attempt + 1), 1000);
}

function initTennisSync(opponent: CharacterLike, matchId: string): void {
	if (typeof Player?.MemberNumber !== "number" || typeof opponent.MemberNumber !== "number") {
		tennisSync = null;
		return;
	}
	const globalObj = globalThis as Record<string, any>;
	tennisSync = {
		matchId,
		opponentMember: opponent.MemberNumber,
		leftMember: Player.MemberNumber,
		rightMember: opponent.MemberNumber,
		lastLeft: typeof globalObj.TennisCharacterLeftPoint === "number" ? globalObj.TennisCharacterLeftPoint : 0,
		lastRight: typeof globalObj.TennisCharacterRightPoint === "number" ? globalObj.TennisCharacterRightPoint : 0,
	};
}

function recordTennisScore(): void {
	if (!tennisSync || suppressTennisBroadcast)
		return;
	const globalObj = globalThis as Record<string, any>;
	const left = typeof globalObj.TennisCharacterLeftPoint === "number" ? globalObj.TennisCharacterLeftPoint : 0;
	const right = typeof globalObj.TennisCharacterRightPoint === "number" ? globalObj.TennisCharacterRightPoint : 0;
	if (left === tennisSync.lastLeft && right === tennisSync.lastRight)
		return;
	tennisSync.lastLeft = left;
	tennisSync.lastRight = right;
	sendHiddenBCMAMessage(tennisSync.opponentMember, {
		action: "tennisScore",
		gameId: "Tennis",
		matchId: tennisSync.matchId,
		leftMember: tennisSync.leftMember,
		rightMember: tennisSync.rightMember,
		leftPoints: left,
	rightPoints: right,
	});
}

function handleTennisScore(payload: BCMATennisScorePayload): void {
	if (!tennisSync || payload.matchId !== tennisSync.matchId)
		return;
	suppressTennisBroadcast = true;
	try {
		const globalObj = globalThis as Record<string, any>;
		const playerMember = Player?.MemberNumber;
		if (playerMember && payload.leftMember === playerMember) {
			globalObj.TennisCharacterLeftPoint = payload.leftPoints;
			globalObj.TennisCharacterRightPoint = payload.rightPoints;
		} else if (playerMember && payload.rightMember === playerMember) {
			globalObj.TennisCharacterLeftPoint = payload.rightPoints;
			globalObj.TennisCharacterRightPoint = payload.leftPoints;
		} else {
			globalObj.TennisCharacterLeftPoint = payload.leftPoints;
			globalObj.TennisCharacterRightPoint = payload.rightPoints;
		}
		tennisSync.lastLeft = typeof globalObj.TennisCharacterLeftPoint === "number" ? globalObj.TennisCharacterLeftPoint : 0;
		tennisSync.lastRight = typeof globalObj.TennisCharacterRightPoint === "number" ? globalObj.TennisCharacterRightPoint : 0;
	} finally {
		suppressTennisBroadcast = false;
	}
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function meetsRoomRequirements(room: RoomDefinition, actor?: CharacterLike | null): boolean {
	const target = actor ?? null;
	if (!target) return false;
	const requiresCanWalk = room.requiresCanWalk !== false;
	if (requiresCanWalk && typeof target.CanWalk === "function" && !target.CanWalk()) return false;
	if (room.requiresCanChange && typeof target.CanChangeOwnClothes === "function" && !target.CanChangeOwnClothes()) return false;
	if (room.requiresCanTalk && typeof target.CanTalk === "function" && !target.CanTalk()) return false;
	if (room.requiresNotRestrained && typeof target.IsRestrained === "function" && target.IsRestrained()) return false;
	return true;
}

function enterRoom(room: RoomDefinition, context?: RoomContext): void {
	if (room.mode === "privateSimulation") {
		openSimulatedPrivateRoom(room, context);
		return;
	}
	closeSimulatedRoom(true);
	if (typeof CommonSetScreen !== "function") {
		console.warn("[BCMA] Cannot move to room, CommonSetScreen unavailable");
		return;
	}
	try {
		CommonSetScreen(room.module, room.screen);
	} catch (error) {
		console.error("[BCMA] Failed to move to room", room.id, error);
	}
}

function openSimulatedPrivateRoom(room: RoomDefinition, context?: RoomContext): void {
	closeSimulatedRoom(true);
	const host = context?.hostMember ?? Player?.MemberNumber;
	const guest = context?.guestMember ?? Player?.MemberNumber;
	if (typeof host !== "number" || typeof guest !== "number") {
		console.warn("[BCMA] Missing host/guest information for simulated room", room.id);
		return;
	}
	const localMember = Player?.MemberNumber;
	const opponent = localMember === host ? guest : host;
	privateRoomSession = {
		roomId: room.id,
		host,
		guest,
		opponent: opponent === localMember ? undefined : opponent,
	};
	openPrivateRoomSimulation(room.id, host, guest, () => {
		clearPrivateRoomSession(true);
	});
	if (Player?.MemberNumber === host) {
		void collectPrivateNpcSnapshots().then((npcs) => {
			if (!privateRoomSession || privateRoomSession.host !== Player?.MemberNumber) return;
			broadcastNpcSnapshots(npcs);
		});
	} else {
		applyRemoteNpcSnapshots([]);
	}
}

function clearPrivateRoomSession(notifyOpponent: boolean): void {
	if (!privateRoomSession) return;
	const { opponent, roomId } = privateRoomSession;
	privateRoomSession = null;
	if (notifyOpponent && opponent) {
		sendHiddenBCMAMessage(opponent, {
			action: "roomSimClose",
			roomId,
		});
	}
}

function broadcastNpcSnapshots(npcs: RoomNpcSnapshotData[]): void {
	if (!privateRoomSession) return;
	if (!npcs.length) return;
	const target = privateRoomSession.guest;
	if (typeof target !== "number") return;
	if (target === Player?.MemberNumber) return;
	sendHiddenBCMAMessage(target, {
		action: "roomNpcSync",
		roomId: privateRoomSession.roomId,
		owner: Player?.MemberNumber ?? -1,
		npcs,
	});
}

function closeSimulatedRoom(notifyOpponent: boolean): void {
	if (privateRoomSession) {
		clearPrivateRoomSession(notifyOpponent);
	}
	closePrivateRoomSimulation(false);
}

function canPlayerTravel(): boolean {
	const actor = Player;
	if (!actor) return false;
	if (typeof actor.CanWalk === "function" && !actor.CanWalk()) return false;
	return true;
}

export {};
