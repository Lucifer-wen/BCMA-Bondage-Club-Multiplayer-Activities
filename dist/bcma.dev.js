/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/core/register.ts"
/*!******************************!*\
  !*** ./src/core/register.ts ***!
  \******************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   registerCoreHooks: () => (/* binding */ registerCoreHooks)
/* harmony export */ });
/* harmony import */ var _modules_minigames__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../modules/minigames */ "./src/modules/minigames.ts");

function registerCoreHooks() {
    (0,_modules_minigames__WEBPACK_IMPORTED_MODULE_0__.registerMiniGameMenu)();
}


/***/ },

/***/ "./src/modules/minigames.ts"
/*!**********************************!*\
  !*** ./src/modules/minigames.ts ***!
  \**********************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   registerMiniGameMenu: () => (/* binding */ registerMiniGameMenu)
/* harmony export */ });
const MINI_GAMES = Object.freeze([
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
let originalCharacterBuildDialog;
let originalDialogCanPerformCharacterAction;
function registerMiniGameMenu() {
    installGlobalHelpers();
    patchCharacterBuildDialog();
    patchCharacterActionCheck();
    tryAugmentExistingDialogs();
}
function installGlobalHelpers() {
    const globalObj = globalThis;
    if (!globalObj.DialogBCMAStartMiniGame) {
        globalObj.DialogBCMAStartMiniGame = (id) => startMiniGame(id);
    }
    if (!globalObj.DialogBCMACanShowMiniGamesSelf) {
        globalObj.DialogBCMACanShowMiniGamesSelf = () => isInChatRoom();
    }
    if (!globalObj.DialogBCMACanShowMiniGamesTarget) {
        globalObj.DialogBCMACanShowMiniGamesTarget = () => {
            const target = globalObj.CurrentCharacter;
            if (!target || target === globalObj.Player)
                return false;
            if (typeof target.IsPlayer === "function" && target.IsPlayer())
                return false;
            if (typeof InventoryIsBlockedByDistance === "function" && InventoryIsBlockedByDistance(target))
                return false;
            return isInChatRoom();
        };
    }
    if (!globalObj.DialogBCMACanShowMiniGames) {
        globalObj.DialogBCMACanShowMiniGames = () => {
            const current = globalObj.CurrentCharacter;
            if (current && typeof current.IsPlayer === "function" && current.IsPlayer()) {
                return globalObj.DialogBCMACanShowMiniGamesSelf();
            }
            return globalObj.DialogBCMACanShowMiniGamesTarget();
        };
    }
    if (!globalObj.DialogBCMAMiniGameReturn) {
        globalObj.DialogBCMAMiniGameReturn = () => {
            if (typeof CurrentModule === "string" && typeof CurrentScreen === "string" && CurrentScreen === "ChatRoom")
                return;
            if (typeof CommonSetScreen === "function") {
                CommonSetScreen("Online", "ChatRoom");
            }
        };
    }
}
function patchCharacterBuildDialog() {
    const globalObj = globalThis;
    if (originalCharacterBuildDialog)
        return;
    const original = globalObj.CharacterBuildDialog;
    if (typeof original !== "function") {
        console.warn("[BCMA] CharacterBuildDialog is not available; mini-game menu injection skipped.");
        return;
    }
    originalCharacterBuildDialog = original;
    globalObj.CharacterBuildDialog = function BCMACharacterBuildDialog(character, csv, prefix, reload) {
        originalCharacterBuildDialog?.call(this, character, csv, prefix, reload);
        tryInjectMiniGameMenu(character);
    };
}
function patchCharacterActionCheck() {
    const globalObj = globalThis;
    if (originalDialogCanPerformCharacterAction)
        return;
    const original = globalObj.DialogCanPerformCharacterAction;
    if (typeof original !== "function")
        return;
    originalDialogCanPerformCharacterAction = original;
    globalObj.DialogCanPerformCharacterAction = function BCMADialogCanPerformCharacterAction() {
        const result = originalDialogCanPerformCharacterAction?.call(this) ?? false;
        if (result)
            return true;
        if (typeof globalObj.DialogBCMACanShowMiniGames === "function") {
            return globalObj.DialogBCMACanShowMiniGames();
        }
        return false;
    };
}
function tryAugmentExistingDialogs(attempts = 10) {
    const updated = injectForKnownCharacters();
    if (!updated && attempts > 0) {
        setTimeout(() => tryAugmentExistingDialogs(attempts - 1), 500);
    }
}
function injectForKnownCharacters() {
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
function tryInjectMiniGameMenu(character) {
    if (!character || !Array.isArray(character.Dialog))
        return false;
    if (character.IsPlayer?.()) {
        return injectSelfMenu(character);
    }
    if (character.IsOnline?.()) {
        return injectTargetMenu(character);
    }
    return false;
}
function injectSelfMenu(character) {
    if (character[SELF_DIALOG_FLAG])
        return false;
    const dialog = character.Dialog;
    if (!Array.isArray(dialog))
        return false;
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
function injectTargetMenu(character) {
    if (character[TARGET_DIALOG_FLAG])
        return false;
    const dialog = character.Dialog;
    if (!Array.isArray(dialog))
        return false;
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
function buildSubMenuLines(selfMenu) {
    const submenuStage = selfMenu ? SELF_SUBMENU_STAGE : TARGET_SUBMENU_STAGE;
    const backResult = selfMenu ? "(Possible character actions.)" : "(Possible character actions.)";
    const backNextStage = selfMenu ? SELF_MAIN_STAGE : TARGET_MAIN_STAGE;
    const lines = [];
    for (const game of MINI_GAMES) {
        lines.push(createLine({
            Stage: submenuStage,
            Option: selfMenu ? game.labelSelf : game.labelTarget,
            Result: selfMenu ? game.descriptionSelf : game.descriptionTarget,
            Function: `DialogBCMAStartMiniGame("${game.id}")`,
        }));
    }
    lines.push(createLine({
        Stage: submenuStage,
        NextStage: backNextStage,
        Option: "(Back to character actions.)",
        Result: backResult,
    }));
    return lines;
}
function ensureDialogLine(dialog, candidate) {
    if (!candidate.Option || !candidate.Stage)
        return false;
    const exists = dialog.some((line) => line.Stage === candidate.Stage && line.Option === candidate.Option);
    if (exists)
        return false;
    dialog.push(candidate);
    return true;
}
function createLine({ Stage, NextStage = null, Option = null, Result = null, Function = null, Prerequisite = null, Group = null, Trait = null, }) {
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
function startMiniGame(id) {
    const definition = GAME_LOOKUP.get(id);
    if (!definition) {
        console.warn(`[BCMA] Unknown mini-game requested: ${id}`);
        return false;
    }
    if (typeof MiniGameStart !== "function")
        return false;
    try {
        MiniGameStart(definition.id, definition.difficulty ?? 0, "DialogBCMAMiniGameReturn");
        return true;
    }
    catch (error) {
        console.error("[BCMA] Failed to start mini-game", id, error);
        return false;
    }
}
function isInChatRoom() {
    try {
        return typeof ServerPlayerIsInChatRoom === "function" && ServerPlayerIsInChatRoom();
    }
    catch {
        return false;
    }
}


/***/ }

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Check if module exists (development only)
/******/ 		if (__webpack_modules__[moduleId] === undefined) {
/******/ 			var e = new Error("Cannot find module '" + moduleId + "'");
/******/ 			e.code = 'MODULE_NOT_FOUND';
/******/ 			throw e;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!**********************!*\
  !*** ./src/index.ts ***!
  \**********************/
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   bootstrapBCMA: () => (/* binding */ bootstrapBCMA)
/* harmony export */ });
/* harmony import */ var _core_register__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./core/register */ "./src/core/register.ts");

function bootstrapBCMA() {
    console.log(`[BCMA] Loading Bondage Club Multiplayer Activities v${globalThis.BCMA_VERSION ?? "dev"}`);
    (0,_core_register__WEBPACK_IMPORTED_MODULE_0__.registerCoreHooks)();
}
// Auto-start when script injected
if (!globalThis.BCMA_LOADED) {
    globalThis.BCMA_LOADED = true;
    bootstrapBCMA();
}

})();

/******/ })()
;
//# sourceMappingURL=bcma.dev.js.map