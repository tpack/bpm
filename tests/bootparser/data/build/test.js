/*********************************************************
 * This file is created by a tool at 2013/1/10 17:37
 ********************************************************/
if(typeof exclude === "function") {
	exclude("test.js");
	exclude("module-a.js");
	exclude("module-c.js");
	exclude("style-c.css");
	exclude("style-e.css");
	exclude("module-b.js");
	exclude("style-b.css");
	exclude("html-a.inc");
	exclude("module-d.js");
}

document.write('html-a.inc\n<script>alert("d");\n\nalert("html-a");</script>');
/*********************************************************
 * test.js
 ********************************************************/

/*********************************************************
 * module-a.js
 ********************************************************/

/*********************************************************
 * module-c.js
 ********************************************************/


alert("c");
/*********************************************************
 * module-b.js
 ********************************************************/




alert("b");



alert("a");



alert("test");