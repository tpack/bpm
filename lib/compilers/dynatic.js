
var IO = require('../../../node/node_modules/io');


exports.processContent = function (content, options, builder) {
	return content;
};

exports.compile = function (compileConfig, builder) {
	var content = IO.readFile(compileConfig.fromPhysicalPath, builder.fromEncoding);
	content = this.processContent(content, compileConfig, builder);

	IO.writeFile(compileConfig.toPhysicalPath, content, builder.toEncoding);
};