// ==UserScript==
// @name         BCMA - Bondage Club Multiplayer Activities (Loader)
// @namespace    BCMA
// @version      0.1.0
// @description  Loader for the BCMA mod
// @author       Lucifer-wen
// @include      /^https:\/\/(www\.)?bondageprojects\.elementfx\.com\/R\d+\/(BondageClub|\d+)(\/((index|\d+)\.html)?)?$/
// @include      /^https:\/\/(www\.)?bondage-europe\.com\/R\d+\/(BondageClub|\d+)(\/((index|\d+)\.html)?)?$/
// @include      /^https:\/\/(www\.)?bondage-asia\.com\/club\/R\d+(\/((index|\d+)\.html)?)?$/
// @homepage     https://github.com/Lucifer-wen/BCMA-Bondage-Club-Multiplayer-Activities-
// @source       https://github.com/Lucifer-wen/BCMA-Bondage-Club-Multiplayer-Activities-
// @downloadURL  https://lucifer-wen.github.io/BCMA-Bondage-Club-Multiplayer-Activities-/bcmaLoader.user.js
// @run-at       document-end
// @grant        none
// ==/UserScript==

setTimeout(() => {
	if (window.BCMA_LOADED === undefined) {
		const script = document.createElement("script");
		script.src = "https://lucifer-wen.github.io/BCMA-Bondage-Club-Multiplayer-Activities/bcma.js?_=" + Date.now();
		script.onload = () => script.remove();
		document.head.appendChild(script);
	}
}, 2000);
