
var IO = require('io');


exports.compile = function (compileOptions, builder) {
	IO.copyFile(compileOptions.fromPhysicalPath, compileOptions.toPhysicalPath);
};