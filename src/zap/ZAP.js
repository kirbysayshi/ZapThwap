(function(root){

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
ZAP.CGLM = (function(root){
	
	var CGLM = {
		 modes: {}
		,mode: {}
		,onTimeStep: function(){} // happens a lot
		,onFrameUpdate: function(){} // happens not as much
		,start: function(){
			this.mode.onStart();
			root.addEventListener('message', main, false);
			root.postMessage('start timestep dispatch', '*');
			console.log('CGLM START');
			return this;
		}
		,stop: function(){
			root.removeEventListener('message', main, false);
			this.mode.onStop();
			console.log('CGLM HALTED');
			return this;
		}
		,register: function(onTimeStep, onFrameUpdate){
			this.onTimeStep = onTimeStep;
			this.onFrameUpdate = onFrameUpdate;
			return this;
		}
		,setMode: function(mode){
			if( typeof this.modes[mode] !== 'undefined' ){
				this.mode = this.modes[mode];
			} else {
				throw [
					'The mode "'
					,mode
					,'" is not defined for the Constant Game Loop Machine'
				].join('');
			}
			return this;
		}
	};

	function main(){
		CGLM.mode.run( CGLM.onTimeStep, CGLM.onFrameUpdate );
		root.postMessage('timestep dispatch', '*');
	}

	return CGLM;

})(this);


/**
 * Custom mode allows control over all three control points:
 * speed multiplier (iterations of the timeStep loop), timeStep
 * (the value passed into the onTimeStep callback), and framerate,
 * or how often onFrameUpdate is called. If the time between 
 * render frames is greater than 1.5 seconds, execution is
 * automatically halted to prevent browser lockup.
 *
 */
ZAP.CGLM.modes.custom = (function(){
	
	var  startTime
		,totalFrames 
		,totalIterations = 0
		,lastActualDT = 0
		,lastTime = 0
		,totalDTSinceLastFrame = 0
		,totalDTSinceLastTimeStep = 0
		,iterations = 1
		,targetFrameInterval = 16
		,timeStep = 5
		,targetFPS = 60
		,frameUpdateStats = {
			 delta: 0
			,fps: 0
			,avgFps: 0
		}
		,timeStepStats = {
			 delta: 0
			,ips: 0
			,avgips: 0
			,iterations: 0
		};
	
	return {
		run: function(tCommands, nCommands){
			var  d = +new Date()
				,delta = d - lastTime
				,i;
			
			totalDTSinceLastFrame += delta;
			totalDTSinceLastTimeStep += delta;
		
			if(totalDTSinceLastTimeStep >= timeStep){
				
				timeStepStats.delta = timeStep;
				timeStepStats.ips = (iterations / totalDTSinceLastTimeStep * 1000).toFixed(2);
				timeStepStats.avgips = (totalIterations / (d - startTime) * 1000).toFixed(2);
				timeStepStats.iterations = iterations;
				
				for(i = 0; i < iterations; i++){ tCommands(timeStep, timeStepStats); }
				totalDTSinceLastTimeStep = 0;
				totalIterations += iterations;
			}
		
			if(totalDTSinceLastFrame >= targetFrameInterval){
				
				frameUpdateStats.delta = totalDTSinceLastFrame;
				frameUpdateStats.fps = (1 / totalDTSinceLastFrame * 1000).toFixed(2);
				frameUpdateStats.avgfps = (totalFrames / (d - startTime) * 1000).toFixed(2);
				
				nCommands(frameUpdateStats);
				
				if( totalDTSinceLastFrame > 1500 ){
					console.log([
						 'AUTO-HALT.'
						,' DELTA WAS GREATER THAN 1500 MS.'
						,' TIME: ' + totalDTSinceLastFrame].join(''));
					ZAP.CGLM.stop();
				}
				
				totalDTSinceLastFrame = 0;
				totalFrames += 1;
			}
		
			lastTime = d;
		}
		,setFPS: function(fps){
			targetFPS = fps;
			targetFrameInterval = 1000 / targetFPS;
			return this;
		}
		,setTimeStep: function(dt){
			timeStep = dt;
			return this;
		}
		,setSpeedX: function(x){
			iterations = x;
			return this;
		}
		,onStart: function(){
			lastTime = +new Date();
			totalDTSinceLastFrame = 0;
			totalFrames = 0;
			totalIterations = 0;
			startTime = lastTime;
			return this;
		}
		,onStop: function(){
			
			return this;
		}
	}
	
})();

/**
 * Realtime mode attempts to call onTimeStep as often as necessary
 * to keep the passed game time equal to the passed world time, based
 * on the target timeStep. If simTimeScale is less than 1, more time
 * passes in the real world than in the game world. If the time between 
 * render frames is greater than 1.5 seconds, execution is
 * automatically halted to prevent browser lockup.
 *
 */
ZAP.CGLM.modes.realtime = (function(){
	
	var  startTime
		,totalFrames
		,totalIterations
		,lastRunDT = 0 // how long the previous run() took
		,thisRunDT = 0 // how long the current run is taking
		,lastTime = 0 // the previous time run() was called
		,totalDTSinceLastFrame = 0
		,simTimeScale = 1 // 0.5 means 1 real second = 0.5 sim seconds
		,iterations = 0
		,remainingIT = 0
		,targetFrameInterval = 16
		,timeStep = 5
		,targetFPS = 60
		,frameUpdateStats = {
			 delta: 0
			,fps: 0
			,avgFps: 0
			,lag: 0
		}
		,timeStepStats = {
			 delta: 0
			,ips: 0
			,avgips: 0
			,iterations: 0
		};
	
	return {
		run: function(tCommands, nCommands){
			var iStartTime = +new Date()
				,delta = iStartTime - lastTime
				,i
				,iEndTime;
			
			totalDTSinceLastFrame += delta;
			totalDTSinceLastTimeStep += (delta * simTimeScale);
			
			remainingIT = iterations = (totalDTSinceLastTimeStep/timeStep) + remainingIT;
			iterations = ~~iterations; // faster than Math.floor
			remainingIT = remainingIT - iterations;
			
			if(iterations > 0){
				
				timeStepStats.delta = timeStep;
				timeStepStats.ips = (iterations / totalDTSinceLastTimeStep * 1000).toFixed(2);
				timeStepStats.avgips = (totalIterations / (iStartTime - startTime) * 1000 * 100).toFixed(2);
				timeStepStats.iterations = iterations;

				for(i = 0; i < iterations; i++){ tCommands(timeStep, timeStepStats); }
				totalDTSinceLastTimeStep = 0;
				totalIterations += iterations;
			}

			if(totalDTSinceLastFrame >= targetFrameInterval){

				thisRunDT = +new Date() - iStartTime;
				
				frameUpdateStats.delta = totalDTSinceLastFrame;
				frameUpdateStats.fps = (1 / totalDTSinceLastFrame * 1000).toFixed(2);
				frameUpdateStats.avgfps = (totalFrames / (iStartTime - startTime) * 1000).toFixed(2);
				frameUpdateStats.lag = thisRunDT - lastRunDT;

				nCommands(frameUpdateStats);

				// TODO: if this happens, make it adaptive instead of halting?
				
				if( totalDTSinceLastFrame > 1500 ){
					console.log([
						 'AUTO-HALT.'
						,' DELTA WAS GREATER THAN 1500 MS.'
						,' TIME: ' + totalDTSinceLastFrame].join(''));
					ZAP.CGLM.stop();
				}

				totalDTSinceLastFrame = 0;
				totalFrames += 1;
			}
			
			lastRunDT = thisRunDT;
			lastTime = iStartTime;
		}
		,setFPS: function(fps){
			targetFPS = fps;
			targetFrameInterval = 1000 / targetFPS;
			return this;
		}
		,setTimeStep: function(dt){
			timeStep = dt;
			return this;
		}
		,setSimTimeScale: function(scale){
			simTimeScale = scale;
			return this;
		}
		,onStart: function(){
			totalDTSinceLastFrame = 0;
			totalDTSinceLastTimeStep = 0;
			totalIterations = 0;
			totalFrames = 0;
			lastTime = +new Date();
			startTime = lastTime;
			return this;
		}
		,onStop: function(){
			
			return this;
		}
	}
	
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

root.ZAP = ZAP;

})(this);