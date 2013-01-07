
var IO = require('../../../node/node_modules/io'),
	Parser = require('../../../node/node_modules/parser');

exports.processContent = Parser.compressJsWithUglifyJsSync;

exports.compile = require('./dynatic').compile;