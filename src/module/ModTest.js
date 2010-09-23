module('ModTest').requires(['ModTestDependency', 'ModTestDependency2'], function(){
	
ModTest.awesomeFunction = function(){
	console.log('awesome function was called');
}

console.log('ModTest is executed');

});