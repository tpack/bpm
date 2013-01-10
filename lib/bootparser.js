
var Path = require('path'),
	Url = require('url'),
	IO = require('io'),
	UglifyJS = require('uglify-js'),
	HtmlParser = require('htmlparser2'),
	Helpers = require('helpers');

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

// Parsers API

/**
 * Remove the include command in sourceCode.
 */
exports.build = function(context){

	function include(modulePath) {
		var url = include.toUrl(modulePath),
			extension = include.getExtension(url);
		
		// Do not load twice.
		if(!include.isLoaded(url, extension)){
		
			include.included.push(modulePath);
			
			// Mark as loaded.
			include.loaded.push(url);
			
			var context = this;
			var sourceCode = include.getText(url, context.fromEncoding);
			
			// No sourceCode or file not exists, nothing parsed.
			if(sourceCode){
			
				var refList = context.refs[extension] || (context.refs[extension] = []);
			
				refList.push(url);
				
				// Do load.
				include.fileExtensions[extension](url, sourceCode, context);
				
			}
		}
	}
	
	Helpers.extendIf(context, {
	
		basePath: "",
	
		path: 'index',
		
		outputs: {},
		
		refs: {},
		
		lineBreak: "\r\n",
		
		addGlobalComment: true,
		
		addModulePath: true,
		
		/**
		 * Callback that recieves any output.
		 */
		print: function (type, content, path){
			var outputs = this.outputs[type] || (this.outputs[type] = []);
			outputs.push(content);
		},
		
		copyFile: function (fromUrl, fromFileRelated, toDirectory, toFileRelated){
		
			var fromPath = Path.resolve(Path.dirname(fromFileRelated), fromUrl);
			var toPath;
			
			if(toDirectory){
				if(this.autoDetectImagePath !== false){
					var t = fromPath
						.replace(/\\/g, "/")
						.replace("/assets/", "/")
						.replace("/resources/", "/")
						.replace("/images/", "/")
						.replace("/img/", "/")
						.replace("/imgs/", "/");
						
					t = Path.relative(context.basePath, t);
						
					toDirectory = Path.resolve(toDirectory, Path.basename(Path.dirname(t)));
				}
				toPath = Path.resolve(toDirectory, Path.basename(fromPath));
				
				IO.copyFile(fromPath, toPath);
			} else {
				toPath = fromPath;
			}
			
			return Path.relative(Path.dirname(toFileRelated), toPath).replace(/\\/g, "/");
		},
			
		/**
		 * Callback that all parses are finished.
		 */
		end: null,
	
		/**
		 * Import a script, a style sheet or an html fragment.
		 */
		include: include,
		
		/**
		 * Exculde a path so that the specified path would be skipped by include.
		 */
		exclude: function exclude(modulePath, includeAstNode) {
			include.loaded.push(include.toUrl(modulePath));
		},
		
		/**
		 * Exports a varName so that AMD loaders are able to load current file as a module.
		 */
		exports: function(varName, value) {
		
		
		},
				
		/**
		 * Parse the htmlSourceCode and return the outputs.
		 */
		htmlPrinters: [
		
			// css
			function (outputs) {
				if(outputs.css){
				
					// All css code should be wrapped with <style>.
					outputs.css.unshift('<style type="text/css">');
					outputs.css.push('</style>');
					return outputs.css;
				}
			},
		
			// html
			function (outputs){
				return outputs.html;
			},
		
			// js
			function (outputs, context){
				if(outputs.js){
					for(var i = 0; i < outputs.js.length; i++ ){
						var t = outputs.js[i];
						if(typeof t !== "string") {
							outputs.js[i] = printAstToString(t, context);
						}
					}
					outputs.js.unshift(context.scriptStart || "<script type=\"text/javascript\">");
					outputs.js.push(context.scriptEnd || "</script>");
					return outputs.js;
				}
			}
		],
			
		/**
		 * Parse the htmlSourceCode and return the outputs dom object.
		 */
		jsPrinters: [
		
			// css & html
			function (outputs) {
				
				var r = [];
			
				if(outputs.css && outputs.css.length){
				
					// All css code should be wrapped with <style>.
					r.push('document.write(', toJsString('<style type="text/css">' + outputs.css.join('') + '</style>', ');'));
				}
			
				if(outputs.html && outputs.html.length){
				
					// All html code should be wrapped with document.write.
					r.push('document.write(', toJsString(outputs.html.join('')), ');');
				}
				
				return r;
			},
		
			// js
			function (outputs, context){
				if(outputs.js){
					for(var i = 0; i < outputs.js.length; i++ ){
						var t = outputs.js[i];
						if(typeof t !== "string") {
							outputs.js[i] = printAstToString(t, context);
						}
					}
					return outputs.js;
				}
			}
		]
		
	
	});
	
	Helpers.extend(context.include, {
	
		included: [],
		
		/**
		 * An array to save loaded paths.
		 */
		loaded: [],
		
		/**
		 * The root path used by include. Default to the parent directory of boot.js.The path should not be end with "/".
		 */
		basePath: context.basePath,
		
		/**
		 * The current path used by include. Default to the directory of current page.The path should not be end with "/".
		 */
		currentPath: context.basePath,
	
		/**
		 * Get the actually url of specified module path.
		 */
		toUrl: function(modulePath) {
			
			// If modulePath starts with '~', replace '~' with current html path.
			// If modulePath is relative path. Concat modulePath with basePath.
			if(modulePath.substr(0, 2) === '~/') {
				modulePath = modulePath.replace('~/', include.currentPath + "/");
			} else if(!/:\/\//.test(modulePath)) {
				modulePath = context.include.basePath + "/" + modulePath;
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
			'.js': function (path, sourceCode, context){
			
				if(context.addModulePath !== false){
					context.print("js", context.lineBreak);
					context.print("js", "/*********************************************************");
					context.print("js", context.lineBreak);
					context.print("js", " * ");
					context.print("js", Path.relative(context.basePath, path).replace(/\\/g, "/"));
					context.print("js", context.lineBreak);
					context.print("js", " ********************************************************/");
					context.print("js", context.lineBreak);
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
						} else if(context.removeTrace && funcName === "trace"){
						
						
						} else if(context.removeAssert && funcName === "assert"){
						
						
						}
					}
				});
				
				ast = ast.transform(trans);
				
				// Output the ast.
				context.print('js', ast, path);
				
				return ast;
		
			},
			
			'.html': function (path, sourceCode, context){
				
				// Process inline scripts.
				sourceCode = sourceCode.replace(/(<script[^>]*>)([\s\S]+?)(<\/script>)/ig, function (_, start, body, end){
				
					// <script src>
					if(/(\bsrc\s*=\s*)(['"]?)[^'"]*?\2/.test(start)) {
				
					} else {
					
						// Continue to parse inline scripts.
						
						var newContext = Helpers.extend({ }, context);
						
						newContext.scriptStart = start;
						newContext.scriptEnd = end;
						newContext.currentPath = Path.dirname(path);
						newContext.outputs = {};
						newContext.addModulePath = false;
						
						newContext.include.fileExtensions[".js"]("", body, newContext);
						
						return concatOutputs(newContext, newContext.htmlPrinters).join('');
					}
					
					return _;
				
				});
				
				context.print('html', sourceCode, path);
				
				return sourceCode;
		
			},
			
			'.css': function(path, sourceCode, context) {
			
				if(context.addModulePath !== false){
					context.print("css", context.lineBreak);
					context.print("css", "/*********************************************************");
					context.print("css", context.lineBreak);
					context.print("css", " * ");
					context.print("css", Path.relative(context.basePath, path).replace(/\\/g, "/"));
					context.print("css", context.lineBreak);
					context.print("css", " ********************************************************/");
					context.print("css", context.lineBreak);
				}
				
				// resolve css @import.
				if(context.resolveCssImport !== false){
					sourceCode = sourceCode.replace(/@import\s+url\s*\((['"]?)([^'"]*)\1\)/ig, function (_, q, url){
					
						// Do not process absolute path
						if (url.indexOf(':') >= 0)
							return _;
						
						var newContext = Helpers.extend({ }, context);
						
						newContext.outputs = {css:[]};
						
						var newUrl = Path.relative(context.basePath, Path.resolve(Path.dirname(path), url)).replace(/\\/g, "/");
						
						newContext.include(newUrl);
						
						return newContext.outputs.css.join('');
					});
				}
				
				// resolve images.
				if(context.resolveCssImages !== false){
					sourceCode = sourceCode.replace(/(url\s*\((['""]?))(.*)(\2\))/ig, function (_, left, q, url, right){
					
						// Do not process absolute path
						if (url.indexOf(':') >= 0)
							return _;
							
						var newUrl = context.copyFile(url, path, context.images, context.css || context.js);
						
						if(newUrl){
							return left + newUrl + right;
						}
						
						return _;
					});
				}
			
				context.print('css', sourceCode, path);
				
				return sourceCode;
				
			}
		}
	
	});

	if(context.init){
		context.init();
	}
	
	// If output is specified, try to guess the meaning of output from path.
	if(context.output){
		switch(context.include.getExtension(context.path)){
			case '.js':
				context.js = context.output;
				break;
			case '.css':
				context.css = context.output;
				break;
			case '.html':
				context.html = context.output;
				break;
		}
	}
	
	if(typeof context.images === "string") {
		context.images = toFullPath(context.images, context);
	}
	
	if(typeof context.js === "string") {
		context.js = toFullPath(context.js, context);
	}
	
	if(typeof context.css === "string") {
		context.css = toFullPath(context.css, context);
	}
	
	if(typeof context.html === "string") {
		context.html = toFullPath(context.html, context);
	}
	
	if(context.js){
		
		// If js only. Combime all output in one file.
		if(!context.css){
			
			context.flush = function (){
				
				// Print all contents in one.
				flushAllOutputs(this, context.js, 'outputJs', concatOutputs(this, this.jsPrinters));
			};
			
		} else {
			context.flush = function (){
			
				// Print all contents in one.
				flushAllOutputs(this, context.css, 'outputCss', this.outputs.css);
				
				this.outputs.css = null;
				
				// Print all contents in one.
				flushAllOutputs(this, context.js, 'outputJs', concatOutputs(this, this.jsPrinters));
			};
		}
		
	} else if (context.css){
		context.flush = function (){
		
			// Print all contents in one.
			flushAllOutputs(this, context.js, 'outputCss', this.outputs.css);
			
		};
	}
	
	if(context.html){
		
		if(context.html === true){
			context.flush = function (){
				this.outputHtml = this.outputs.html ? this.outputs.html.join('') : '';
			};
		} else {
			context.flush = function (){
				flushAllOutput(this, 'html');
			};
		}
	
	}
	
	// Parse file using include.
	context.include(context.path);
	
	if(context.flush)
		context.flush();
	
	if(context.end)
		context.end();
	
	return context;
	
};

// Utils

function printAstToString(ast, context){
	return ast.print_to_string(context.jsOptions);
}

function concatOutputs(context, printers){
	var r = [];
	
	for(var i = 0, t; i < printers.length; i++){
		t = printers[i](context.outputs, context);
		if(t){
			r.push.apply(r, t);
		}
	}
	
	return r;
}

function flushAllOutputs (context, path, variable, outputs){

	outputs = outputs || [];
	
	var t = [];

	if(context.addGlobalComment !== false){
		t.push("/*********************************************************");
		t.push(context.lineBreak);
		t.push(" * ");
		var d = new Date();
		t.push("This file is created by a tool at " + [d.getFullYear(), '/', d.getMonth() + 1, '/', d.getDate(), ' ', d.getHours(), ':', d.getMinutes()].join(''));
		t.push(context.lineBreak);
		t.push(" ********************************************************/");
		t.push(context.lineBreak);
	}

	if(variable === 'outputJs' && context.prependExclude !== false){
		t.push('if(typeof exclude === "function") {');
		for(var i = 0; i < context.include.included.length; i++){
			t.push(context.lineBreak, '	exclude(', toJsString(context.include.included[i]) + ');');
		}
		t.push(context.lineBreak, '}', context.lineBreak, context.lineBreak);
	}
	
	outputs = t.concat(outputs);

	if(path === true){
		context[variable] = outputs.join('');
		return;
	}

	var writeStream = IO.openWrite(path, { flags: 'w',
		encoding: context.toEncoding,
		mode: 0666 });

	for(var i = 0; i < outputs.length; i++){
		writeStream.write(outputs[i]);
	}
	
	writeStream.end();
}

function toFullPath(path, context){
	return Path.resolve(context.basePath, path);
}

function toJsString(str) {
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
