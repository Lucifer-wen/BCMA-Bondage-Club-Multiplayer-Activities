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
	IsOwnedByPlayer?: () => boolean;
	Name?: string;
	Nickname?: string;
	MemberNumber?: number;
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

interface OpponentGameConfig {
	prepareState: (opponent: CharacterLike) => void;
	initSync?: (opponent: CharacterLike, matchId: string) => void;
}

const SELF_MAIN_STAGE = "100";
const SELF_SUBMENU_STAGE = "9100";
const TARGET_MAIN_STAGE = "40";
const TARGET_SUBMENU_STAGE = "9200";

const SELF_DIALOG_FLAG = Symbol("bcma-self-dialog");
const TARGET_DIALOG_FLAG = Symbol("bcma-target-dialog");
const inviteIdToOpponent: Map<string, { gameId: string; opponent: CharacterLike; matchId?: string }> = new Map();
const pendingInviteResponseIds: Set<string> = new Set();
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
	gameId: string;
	matchId?: string;
}
interface BCMAInvitePayload extends BCMAInvitePayloadBase {
	action: "invite";
	id: string;
	initiator: number;
	target: number;
	initiatorName: string;
}
interface BCMAInviteResponsePayload extends BCMAInvitePayloadBase {
	action: "response";
	id: string;
	accepted: boolean;
}
interface BCMAForcePayload extends BCMAInvitePayloadBase {
	action: "forceStart";
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

type BCMAHiddenPayload = BCMAInvitePayload | BCMAInviteResponsePayload | BCMAForcePayload | BCMATennisScorePayload;

function sendHiddenBCMAMessage(target: number, payload: BCMAHiddenPayload): void {
	if (!ServerPlayerIsInChatRoom()) return;
	ServerSend("ChatRoomChat", {
		Content: "BCMA",
		Type: "Hidden",
		Target: target,
		Dictionary: payload,
	});
}

function ensureChatRoomMessageHook(): void {
	if (chatRoomMessageHookInstalled) return;
	const original = (globalThis as Record<string, any>).ChatRoomMessage;
	if (typeof original !== "function") {
		setTimeout(ensureChatRoomMessageHook, 500);
		return;
	}
	(globalThis as Record<string, any>).ChatRoomMessage = function BCMAChatRoomMessage(this: unknown, data: any, ...rest: any[]) {
		if (data?.Type === "Hidden" && data.Content === "BCMA" && typeof data.Dictionary === "object") {
			handleBCMAHiddenMessage(data.Sender, data.Dictionary as BCMAHiddenPayload);
			return;
		}
		return original.call(this, data, ...rest);
	};
	chatRoomMessageHookInstalled = true;
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

function ensureTennisRunHook(): void {
	if (tennisHookInstalled)
		return;
	const globalObj = globalThis as Record<string, any>;
	const original = globalObj.TennisRun;
	if (typeof original !== "function") {
		setTimeout(ensureTennisRunHook, 500);
		return;
	}
	globalObj.TennisRun = function BCMATennisRun(this: unknown, ...args: any[]) {
		const result = original.apply(this, args);
		recordTennisScore();
		return result;
	};
	tennisHookInstalled = true;
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

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

export {};
