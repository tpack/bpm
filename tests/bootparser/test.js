var BootParser = require('../../lib/bootparser');

//BootParser.searchBootJs(testRootPath);

var jsParseResult = BootParser.build({

	// Set the root path for all paths.
	basePath: require("path").resolve(__dirname , "data"),
	path: 'test.js',
	js: 'build/test.js',
	css: 'build/test.css',
	images: 'build/images/',
	// print: function (type, content, path) {
		// if(type == 'js'){
			// content = content.print_to_string(this.options);
		// }
		// console.log("[" +  type + "]", content);
	// },
	jsOptions: {
		"beautify": true,
		"comments": true
	},
	init: function () {
		
		// The default path equals to '.'
		//context.include.basePath = testRootPath;
		
		// The default path equals to '~'.
		//context.include.currentPath = testRootPath;

	}
});

//console.log("-----------------------------------------------");
//console.log(jsParseResult.output);
//console.log(jsParseResult.refs);
//console.log(jsParseResult.ast.print_to_string({"beautify": true, "comments": true}));
//console.log("-----------------------------------------------");

