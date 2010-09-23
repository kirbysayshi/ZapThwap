module('ModTestDependency3').requires(['ModTestDependency', 'ModTest'], function(){

ModTestDependency3.someDep = function(){
	console.log('someDep!');
}

console.log("ModTestDependency3 is loaded");
	
});

