(function(){

if(typeof(console) === 'undefined'){ 
	console = { log: function(){} } 
}

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
		,startTime = 0
		,running = false
		,tCommands = function(){} // time-dependent callback
		,nCommands = function(){}; // non-time-dependent callback
	
	self.basic = function(tDT){
		var counter = 0
			,totalRuns = 0
			,checkInterval = 20
			,currentFPS = 0
			,lastCheckTime = 0
			,lastCheckDelta = 0;
		
		function run(){
			counter++;
			totalRuns++;
			
			var now = +new Date();
			if(counter === checkInterval){
				lastCheckDelta = now - lastCheckTime;
				currentFPS = lastCheckDelta / checkInterval;
				lastCheckTime = now;
			}
			
			tCommands(tDT);
			nCommands(
				tDT
				,currentFPS.toFixed(2)
				,((now - lastCheckTime) / totalRuns).toFixed(2)
				,targetInterval - lastCheckDelta
				,1
			);
			
			if(counter > checkInterval) counter = 0;
		}
		
		return run;
	}
	
	self.accuracy = function(tDT){
		var  targetDT = tDT || 5 // ms
			,remainingIT = 0
		 	,totalIterations = 0
			,iterations = 0
			,lastTime = +new Date();

		function run(){
			var iStartTime = +new Date()
				,delta = iStartTime - lastTime
				,i = 0;
			remainingIT = iterations = (delta/targetDT) + remainingIT;
			iterations = ~~iterations;
			remainingIT = remainingIT - iterations;

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

			if(thisRunDT > hopefulDT * 10 && hopefulDT !== 0){
				// auto stop to prevent inifinte looping?
				console.log('DANGER, RUN TIME > 10 * EXPECTED TIME', 'RUNTIME: ' + thisRunDT, 'EXPECTED: ' + hopefulDT);
				self.stop();
			} else {

			}
			//if(running === false) timeOutRef = setInterval(self.main, targetInterval);
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
				nCommands(d - lastTime, currentFps, avgFps, lag, deltaFrames);
				
				// save current date as last date for next round
				lastTime = d;
				// cleanup
				frames += deltaFrames;
				framesDrawn++;
				lastFrameCount = currentFrameCount;
			}
			//if(running === false) timeOutRef = setInterval(self.main, targetInterval);
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
			case 'basic':
				self.main = self.basic(tDT);
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
		timeOutRef = setInterval(self.main, targetInterval)
		//self.main(); 
		running = true; 
		console.log("beginning execution"); 
		return self;
	}
	self.stop = function(){ 
		clearInterval(timeOutRef);
		running = false;
		console.log("execution halted"); 
		return self;
	}
	self.setFPS = function(fps){
		targetFPS = fps;
		targetInterval = 1000 / targetFPS;
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
	
	self.set = function(viewport, scale, world){
		viewPort = vec3.create(viewport);
		halfPort = vec3.scale(viewPort, 0.5, halfPort);
		halfPort = vec3.scale(halfPort, 1/scale);
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
	
	self.getOffset = function(focusPos, scale){
		scale = scale || 0.5;
		
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
		
		return worldOff;//vec3.scale(worldOff, scale);
	}

	return self;
	
})();

window.ZAP = ZAP;

})();