/**
 * Bpm - BootJs project manager.
 * Usages:
 * 		- build(configs);
 */

var BootParser = require('./bootparser'); 

/**
 * 
 * @param {Object} configs The config object of current build.
 *
 * - 
 */
exports.build = function (configs) {
	
	BootParser.parse(configs);
	
};


