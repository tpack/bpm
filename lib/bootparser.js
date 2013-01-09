
var Path = require('path'),
	Url = require('url'),
	IO = require('io'),
	UglifyJS = require('uglify-js'),
	HtmlParser = require('htmlparser2'),
	extend = require('helpers').extend;

// A small hack for UglifyJS to remove node.
	
function NoneStatement(){
	
}

NoneStatement.prototype = new UglifyJS.AST_SimpleStatement;

NoneStatement.prototype.print = function(self, output){
	if(!self._semicolon) {
		self._semicolon = self.semicolon;
		self.semicolon = function(){
			this.semicolon = this._semicolon;
			delete this._semicolon;
		};
	}
};

// Context

exports._createContext = function() {
		
	/**
	 * Import a script, a style sheet or an html fragment.
	 */
	function include(modulePath) {
		var url = include.toUrl(modulePath),
			extension = include.getExtension(url);
		
		// Do not load twice.
		if(!include.isLoaded(url, extension)){
			
			// Mark as loaded.
			include.loaded.push(url);
			
			// Do load.
			include.fileExtensions[extension](url, this);
		}
	}
	
	extend(include, {
		
		/**
		 * An array to save loaded paths.
		 */
		loaded: [],
		
		/**
		 * The root path used by include. Default to the parent directory of boot.js.The path should not be end with "/".
		 */
		basePath: exports.basePath,
		
		/**
		 * The current path used by include. Default to the directory of current page.The path should not be end with "/".
		 */
		currentPath: exports.currentPath,
	
		/**
		 * Get the actually url of specified module path.
		 */
		toUrl: function(modulePath) {
			
			// If modulePath starts with '~', replace '~' with current html path.
			// If modulePath is relative path. Concat modulePath with basePath.
			if(modulePath.substr(0, 2) === '~/') {
				modulePath = modulePath.replace('~/', include.currentPath + "/");
			} else if(!/:\/\//.test(modulePath)) {
				modulePath = include.basePath + "/" + modulePath;
			}
			
			if(!Path.extname(modulePath)){
				modulePath += ".js";
			}
			
			return Path.normalize(modulePath);
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
		getText: function (url, encoding) {
			return IO.readFile(url, encoding);
		},
		
		/**
		 * All supported loaders for variant extensions.
		 */
		fileExtensions: {
			'.js': function (path, context) {
			
				context.addRef('.js', path);
				
				// Continue to parse for included file.
				exports._parseJsAstFromPath(path, context);
				
			},
			'.css': function(path, context) {
			
				context.addRef('.css', path);
					
				// Continue to parse for included file.
				exports._parseCssFromPath(path, context);
				
			},
			'.html': function(path, context) {
			
				context.addRef('.html', path);
				
				// Continue to parse for included file.
				exports._parseHtmlDomFromPath(path, context);
				
			},
			'.txt': function(path, context){
			
			}
		}
	
	});

	/**
	 * Exculde a path so that the specified path would be skipped by include.
	 */
	function exclude(modulePath, includeAstNode) {
		include.loaded.push(include.toUrl(modulePath));
	}
	
	return {
	
		asts: {},
	
		htmlSources: {},
	
		cssSources: {},
		
		options: {},
		
		/**
		 * save a ref of current file to context.
		 */
		addRef: function(type, path){
			var refList = this[type] || (this[type] = []);
		
			if(refList.indexOf(path) === -1){
				refList.push(path);
			}
		},
		
		getRefs: function(type){
			return this[type];
		},
	
		include: include,
		
		exclude: exclude,
		
		/**
		 * Exports a varName so that AMD loaders are able to load current file as a module.
		 */
		exports: function(varName, value) {
		
		
		}
	
	};
	
};

// Parsers Core

/**
 * Parse the jsSourceCode and return the result ast object.
 */
exports._parseJsAstFromPath = function (path, context){
	return context.asts[path] = exports._parseJsAstFromSourceCode(context.include.getText(path, context.options.fromEncoding), context);
};

exports._parseJsAstFromSourceCode = function (sourceCode, context) {
	
	// No sourceCode, nothing parsed.
	if(!sourceCode){
		return;
	}
		
	// Get the ast.
	var ast = UglifyJS.parse(sourceCode);
	
	var trans = new UglifyJS.TreeTransformer(function(node, descend) {
		if (node instanceof UglifyJS.AST_Call) {
			
			var funcName = node.start.value;
			
			if(funcName === 'include' && node.args[0] && node.args[0].value){
			
				// Process include("path");
				
				// Call context.include and return the ast object.
				context.include(node.args[0].value, node);
				
				return new NoneStatement();
				
			} else if(funcName === 'exclude' && node.args[0] && node.args[0].value){
			
				// Process include("path");
				
				// Call context.include and return the ast object.
				context.exclude(node.args[0].value, node);
				
				return new NoneStatement();
			} else if(context.options.removeTrace && funcName === "trace"){
			
			
			} else if(context.options.removeAssert && funcName === "assert"){
			
			
			}
		}
	});
	
	return ast.transform(trans);

};

/**
 * Parse the htmlSourceCode and return the result dom object.
 */
exports._parseHtmlFromSourceCode = function (sourceCode, context){
	
	// No sourceCode, nothing parsed.
	if(!sourceCode){
		return;
	}

	// Process inline scripts.
	sourceCode = sourceCode.replace(/(<script[^>]*>)([\s\S]+?)(<\/script>)/ig, function (_, start, body, end){
	
		// <script src>
		if(/(\bsrc\s*=\s*)(['"]?)[^'"]*?\2/.test(start)) {
	
		} else {
		
			var newContext = extend({}, context);
			
			newContext.styles = [];
		
			var ast = exports._parseJsAstFromSourceCode(body, context);
			
			body = ast.print_to_string(context.options);
			
			if(!body.trim()){
				return "";
			}
			
			return start + body + end;
		}
		
		return _;
	
	});
	
	console.log(sourceCode);
};

exports.htmlPrinters = [
	
	// css
	function(context, html){
		
	},
	
	// html
	function(context, html){
		
	},
	
	// js
	function(context, html){
		
	}

];

exports._parseHtmlDomFromPath = function (path, context){
	return context.htmlSources[path] = exports._parseJsHtmlDomFromSourceCode(context.include.getText(path, context.options.fromEncoding), context);
};

exports._parseCssFromSourceCode = function (sourceCode, context){
	
	// No sourceCode, nothing parsed.
	if(!sourceCode){
		return;
	}
		
};

exports._parseCssFromPath = function (path, context){
	return context.cssSources[path] = exports._parseCssFromSourceCode(context.include.getText(path, context.options.fromEncoding), context);
};

// Parsers API

exports.parseJs = function(srcPath, initContextCallback){
	
	var context = exports._createContext();
	
	context.source = toFullPath(srcPath);

	if(initContextCallback)
		initContextCallback(context);
		
	context.ast = exports._parseJsAstFromPath(context.source, context);
	
	return context;
	
};

// Printers Core

exports._printJs = function(jsParseResult, context){
	
	// parseResult.ast;
	// parseResult.fragments;
	// parseResult.styles;
	// parseResult.scripts;
	// parseResult.context;
	
	var ast = context.ast;
	
	// DEBUG
	context.options.beautify = true;
	context.options.comments = true;
	
	var sourceCode = ast.print_to_string(context.options);
	
	context.target.printJs(sourceCode);

};	
	
// Printers API

exports.print = function(parseResult, initContextCallback) {
	
	var context = parseResult.context;
	var target = context.target = {};

	if(initContextCallback)
		initContextCallback(context);
	
	if(!target.printJs){
		
		if(target.js) {
			target._jsWriteStream = target.createWriteStream(toFullPath(target.js), { flags: 'w',
				encoding: context.options.toEncoding,
				mode: 0666 });
			
			target.printJs = function(content) {
				target._jsWriteStream.write(content);
			};
			
			target.endPrintJs = function(){
				target._jsWriteStream.end();
			};
		} else {
			target._jsOutputCache = [];
		
			target.printJs = function(content) {
				target._jsOutputCache.push(content);
			};
			
			target.endPrintJs = function(){
				return target._jsOutputCache.join('');
			};
		}
		
	}

	if(!target.printCss){
		
		if(target.css) {
			
			target._cssWriteStream = target.createWriteStream(Path.resolve(context.basePath, target.css), { flags: 'w',
				encoding: context.options.toEncoding,
				mode: 0666 });
			
			target.printCss = function(content) {
				target._cssWriteStream.write(content);
			};
			
			target.endPrintCss = function(){
				target._cssWriteStream.end();
			};
		
		} else {
		
			// For redirecting path of images.
			target.css = target.js;
			target._cssOutputCache = [];
			
			target.printCss = function(content) {
				target._cssOutputCache.push(content);
			};
			
			target.endPrintCss = function(content) {
				target.printJs("document.write(\"<style type=\\\"text/css\\\">");
				target.printJs(make_string(content));
				target.printJs("</style>\");");
			};
			
		}
	
	}

	if(!target.copyImages){
	
		if(target.images) {
			target.copyImages = function(path, cssFileRelated) {
				var oldPath = Path.resolve(cssFileRelated, path);
				
			};
		}
		
	
	}

};

// Utils

exports.basePath = ".";

function toFullPath(path){
	return Path.resolve(exports.basePath, path);
}

function make_string(str) {
	var dq = 0, sq = 0;
	str = str.replace(/[\\\b\f\n\r\t\x22\x27\u2028\u2029\0]/g, function(s){
		switch (s) {
		  case "\\": return "\\\\";
		  case "\b": return "\\b";
		  case "\f": return "\\f";
		  case "\n": return "\\n";
		  case "\r": return "\\r";
		  case "\u2028": return "\\u2028";
		  case "\u2029": return "\\u2029";
		  case '"': ++dq; return '"';
		  case "'": ++sq; return "'";
		  case "\0": return "\\0";
		}
		return s;
	});
	if (dq > sq) return "'" + str.replace(/\x27/g, "\\'") + "'";
	else return '"' + str.replace(/\x22/g, '\\"') + '"';
};
	
/**
	 * Remove the include command in sourceCode.
	 */
	function build(path, compileOptions, builder){
	
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