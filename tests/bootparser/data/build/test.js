/*********************************************************
 * This file is created by a tool at 2013/1/10 17:45
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

document.write('<style type="text/css">\r\n/*********************************************************\r\n * style-c.css\r\n ********************************************************/\r\n\r\n.c {}\r\n\r\n\r\n/*********************************************************\r\n * style-e.css\r\n ********************************************************/\r\n\r\n.e {}\r\n\r\n/*********************************************************\r\n * style-b.css\r\n ********************************************************/\r\n\r\n.b {\r\n	background: url(images/test.bmp);\r\n}</style>');
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