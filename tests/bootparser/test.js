var BootParser = require('../../lib/bootparser');

// Set the root path for all paths.
BootParser.basePath = require("path").resolve(__dirname , "data");

//BootParser.searchBootJs(testRootPath);

var jsParseResult = BootParser.parseJs('test.js', function (context) {
	
	// The default path equals to '.'
	//context.include.basePath = testRootPath;
	
	// The default path equals to '~'.
	//context.include.currentPath = testRootPath;

});
/* 
// parseResult.ast;
// parseResult.fragments;
// parseResult.styles;
// parseResult.scripts;

var htmlParseResult = BootParser.parseHtml('test.html', function (context) {
	
	// The default path equals to '.'
	//context.include.basePath = testRootPath;
	
	// The default path equals to '~'.
	//context.include.currentPath = testRootPath;

});

// parseResult.dom;
// parseResult.fragments;
// parseResult.styles;
// parseResult.scripts;
// parseResult.context;


var cssParseResult = BootParser.parseCss('test.css', function (context) {
	

});
 */


// parseResult.styles;
// parseResult.images;


console.log(jsParseResult.scripts);
console.log(jsParseResult.styles);
console.log(jsParseResult.fragments);
console.log("-----------------------------------------------");
console.log(jsParseResult.ast.print_to_string({"beautify": true, "comments": true}));
console.log("-----------------------------------------------");

// print all results in one js file.
var result = 0 && BootParser.print(jsParseResult, function(context) {
	
	context.target.js = 'build/test.js';
	
	// Specify the target css path, or all css code will be generated in js file.
	context.target.css = 'build/test.css';
	
	// Specify the target images path, or images are not copied.
	context.target.images = 'build/images';
	
	context.target.html = 'build/test.js';
	
	// context.target.printJs = function(content){};
	// context.target.printCss = function(content){};
	// context.target.printHtml = function(content){};
	// context.target.copyImages = function(imagePath, cssFileRelated){};

});

