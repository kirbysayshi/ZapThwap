(function(){

var ZAP = {};
ZAP.EPSILON = 0.001;

//---------------------------------------------------------------------
// Basic Prototypical Inheritance
//---------------------------------------------------------------------
ZAP.inherits = function(child, parent) {
	function F(){};
	F.prototype = parent.prototype;
	//child.superClass_ = parent.prototype;
	child.prototype = new F();
	child.prototype.constructor = child;
};

//---------------------------------------------------------------------
// Constant Game Loop Machine
//---------------------------------------------------------------------
ZAP.CGLM = (function(){
	var self = {}
		,targetFPS = 60
		,targetInterval = 1000 / targetFPS
		,avgFps = 0
		,currentFps = 0
		,startTime = +new Date()
		,lastTime = +new Date()
		,frames = 0
		,framesDrawn = 0
		,maxFrameSkip = 5
		,lastFrameCount = 0
		,lag = 0
		,timeOutRef = 0
		,running = false
		,tCommands = function(){} // time-dependent callback
		,nCommands = function(){}; // non-time-dependent callback
		
	self.main = function(){
		var d = +new Date()
			,currentFrameCount = Math.round( (d - startTime) / 1000 * targetFPS )
			,deltaFrames = currentFrameCount - lastFrameCount
			,deltaTimePerFrame = (d - lastTime) / deltaFrames
			,i = 0;
		
		if(deltaFrames > 0){
			// calculate lag, fps, and avg fps
			lag = Math.round(10 * frames / framesDrawn - 10) / 10;
			avgFps = (1000 / ((d - startTime) / framesDrawn)).toFixed(2);
			currentFps = (1000 / ((d - lastTime) / deltaFrames)).toFixed(2);
					
			// main time-dependent game commands here, like physics
			for(; i < deltaFrames && i < maxFrameSkip; i++){ tCommands(deltaTimePerFrame); }
			
			// non-time dependent commands here, like drawing
			nCommands(d - lastTime, currentFps, avgFps, lag);
			
			// save current date as last date for next round
			lastTime = d;
			// cleanup
			frames += deltaFrames;
			framesDrawn++;
			lastFrameCount = currentFrameCount;
		}
		if(running === true) timeOutRef = setTimeout(self.main, targetInterval);
	}
	self.register = function(timeDependent, normal){
		tCommands = timeDependent !== undefined ? timeDependent : tCommands;
		nCommands = normal !== undefined ? normal : nCommands;
	}
	self.start = function(){ 
		running = true; self.main(); 
		console.log("beginning execution"); 
	}
	self.stop = function(){ 
		clearTimeout(timeOutRef); running = false;
		console.log("execution halted"); 
	}
	self.setFPS = function(fps){
		targetFPS = fps;
		targetInterval = 1000 / targetFPS;
	}
	
	return self;
})();

//---------------------------------------------------------------------
// Basic DOM manipulation
//---------------------------------------------------------------------
ZAP.DOM = {
	CE: function(nodeType, css){
		var n = document.createElement(nodeType);
		for(var p in css){
			n.style[p] = css[p];
		}
		return n;
	}
	,css: function(node, css){
		for(var p in css){
			node.style[p] = css[p];
		}
		return node;
	}
}

window.ZAP = ZAP;

})();