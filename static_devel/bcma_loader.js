(function () {
	const url = "http://localhost:8080/bcma.dev.js";
	const script = document.createElement("script");
	script.src = url + "?_=" + Date.now();
	script.type = "text/javascript";
	document.head.appendChild(script);
})();
