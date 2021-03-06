﻿
var Path = require('path'),
	Url = require('url'),
	IO = require('io'),
	UglifyJS = require('uglify-js'),
	extend = require('helpers').extend;
	
var basePath = __dirname;
var currentPath = basePath;
	
exports.BootCompiler = {

	_createContext: function() {
			
		/**
		 * Import a script, a style sheet or an html fragment.
		 */
		function include(modulePath, includeAstNode) {
			var url = include.toUrl(modulePath),
				extension = include.getExtension(url),
				ast;
			
			// Do not load twice.
			if(!include.isLoaded(url, extension)){
				
				// Mark as loaded.
				include.loaded.push(url);
				
				// Do load.
				ast = include.fileExtensions[extension](url, this) || new UglifyJS.AST_String({
					value: modulePath
				});
			} else {
				ast = new UglifyJS.AST_String({
					value: "skip: " +  modulePath
				});
			}
			
			ast.start = includeAstNode.start;
			ast.end = includeAstNode.end;
			
			return ast;
		}
		
		extend(include, {
		
			styles: [],
			
			/**
			 * An array to save loaded paths.
			 */
			loaded: [],
			
			/**
			 * The root path used by include. Default to the parent directory of boot.js.
			 */
			basePath: basePath,
			
			currentPath: currentPath,
		
			/**
			 * Get the actually url of specified module path.
			 */
			toUrl: function(modulePath) {
				
				// If modulePath starts with '~', replace '~' with current html path.
				// If modulePath is relative path. Concat modulePath with basePath.
				if(modulePath.charAt(0) === '~') {
					modulePath = modulePath.replace('~', include.currentPath);
				} else if(!/:\/\//.test(modulePath)) {
					modulePath = include.basePath + modulePath;
				}
				
				// Remove "/./" in path
				modulePath = modulePath.replace(/\/(\.\/)+/g, "/");
				
				// Resolve "/../" in path
				while(modulePath.indexOf('/../') >= 0) {
					modulePath = modulePath.replace(/\/[^\/]+\/\.\.\//, "/");
				}
				
				// Adding .js automaticly if no extension is found.
				if(!/\.[^\/]*$/.test(modulePath)){
					modulePath += ".js";
				}
				
				return modulePath;
			},
			
			/**
			 * Get the extension of specified url.
			 * @return {String} The extension that starts with a dot. If the actual 
			 * extension is not a member of include.fileExtensions, it returns ".html" 
			 * by default.
			 */
			getExtension: function(url) {
				var match = /\.\w+$/.exec(url);
				return match && (match[0] in include.fileExtensions) ? match[0] : ".html";
			},
			
			/**
			 * Check wheather the specified url has been loaded.
			 */
			isLoaded: function(url, extension){
				
				var tagName, attrName, nodes, i, nodeUrl;
				
				// IE6-7 does not support array.indexOf .
				for(i = 0; i < include.loaded.length; i++){
					if(include.loaded[i] == url) {
						return true;
					}
				}
				
				return false;
			},
		
			/**
			 * Get the content of the specified url synchronously.
			 */
			getText: function (url) {
				return IO.readFile(url, this.encoding);
			},
			
			/**
			 * All supported loaders for variant extensions.
			 */
			fileExtensions: {
				'.js': function (path, context) {
					
					var ast = exports.BootCompiler._buildJsAst(path, context);
					
					// If file exits.
					if (ast) {
							
						return ast;
							
					}
					
				},
				'.css': function(path, context) {
					
					if(context.include.styles.indexOf(path) === -1)
						context.include.styles.push(path);
						
				},
				'.html': function(path, context) {
					var sourceCode = include.getText(path);
					if(sourceCode) {
					
						return new UglifyJS.AST_Call({
							expression: new UglifyJS.AST_Dot({
								expression: new UglifyJS.AST_SymbolRef({
									name: "document"
								}),
								property: "write"
							}),
							args: [
								new UglifyJS.AST_String({
									value: sourceCode
								})
							]
						})
					}
				}
			}
		
		});

		/**
		 * Exculde a path so that the specified path would be skipped by include.
		 */
		function exclude(modulePath, includeAstNode) {
			include.loaded.push(include.toUrl(modulePath));
			
			return new UglifyJS.AST_String({
				start: includeAstNode.start,
				end: includeAstNode.end,
				value: "exculde: " + modulePath
			});
		}
		
		/**
		 * Exports a varName so that AMD loaders are able to load current file as a module.
		 */
		// function exports(varName, value) {
			// if(typeof define === "function" && define.amd){
				// define(varName, [], value);
			// }
		// }
		
		return {
		
			include: include,
			
			exclude: exclude,
			
			/**
			 * Exports a varName so that AMD loaders are able to load current file as a module.
			 */
			exports: function() {
			
			
			}
		
		};
		
	},
	
	_buildJsAst: function (path, context){
	
		var sourceCode = context.include.getText(path);
		
		// If file exits.
		if (sourceCode) {
							
			// Get the ast.
			var ast = UglifyJS.parse(sourceCode);
			
			var trans = new UglifyJS.TreeTransformer(function(node, descend) {
				if (node instanceof UglifyJS.AST_Call) {
					
					var funcName = node.start.value;
					
					if(funcName === 'include' && node.args[0] && node.args[0].value){
					
						// Process include("path");
						
						// Call context.include and return the ast object.
						return context.include(node.args[0].value, node);
					} else if(funcName === 'exclude' && node.args[0] && node.args[0].value){
					
						// Process include("path");
						
						// Call context.include and return the ast object.
						return context.exclude(node.args[0].value, node);
					} else if(context.options.removeTrace && funcName === "trace"){
					
					
					} else if(context.options.removeAssert && funcName === "assert"){
					
					
					}
				}
			});
			
			return ast.transform(trans);
		}
	},
	
	_buildHtmlFragment: function(path, context){
	
	
	},
	
	/**
	 * Parse the jsSourceCode and return the result ast object.
	 */
	buildJsAst: function(jsSourceCode, context){
	
		var ast = null;
	
	
		return ast;
	
	},
	
	/**
	 * Parse the htmlSourceCode and return the result dom object.
	 */
	buildHtmlDom: function(htmlSourceCode, context) {
	
	
	},
	
	/**
	 * Remove the include command in sourceCode.
	 */
	build: function(path, compileOptions, builder){
	
		var output = "";
	
		var context = exports.BootCompiler._createContext();
		
		context.builder = builder;
		context.encoding = compileOptions.fromEncoding;
			
		// Execute config.js before parse.
		if(compileOptions.configJs){
			
			if(typeof compileOptions.configJs === "function"){
				compileOptions.configJs(context);
			}
		
		}
		
		var ast = exports.BootCompiler._buildJsAst(path, context);
		
		if(ast){
			output = ast.print_to_string({
				'beautify': true,
				'comments': true
			});
		}
		
		return output;
	}
};

exports.compile = function (compileOptions, builder) {
	var sourceCode = exports.BootCompiler.build(compileOptions.fromPhysicalPath, compileOptions, builder);
	IO.writeFile(compileOptions.toPhysicalPath, sourceCode, builder.toEncoding);
};

