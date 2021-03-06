﻿
var IO = require('io');

exports.parse = function (sourceCode, compileOptions, builder) {
	return sourceCode;
};

exports.compile = function (compileOptions, builder) {
	var sourceCode = IO.readFile(compileOptions.fromPhysicalPath, builder.fromEncoding);
	sourceCode = this.parse(sourceCode, compileOptions, builder);
	IO.writeFile(compileOptions.toPhysicalPath, sourceCode, builder.toEncoding);
};