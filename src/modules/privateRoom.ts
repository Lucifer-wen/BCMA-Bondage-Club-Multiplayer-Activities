import type { CharacterLike } from "../types/character";

declare global {
	var Player: CharacterLike | undefined;
	var ChatRoomCharacter: CharacterLike[] | undefined;
	function CharacterLoadCanvas(character: CharacterLike): void;
	function CharacterRefresh(character: CharacterLike): void;
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

export function registerPrivateRoomModule(): void {
	// currently nothing to initialize, but kept for parity with other modules
}

export function openPrivateRoomSimulation(roomId: string, host: number, guest: number, onClose?: () => void): void {
	closeCallback = onClose ?? null;
	session = { roomId, host, guest };
	ensureOverlay();
	renderCharacters();
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
	}
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

	const actions = document.createElement("div");
	actions.className = "bcma-private-room-actions";
	const exitButton = document.createElement("button");
	exitButton.type = "button";
	exitButton.textContent = "Leave private room";
	exitButton.onclick = () => closePrivateRoomSimulation();
	actions.appendChild(exitButton);

	contentElement.appendChild(characters);
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
