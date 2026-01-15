export interface CharacterLike {
	Dialog?: unknown;
	IsPlayer?: () => boolean;
	IsOnline?: () => boolean;
	IsOwnedByPlayer?: () => boolean;
	CanWalk?: () => boolean;
	CanTalk?: () => boolean;
	CanChangeOwnClothes?: () => boolean;
	IsRestrained?: () => boolean;
	Name?: string;
	Nickname?: string;
	MemberNumber?: number;
	Canvas?: HTMLCanvasElement;
	CanvasBlink?: HTMLCanvasElement;
	MustDraw?: boolean;
	[key: string | symbol]: unknown;
}
