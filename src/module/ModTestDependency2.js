module('ModTestDependency2').requires(['ModTestDependency3'], function(){

ModTestDependency2.someDep = function(){
	console.log('someDep!');
}

console.log("ModTestDependency2 is loaded");
	
});

