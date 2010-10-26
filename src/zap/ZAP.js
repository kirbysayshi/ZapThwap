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
		,timeOutRef = 0
		,running = false
		,tCommands = function(){} // time-dependent callback
		,nCommands = function(){}; // non-time-dependent callback
	
	self.accuracy = function(tDT){
		var  targetDT = tDT || 5 // ms
			,remainingDT = 0
		 	,totalIterations = 0
			,iterations = 0
			,lastTime = +new Date();

		function run(){
			var iStartTime = +new Date()
				,delta = iStartTime - lastTime
				,i = 0;
			remainingDT = iterations = (delta/targetDT) + remainingDT;
			iterations = ~~iterations;
			remainingDT = remainingDT - iterations;

			for(; i < iterations; i++){ tCommands(targetDT); }

			var iEndTime = +new Date()
				,thisRunDT = iEndTime - iStartTime
				,hopefulDT = targetDT*iterations;

			// cleanup
			lastTime = iStartTime;
			totalIterations += iterations;

			nCommands(
				delta
				,(1000 / thisRunDT).toFixed(2)
				,((iEndTime - startTime) / totalIterations).toFixed(2)
				,thisRunDT - hopefulDT
				,iterations
			);

			if(thisRunDT > hopefulDT * 4){
				// auto stop to prevent inifinte looping?
				console.log('DANGER, RUN TIME > 4 * EXPECTED TIME', 'RUNTIME: ' + thisRunDT, 'EXPECTED: ' + hopefulDT);
				self.stop();
			} else {

			}
			if(running === true) timeOutRef = setTimeout(self.main, targetInterval);
		}
		
		return run;
	}
		
	self.syncronicity = function(){
		var  avgFps = 0
			,currentFps = 0
			,startTime = +new Date()
			,lastTime = +new Date()
			,frames = 0
			,framesDrawn = 0
			,maxFrameSkip = 5
			,lastFrameCount = 0
			,lag = 0;
		
		function run(){
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
		return run;
	}
	
	self.main = self.syncronicity();
			
	self.setMode = function(mode, tDT){
		switch(mode){
			case 'accuracy':
				self.main = self.accuracy(tDT);
				break;
			case 'syncronicity':
				self.main = self.syncronicity();
				break;
		}
		return self;
	}
	self.register = function(timeDependent, normal){
		tCommands = timeDependent !== undefined ? timeDependent : tCommands;
		nCommands = normal !== undefined ? normal : nCommands;
		return self;
	}
	self.start = function(){ 
		startTime = +new Date();
		running = true; self.main(); 
		console.log("beginning execution"); 
		return self;
	}
	self.stop = function(){ 
		clearTimeout(timeOutRef); running = false;
		console.log("execution halted"); 
		return self;
	}
	self.setFPS = function(fps){
		targetFPS = fps;
		return self;
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

ZAP.Scroller = (function(){
	
	var self = {}
		,bounds = vec3.create()
		,bound = false
		,viewPort = vec3.create()
		,halfPort = vec3.create();
	
	self.set = function(viewport, world){
		viewPort = vec3.create(viewport);
		halfPort = vec3.scale(viewPort, 0.5, halfPort);
		if(world){
			bounds = vec3.create(world);
			bound = true;
		} else {
			bound = false;
		}
	}
	
	//						  		  6
	//				  -9		0	  ?		12
	//	_______________________________________________________
	//	|			   _____	|			|		_____		|
	//	|			   |---|	|	  x		|		|---|		|
	//	0			   14		?	  29,2          43	
	//							23
	
	//	worldoff = focusWPos - focusVPos
	//	worldOff = focusWPos - viewport/2
	//				   viewport/2 = scrollfocusregion
	//	drawwOff = focusWPos - worldOff
	//	someObj = objPos - worldOff
	
	self.getOffset = function(focusPos){
		
		var worldOff = vec3.subtract(focusPos, halfPort, vec3.create());
		
		worldOff[0] *= -1;
		worldOff[1] *= -1;
		
		//if(focusPos[0] < 0) worldOff[0] -= focusPos[0];
		//if(focusPos[1] < 0) worldOff[1] -= focusPos[1];
		
		if(bound === true){
			worldOff[0] = worldOff[0] > 0 ? Math.max(worldOff[0], bounds[0]) : Math.max(worldOff[0], 0);
			worldOff[1] = worldOff[1] > 0 ? Math.max(worldOff[1], bounds[1]) : Math.max(worldOff[1], 0);
			worldOff[2] = worldOff[2] > 0 ? Math.max(worldOff[2], bounds[2]) : Math.max(worldOff[2], 0);
		}
		
		return worldOff;
	}

	return self;
	
})();

window.ZAP = ZAP;

})();