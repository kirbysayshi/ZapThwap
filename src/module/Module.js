(function(globalName){
	
var basePath = ''
	,myModuleName = '' // the name of THIS module
	,allMods = [] // allMods and allModNames are linked together by index num
	,allModNames = []
	,loadingMods = [] // mods that are marked as loading or loaded
	,givenModList = [] // the list given by the user of the deps that are about to load
	,onComplete = function(){} // the callback fired when all modules are loaded. this is technically unnecessary
	,depList = []; // the dependencies of THIS module

function module(name, parent){
	return new module.fn.init(name, parent);
}

module.fn = module.prototype = {
	init: function(name, parent){
		
		if(arguments.length == 0){
			return this;
		}
		
		if(typeof arguments[1] === 'function'){
			// assume arg0 to be array of all modules, unordered
			// assume arg1 to be onComplete callback
			givenModList = arguments[0];
			onComplete = arguments[1];
			return this;
		}
		
		if (typeof name === 'undefined') {
			throw 'No module name specified';
		}
		
		this.myModuleName = name;
		
		// define var in proper namespace
		if(typeof parent === 'undefined') { parent = window; }
		if(typeof parent[name] === 'undefined'){ parent[name] = {}; }
		
		console.log('created module definition: ' + name + ', attached to: ' + parent);
		return this;
	}
	,requires: function(){
		var depNames = []
			,code = function(){};

		if(typeof arguments[0] === 'function'){
			// first arg is a function
			code = arguments[0];
			console.log('no dependencies specified for module: ' + this.myModuleName);
		} else {
			// first arg is an array of dependencies
			depNames = arguments[0];
			code = arguments[1];
			console.log(depNames, ' added to dependency list');
		}
		depList = depList.concat(depNames);
		allMods.push(code);
		allModNames.push(this.myModuleName);
		
		console.log(this.myModuleName + ' added to module list', allMods.length, allModNames.length);
		
		// loop through shared dependency list
		// if entry is not in allModNames, it hasn't been loaded yet
		for(var i = 0; i < depList.length; i++){
			var depName = depList[i];
			if(allModNames.indexOf(depName) === -1 && loadingMods.indexOf(depName) === -1){
				
				console.log('triggering load of ' + depName + ' module');
				
				// mark that this module is loading or has loaded
				loadingMods.push(depName);
				
				var sTag = document.createElement('script');
				sTag.type = 'text/javascript';
				sTag.onload = function(){
					console.log("script loaded: " + basePath + depName + '.js');
					//loadingMods[loadingMods.indexOf(depName)] = undefined;
					console.log('allModNames', allModNames);
					console.log('allMods count', allMods.length);
					checkForReady();
				}
				
				sTag.src = basePath + depName + '.js';
				document.body.appendChild(sTag);
			}
		}
	}
};

//---------------------------------------------------------------------
// Static Methods
//---------------------------------------------------------------------

module.setBasePath = function(base){
	basePath = base;
	console.log('basePath set to: ' + base);
}

//---------------------------------------------------------------------
// Private Methods
//---------------------------------------------------------------------

function checkForReady(){
	if( givenModList.length == allModNames.length ){
		console.log('fire ready');
		
		// go backwards through the mod list and execute
		for(var i = allMods.length-1; i >= 0; i--){
			allMods[i]();
		}
		onComplete();
	}
}

module.fn.init.prototype = module.fn;
return (window[globalName] = module);
})("module");
