/**
 * The builder class.
 */
	
var Http = require('http'),
	Path = require('path'),
	Url = require('url'),
	FS = require('fs'),
	Util = require('util'),
	Helpers = require('helpers'),
	IO = require('io');

/**
 * A tool to build all files.
 */
function Builder(configs){
	this.loadConfigs(configs);
	this._buildCache = {};
}

Builder.prototype = {
	
	/**
	 * The source directory to build.
	 */
	fromBasePath: null,
	
	/**
	 * The target directory to build.
	 */
	toBasePath: null,
	
	/**
	 * The default encoding of files in source directory.
	 */
	fromEncoding: "utf-8",
	
	/**
	 * The default encoding of files in target directory.
	 */
	toEncoding: "utf-8",
	
	/**
	 * The rule maps that indicates how files are build.
	 * @type {Array}
	 * @examples
	 * [{
	 * 		"match": "\\.html$",  // If the virtual path matchs this regual expression, apply the configs below.
	 * 		"compiler": "html",   // Indicates the compiler to use. The value is the file name, which can be found in "bpm/lib/compilers/".
	 * 		"continue": true,     // Continue to check other rules if set to true. Default to false.
	 *		"from": "\\.html$",   // A regual expression, if specified, the build tool will replace "from" in virtual path to "to".
	 *		"to": "\\.htm$",
	 *		"skip": false		  // Set to true to this file should not be built.
	 * 		"replaceBasePath": true // This is a config field for compilers. See the compiler document for more information.
	 * }]
	 */
	rules: null,
	
	/**
	 * Print an error to console.
	 */
	error: function (message, sourceVirtualPath, sourcePhysicalPath, to) {
		console.log(message, sourcePhysicalPath);
	},
	
	/**
	 * Print an log to console.
	 */
	log: function (message, sourceVirtualPath, sourcePhysicalPath, to) {
		console.log(message, sourcePhysicalPath);
	},

	/**
	 * Print an message to console when a file is built by the build tool.
	 */
	info: function (sourceVirtualPath, sourcePhysicalPath, targetVirtualPath, targetPhysicalPath) {
		console.log(sourceVirtualPath, "->", targetVirtualPath);
	},

	/**
	 * Print an message to console when a file is skipped by the build tool.
	 */
	skip: function (message, sourceVirtualPath, sourcePhysicalPath, to) {
		console.log(message, sourceVirtualPath);
	},

	/**
	 * load a config object.
	 */
	loadConfigs: function (configs) {
		
		// Copy memebers to current object.
		for(var key in configs){
			var value = configs[key];
			if (typeof value === 'object' && value) {
				if (typeof value.length === 'number' && value.slice) {
					this[key] = value.slice(0);
				} else {
					this[key] = Helpers.extend(Helpers.extend({}, this[key]), value);
				}
			} else {
				this[key] = value;
			}
		}

		if (this.rules) {
			for (var i = 0; i < this.rules.length; i++) {
				var rule = this.rules[i];

				if (rule.match) {
					rule.match = new RegExp(rule.match);
				}

				if (rule.from) {
					rule.from = new RegExp(rule.from);
				}
			
			}
		}

	},

	/**
	 * Build specified files or directories.
	 * @param {String} [from] The source path to build from. The path can use the format such as "dir/*.js". If not specified, the builder will try to build all files in fromBasePath.
	 * @param {String} [to] The target path. If not specified, the builder will try to figure it out by rules.
	 * @return {Number} The count of built files.
	 */
	build: function (from, to, configs) {
	
		var filter;
		
		// Set path to "/" if empty.
		if(!from) {
			from = "/";
		
			// Test for "dir/*.ext"
		} else if(/[\*\?]/.test(from)) {
		
			// Split from to [Path without */?] / [Path with */?]
			filter = /^([^\*\?]*[\\\/])(.*)$/.exec(from) || [0, "/", from];
			from = from[0];
			filter = filter[1];
		}

		// Convert to physical path.
		var fromPhysicalPath = toPhysicalPath(from, this.fromBasePath);

		// Convert to virtual path.
		var fromVirtualPath = toVirtualPath(fromPhysicalPath, this.fromBasePath);

		// If path is a directory, publish all files in it.
		if (IO.existsDir(fromPhysicalPath)) {
			this._buildDir(fromVirtualPath, fromPhysicalPath, to, configs, filter);
		} else if (IO.existsFile(fromPhysicalPath)) {
			this._buildFile(fromVirtualPath, fromPhysicalPath, to, configs);
		} else {
			this.skip("No such a file or directory.", fromVirtualPath, fromPhysicalPath, to);
		}

	},
	
	/**
	 * Build the specified file.
	 */
	buildFile: function (from, to, configs) {
		
		// Convert to physical path.
		var fromPhysicalPath = toPhysicalPath(from, this.fromBasePath);

		// Convert to virtual path.
		var fromVirtualPath = toVirtualPath(fromPhysicalPath, this.fromBasePath);
		
		if (IO.exists(fromPhysicalPath)) {
			this._buildFile(fromVirtualPath, fromPhysicalPath, to, configs);
		}
	},
	
	/**
	 * Build a file with the specified compiler options.
	 */
	buildByCompileOptions: function (compileOptions) {
		this._buildFile(compileOptions.fromVirtualPath, compileOptions.fromPhysicalPath, compileOptions.toVirtualPath);
	},

	/**
	 * Get the compiler options for the specified path。
	 * @param {String} from The Path to build from.
	 * @param {String} to The Path to build to.
	 * @return {Object} Returns the config object like {fromPysicalPath:"", fromVirtualPath:"", toPysicalPath:"", _toVirtualPath:"", complier: ""}
	 */
	getCompileOptions: function (from, to) {

		// Convert to physical path.
		var fromPhysicalPath = toPhysicalPath(from, this.fromBasePath);

		// Convert to virtual path.
		var fromVirtualPath = toVirtualPath(fromPhysicalPath, this.fromBasePath);
		
		// Return the options.		return this._getCompileOptions(fromVirtualPath, fromPhysicalPath, to);    	},

	/**
	 * Build the specified directory.
	 */
	_buildDir: function (fromVirtualPath, fromPhysicalPath, to, configs, filter) {
		try {
		
			if(to) {
				to = toPhysicalPath(to, this.toBasePath);
			}
	
			var files = IO.getFiles(fromPhysicalPath), i;

			// Compile wildcard string to regual expression.
			if (filter) {
				filter = new RegExp("^" + filter.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&" ).replace(/\\\*/g, '.*' ).replace( /\\\?/g, '.' ) + '$');
				
				for (i = 0 ; i < files.length; i++) {
					if (filter.test(files[i]))
						this._buildFile(combimePath(fromVirtualPath, files[i], true), combimePath(fromPhysicalPath, files[i], false), to && combimePath(to, files[i], false), configs);
				}
			
			} else {
				for (i = 0 ; i < files.length; i++) {
					this._buildFile(combimePath(fromVirtualPath, files[i], true), combimePath(fromPhysicalPath, files[i], false), to && combimePath(to, files[i], false), configs);
				}
			
			}
			
		} catch(e) {
			this.error("Unexpected Error: " + e.toString(), fromVirtualPath, fromPhysicalPath, to);
		}
	},
	
	/**
	 * Build the specified file.
	 */
	_buildFile: function (fromVirtualPath, fromPhysicalPath, to, configs) {
		
		// Get compile configs.
		var compileOptions = this._getCompileOptions(fromVirtualPath, fromPhysicalPath, to);
		
		// If configs specified, apply to the default options.
		if(configs) {
			Helpers.extend(compileOptions, configs);
		}
		
		if(compileOptions.skip) {
			return;
		}

		compileOptions.skip = true;

		var compiler;
		
		// If compiler is specified, try to load it.
		if(compileOptions.compiler) {

			try {
				compiler = require('./compilers/' + compileOptions.compiler);
			} catch (e) {
				this.error('load Compiler `' + compileOptions.compiler + '` Error: ' + e.message, fromVirtualPath, fromPhysicalPath);
			}
		
		}
		
		if (compiler) {
			try {
				this.info(fromVirtualPath, fromPhysicalPath, compileOptions.toVirtualPath, compileOptions.toPhysicalPath);
				compiler.compile(compileOptions, this);
			} catch (e) {
				this.error("Compile Error: " + e.message, fromVirtualPath, fromPhysicalPath);
			}
		} else {
			this.skip("No compiler available.", fromVirtualPath, fromPhysicalPath);
		}
	
	},

	/**
	 * Get the compiler for specified path。
	 * @return {Object} Returns the config object like {fromPysicalPath:"", fromVirtualPath:"", toPysicalPath:"", _toVirtualPath:"", complier: ""}
	 */
	_getCompileOptions: function (fromVirtualPath, fromPhysicalPath, to) {
		
		if (this._buildCache[fromVirtualPath]) {
			return this._buildCache[fromVirtualPath];
		}

		var compileOptions = this._buildCache[fromVirtualPath] = { 
			fromVirtualPath: fromVirtualPath, 
			fromPhysicalPath: fromPhysicalPath
		};
		
		if(to){
			compileOptions.toPhysicalPath = toPhysicalPath(to, this.toBasePath);
			compileOptions.toVirtualPath = toVirtualPath(compileOptions.toPhysicalPath, this.toBasePath);
		} else {
			compileOptions.toVirtualPath = fromVirtualPath;
			
			if(this.rules) {
				for (var i = 0; i < this.rules.length; i++) {
					var rule = this.rules[i];

					if (!rule.match) {

						// If not match field, just regard as global rule which apply to all options.
						for (var r in rule) {
							if (compileOptions[r] === undefined) {
								compileOptions[r] = rule[r];
							}
						}

					} else if (rule.match.test(fromVirtualPath)) {
						
						// apply the rules.
						Helpers.extend(compileOptions, rule);

						if (compileOptions.from && compileOptions.to) {
							compileOptions.toVirtualPath = compileOptions.fromVirtualPath.replace(compileOptions.from, compileOptions.to);
						}

						if (!rule["continue"]) {
							break;
						}
					}
				}
			}
			
			compileOptions.toPhysicalPath = toPhysicalPath(compileOptions.toVirtualPath, this.toBasePath);
			
			// Dump path, just rename the toPhysicalPath
			if(compileOptions.toPhysicalPath === compileOptions.fromVirtualPath) {
				compileOptions.toVirtualPath = compileOptions.toVirtualPath.replace(/\.\w+/, "-build$1");
			}
			
		}
		
		// Set compiler default to staticfile.
		if(!('compiler' in compileOptions)) {
			compileOptions.compiler = "staticfile";
		}
		
		return compileOptions;
	}

};


function combimePath(pathA, pathB, isRelative) {
	pathA = Path.join(pathA, pathB);
	if (isRelative) {
		pathA = pathA.replace(/\\/g, '/');
	}

	return pathA;
}

function toVirtualPath(path, root) {
	if (!root || path.charAt(0) == '/') {
		return path.replace(/\\/g, "/");
	}

	return Path.relative(root, path).replace(/\\/g, "/");
}

function toPhysicalPath(path, root){
	if(!root){
		return Path.normalize(path);
	}

	if(path.charAt(0) == '/'){
		return Path.normalize(root + path);
	}

	return Path.resolve(root, path);
}

module.exports = Builder;