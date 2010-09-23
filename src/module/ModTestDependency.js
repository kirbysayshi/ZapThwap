module('ModTestDependency').requires(function(){

ModTestDependency.someDep = function(){
	console.log('someDep!');
}

console.log("ModTestDependency is loaded");
	
});

