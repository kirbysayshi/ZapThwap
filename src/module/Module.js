(function(globalName){

	var loaded = []
		,all = []
		,base = ''
		//,callbacks = {} // keyed by module name
		,finalCountdown = function(){}

	function module(name, parent){
		return new module.fn.init(name, parent);
	};

	module.fn = module.prototype = {
		init: function(name, parent){

			if(typeof arguments[0] === 'function'){
				finalCountdown = arguments[0];
				return this;
			}

			// define var
			if(typeof name !== 'undefined' && typeof parent !== 'undefined') {	
				if(typeof parent[name] === 'undefined'){
					parent[name] = {};
				}		
			} else if (typeof name === 'undefined' && typeof parent === 'undefined') {
				return this;
			} else {
				window[name] = {};
			}
			all.push(name);

			this.modName = name;
			this.modParent = parent;

			return this;
		},
		requires: function(/*modNames, code*/){

			var modNames = []
				,code = function(){}
				,depsLoadedTests = [];
			
			if(loaded.indexOf(this.modName) == -1){
				loaded.push(this.modName);
			}	
				
			if(typeof arguments[0] === 'function'){
				// first arg is a function
				code = arguments[0];
			} else {
				// first arg is an array of dependencies
				modNames = arguments[0];
				code = arguments[1];
			}

			for(var i = 0; i < modNames.length; i++){

				var name = modNames[i]
					,self = this;

				if(loaded.indexOf(name) == -1){
					// write script tag and load
					var sTag = document.createElement('script');
					sTag.type = 'text/javascript';
					sTag.onload = function(){
						console.log(arguments);
						if(loaded.indexOf(self.modName) == -1){
							loaded.push(self.modName);
						}
						var tests = [];
						for(var i = 0; i < modNames.length; i++){
							for(var j = 0; j < loaded.length; j++){
								if(loaded[j] == modNames[i]){
									tests.push(true);
								}
							}
						}
						if(tests.length == modNames.length){
							code();
							testForReady();
						}
					}
					sTag.src = base + name + '.js';
					document.body.appendChild(sTag);
				} else {
					depsLoadedTests.push(true);
				}
			}
			if(depsLoadedTests.length == modNames.length){
				code();
				//testForReady();
			}
		},
		setBasePath: function(basePath){
			base = basePath;
		}
	}
	
	function testForReady(){
		if(loaded.length == all.length){
			finalCountdown();
			return true;
		} else {
			return false;
		}
	}
	
	module.fn.init.prototype = module.fn;
	return (window[globalName] = module);
})("module");
