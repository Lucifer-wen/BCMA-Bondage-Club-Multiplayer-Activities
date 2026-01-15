import type { CharacterLike } from "../types/character";

export interface RoomNpcSnapshotData {
	id: string;
	name: string;
	nickname?: string;
	title?: string;
	appearance: string;
	labelColor?: string;
}

declare global {
	var Player: CharacterLike | undefined;
	var ChatRoomCharacter: CharacterLike[] | undefined;
	var PrivateCharacter: CharacterLike[] | undefined;
	function PrivateLoad(): Promise<void> | void;
	function CharacterLoadCanvas(character: CharacterLike): void;
	function CharacterRefresh(character: CharacterLike): void;
	function CharacterAppearanceStringify(character: CharacterLike): string;
	function CharacterAppearanceRestore(character: CharacterLike, data: string): void;
	function CharacterLoadSimple(id: string): CharacterLike;
}

interface SimulatedRoomSession {
	roomId: string;
	host: number;
	guest: number;
}

let overlayElement: HTMLDivElement | null = null;
let contentElement: HTMLDivElement | null = null;
let hostContainer: HTMLDivElement | null = null;
let guestContainer: HTMLDivElement | null = null;
let session: SimulatedRoomSession | null = null;
let closeCallback: (() => void) | null = null;
let stylesInjected = false;
let npcPanelElement: HTMLDivElement | null = null;
let npcNameElement: HTMLSpanElement | null = null;
let localNpcSnapshots: RenderableNpc[] = [];
let remoteNpcSnapshots: RenderableNpc[] = [];
let npcIndex = 0;

interface RenderableNpc {
	id: string;
	name: string;
	source: "local" | "remote";
	character: CharacterLike | null;
	labelColor?: string;
}

export function registerPrivateRoomModule(): void {
	// currently nothing to initialize, but kept for parity with other modules
}

export function openPrivateRoomSimulation(roomId: string, host: number, guest: number, onClose?: () => void): void {
	closeCallback = onClose ?? null;
	session = { roomId, host, guest };
	ensureOverlay();
	renderCharacters();
	renderNpcPanel();
}

export function closePrivateRoomSimulation(triggerCallback = true): void {
	if (triggerCallback && closeCallback) {
		try {
			closeCallback();
		} catch (error) {
			console.error("[BCMA] Private room close callback failed", error);
		}
	}
	closeCallback = null;
	session = null;
	if (overlayElement) {
		overlayElement.remove();
		overlayElement = null;
		contentElement = null;
		hostContainer = null;
		guestContainer = null;
		npcPanelElement = null;
		npcNameElement = null;
	}
	localNpcSnapshots = [];
	remoteNpcSnapshots = [];
	npcIndex = 0;
}

export function isPrivateRoomActive(): boolean {
	return session !== null;
}

export function getActivePrivateRoomId(): string | null {
	return session?.roomId ?? null;
}

function ensureOverlay(): void {
	if (!stylesInjected) {
		const style = document.createElement("style");
		style.textContent = `
.bcma-private-room-overlay {
	position: fixed;
	inset: 0;
	background: rgba(10, 0, 20, 0.85);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 6000;
}
.bcma-private-room-content {
	position: relative;
	width: 90vw;
	height: 90vh;
	background-size: cover;
	background-position: center;
	box-shadow: 0 0 25px rgba(0, 0, 0, 0.6);
	border: 2px solid #fff;
	display: flex;
	flex-direction: column;
	padding: 20px;
}
.bcma-private-room-characters {
	flex: 1;
	display: flex;
	align-items: flex-end;
	justify-content: space-around;
	gap: 20px;
}
.bcma-private-room-character {
	width: 40%;
	height: 100%;
	display: flex;
	align-items: flex-end;
	justify-content: center;
}
.bcma-private-room-character img {
	max-width: 100%;
	max-height: 100%;
	object-fit: contain;
}
.bcma-private-room-npc-panel {
	margin-top: 10px;
	padding: 10px;
	background: rgba(0, 0, 0, 0.55);
	border: 1px solid rgba(255, 255, 255, 0.3);
	display: flex;
	flex-direction: column;
	gap: 8px;
	min-height: 220px;
}
.bcma-private-room-npc-header {
	color: #fff;
	font-weight: bold;
	text-align: center;
}
.bcma-private-room-npc-stage {
	min-height: 180px;
	display: flex;
	justify-content: center;
	align-items: flex-end;
}
.bcma-private-room-npc-stage .bcma-private-room-character {
	width: 60%;
}
.bcma-private-room-npc-nav {
	display: flex;
	justify-content: center;
	gap: 10px;
}
.bcma-private-room-npc-nav button {
	padding: 6px 14px;
	border: 1px solid #fff;
	background: rgba(0, 0, 0, 0.6);
	color: #fff;
	cursor: pointer;
}
.bcma-private-room-npc-nav button:hover {
	background: rgba(255, 255, 255, 0.2);
}
.bcma-private-room-actions {
	display: flex;
	justify-content: flex-end;
	gap: 10px;
}
.bcma-private-room-actions button {
	padding: 10px 16px;
	font-size: 16px;
	border: 1px solid #fff;
	background: rgba(0, 0, 0, 0.6);
	color: #fff;
	cursor: pointer;
}
.bcma-private-room-actions button:hover {
	background: rgba(255, 255, 255, 0.15);
}
`;
		document.head.appendChild(style);
		stylesInjected = true;
	}

	if (overlayElement) return;
	overlayElement = document.createElement("div");
	overlayElement.className = "bcma-private-room-overlay";
	contentElement = document.createElement("div");
	contentElement.className = "bcma-private-room-content";
	contentElement.style.backgroundImage = `url("Backgrounds/PrivateRoom.jpg")`;

	const characters = document.createElement("div");
	characters.className = "bcma-private-room-characters";
	hostContainer = document.createElement("div");
	hostContainer.className = "bcma-private-room-character";
	guestContainer = document.createElement("div");
	guestContainer.className = "bcma-private-room-character";
	characters.appendChild(hostContainer);
	characters.appendChild(guestContainer);

	const npcPanel = document.createElement("div");
	npcPanel.className = "bcma-private-room-npc-panel";
	const npcHeader = document.createElement("div");
	npcHeader.className = "bcma-private-room-npc-header";
	npcNameElement = document.createElement("span");
	npcNameElement.textContent = "Collecting private NPCs…";
	npcHeader.appendChild(npcNameElement);
	npcPanelElement = document.createElement("div");
	npcPanelElement.className = "bcma-private-room-npc-stage";
	const npcNav = document.createElement("div");
	npcNav.className = "bcma-private-room-npc-nav";
	const prevBtn = document.createElement("button");
	prevBtn.type = "button";
	prevBtn.textContent = "◀";
	prevBtn.onclick = () => changeNpcIndex(-1);
	const nextBtn = document.createElement("button");
	nextBtn.type = "button";
	nextBtn.textContent = "▶";
	nextBtn.onclick = () => changeNpcIndex(1);
	npcNav.append(prevBtn, nextBtn);
	npcPanel.append(npcHeader, npcPanelElement, npcNav);

	const actions = document.createElement("div");
	actions.className = "bcma-private-room-actions";
	const exitButton = document.createElement("button");
	exitButton.type = "button";
	exitButton.textContent = "Leave private room";
	exitButton.onclick = () => closePrivateRoomSimulation();
	actions.appendChild(exitButton);

	contentElement.appendChild(characters);
	contentElement.appendChild(npcPanel);
	contentElement.appendChild(actions);
	overlayElement.appendChild(contentElement);
	document.body.appendChild(overlayElement);
}

function renderCharacters(): void {
	if (!session || !hostContainer || !guestContainer) return;
	const host = findCharacter(session.host);
	const guest = findCharacter(session.guest);
	renderCharacter(host, hostContainer);
	renderCharacter(guest, guestContainer);
}

function renderCharacter(character: CharacterLike | null, container: HTMLDivElement): void {
	container.innerHTML = "";
	if (!character) {
		const placeholder = document.createElement("p");
		placeholder.style.color = "#fff";
		placeholder.textContent = "Unavailable";
		container.appendChild(placeholder);
		return;
	}
	try {
		if (CharacterLoadCanvas) {
			CharacterLoadCanvas(character);
		} else {
			CharacterRefresh?.(character);
		}
		const canvasElement = character.Canvas || character.CanvasBlink;
		if (canvasElement) {
			const image = document.createElement("img");
			image.alt = character.Nickname ?? character.Name ?? "Player";
			image.src = canvasElement.toDataURL("image/png");
			container.appendChild(image);
			return;
		}
	} catch (error) {
		console.error("[BCMA] Failed to render character canvas", error);
	}
	const fallback = document.createElement("p");
	fallback.style.color = "#fff";
	fallback.textContent = character.Nickname ?? character.Name ?? `Player ${character.MemberNumber ?? "?"}`;
	container.appendChild(fallback);
}

function renderNpcPanel(): void {
	if (!npcPanelElement || !npcNameElement) return;
	const list = getActiveNpcSnapshots();
	npcPanelElement.innerHTML = "";
	if (!list.length) {
		const placeholder = document.createElement("p");
		placeholder.style.color = "#fff";
		placeholder.textContent = session ? "Waiting for NPC data…" : "No session active.";
		npcPanelElement.appendChild(placeholder);
		npcNameElement.textContent = "No NPCs";
		return;
	}
	if (npcIndex >= list.length) npcIndex = 0;
	const current = list[npcIndex];
	if (current?.character) {
		const wrapper = document.createElement("div");
		wrapper.className = "bcma-private-room-character";
		renderCharacter(current.character, wrapper);
		npcPanelElement.appendChild(wrapper);
	} else {
		const fallback = document.createElement("p");
		fallback.style.color = "#fff";
		fallback.textContent = "NPC preview unavailable.";
		npcPanelElement.appendChild(fallback);
	}
	npcNameElement.textContent = current?.name ?? "NPC";
	if (current?.labelColor) {
		npcNameElement.style.color = current.labelColor;
	} else {
		npcNameElement.style.color = "#fff";
	}
}

function changeNpcIndex(offset: number): void {
	const list = getActiveNpcSnapshots();
	if (!list.length) return;
	npcIndex = (npcIndex + offset + list.length) % list.length;
	renderNpcPanel();
}

function getActiveNpcSnapshots(): RenderableNpc[] {
	if (!session) return [];
	if (Player && session.host === Player.MemberNumber) {
		return localNpcSnapshots;
	}
	return remoteNpcSnapshots;
}

function buildLocalNpcRenderList(): RenderableNpc[] {
	if (!Array.isArray(PrivateCharacter)) return [];
	return PrivateCharacter.filter((char) => char && char !== Player).map((char, index) => ({
		id: deriveNpcId(char, index),
		name: getCharacterDisplayName(char),
		source: "local" as const,
		character: char,
		labelColor: (char as Record<string, unknown>).LabelColor as string | undefined,
	}));
}

function buildLocalNpcSnapshotPayload(): RoomNpcSnapshotData[] {
	if (!Array.isArray(PrivateCharacter)) return [];
	return PrivateCharacter.filter((char) => char && char !== Player).map((char, index) => ({
		id: deriveNpcId(char, index),
		name: getCharacterDisplayName(char),
		nickname: char.Nickname,
		title: (char as Record<string, unknown>).Title as string | undefined,
		labelColor: (char as Record<string, unknown>).LabelColor as string | undefined,
		appearance: typeof CharacterAppearanceStringify === "function" ? CharacterAppearanceStringify(char) : "",
	}));
}

function convertSnapshotToRenderable(snapshot: RoomNpcSnapshotData): RenderableNpc {
	let character: CharacterLike | null = null;
	if (typeof CharacterLoadSimple === "function" && typeof CharacterAppearanceRestore === "function") {
		try {
			const simple = CharacterLoadSimple(`BCMA-PrivateNPC-${snapshot.id}`);
			if (snapshot.appearance) {
				CharacterAppearanceRestore(simple, snapshot.appearance);
			}
			simple.Name = snapshot.name;
			simple.Nickname = snapshot.nickname ?? snapshot.name;
			character = simple;
		} catch (error) {
			console.warn("[BCMA] Failed to build NPC preview", error);
		}
	}
	return {
		id: snapshot.id,
		name: snapshot.name,
		source: "remote",
		character,
		labelColor: snapshot.labelColor,
	};
}

function deriveNpcId(character: CharacterLike, index: number): string {
	const base = (character as Record<string, unknown>).AccountName
		|| character.MemberNumber
		|| character.Name
		|| `npc-${index}`;
	return String(base);
}

function getCharacterDisplayName(character?: CharacterLike | null): string {
	if (!character) return "NPC";
	return character.Nickname ?? character.Name ?? "NPC";
}

function findCharacter(member: number): CharacterLike | null {
	if (typeof member !== "number") return null;
	if (Player?.MemberNumber === member) return Player ?? null;
	if (Array.isArray(ChatRoomCharacter)) {
		const match = ChatRoomCharacter.find(c => c.MemberNumber === member);
		if (match) return match;
	}
	return null;
}

export function refreshPrivateRoomCharacters(): void {
	if (session) renderCharacters();
}

export function refreshPrivateRoomNpcs(): void {
	if (!session) {
		localNpcSnapshots = [];
		renderNpcPanel();
		return;
	}
	if (Player && Player.MemberNumber === session.host) {
		localNpcSnapshots = buildLocalNpcRenderList();
	}
	renderNpcPanel();
}

export async function collectPrivateNpcSnapshots(): Promise<RoomNpcSnapshotData[]> {
	if (typeof PrivateLoad === "function") {
		try {
			await PrivateLoad();
		} catch (error) {
			console.warn("[BCMA] Failed to load private room NPCs", error);
		}
	}
	localNpcSnapshots = buildLocalNpcRenderList();
	renderNpcPanel();
	return buildLocalNpcSnapshotPayload();
}

export function applyRemoteNpcSnapshots(data: RoomNpcSnapshotData[]): void {
	remoteNpcSnapshots = data.map((snapshot) => convertSnapshotToRenderable(snapshot));
	npcIndex = 0;
	if (session && Player && session.host !== Player.MemberNumber) {
		renderNpcPanel();
	}
}
