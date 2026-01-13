(function () {
	const url = "https://example.com/bcma.js";
	const script = document.createElement("script");
	script.src = url + "?v=__BCMA_VERSION__";
	script.type = "text/javascript";
	document.head.appendChild(script);
})();
