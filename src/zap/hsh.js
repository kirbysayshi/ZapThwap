//(function(root, undefined){
	


var _hash_, _hashLength_, _subLevels_, _gridCellSizeCache_;

function resetSpatialHash(){
	_hash_ = [];
	_hashLength_ = 0;
	_subLevels_ = [];
	_gridCellSizeCache_ = [];
}

function getLongestAABBEdge(min, max){
	return Math.max(
		Math.abs(max[0] - min[0]),
		Math.abs(max[1] - min[1])
	);
}

function getSubdivisionLevel(longestEdgeLength){
	return Math.ceil(Math.log(longestEdgeLength) / Math.LN2);
}

function getGridCellSize(subdivisionLevel){
	var sl = _gridCellSizeCache_[subdivisionLevel];
	if(sl !== undefined){
		return sl;
	} else {
		return _gridCellSizeCache_[subdivisionLevel] = Math.pow(2, subdivisionLevel);
	}
}

function toHash(x, y, /*z,*/ l, m){
	var hash = x * 73856093;
	hash = hash ^ (y * 19349663);
	//hash = hash ^ (z * 83492791);
	hash = hash ^ (l * 67867979);
	return Math.abs(hash % m);
}

function mapScene(objArr){
	var i = 0, length = objArr.length
		,obj, l, s, hLocMin, hLocMax, hLocTopRight, hLocBottomLeft, gridCellSize
		,minHashCell, maxHashCell;
	
	_hashLength_ = length;
	
	for(; i < length; i++){
		obj = objArr[i];
		aabb = obj.computeAABB();
		
		s = getLongestAABBEdge( aabb.min, aabb.max );
		l = getSubdivisionLevel( s );
		
		// store subdivision level
		_subLevels_[l] = true;
		
		gridCellSize = getGridCellSize( l );
		hLocMin = toHash(
			 Math.floor(aabb.min[0] / gridCellSize)
			,Math.floor(aabb.min[1] / gridCellSize)
			//,0
			,l
			,length
		);
		
		if(_hash_[hLocMin] == undefined){ _hash_[hLocMin] = []; }

		_hash_[hLocMin].push(obj);

		//console.log('"' + obj.name + '" minHash: ' + hLocMin
		//	+ ', cell size: ' + gridCellSize 
		//	+ ', subdivision: ' + l);
	}
}

function findCandidatesForPoint(point){
	var  i = 0
		,j
		,subLevels = _subLevels_
		,subLLength = subLevels.length
		,gridCellSize
		,candidates = []
		,gridCell
		,hash = _hash_
		,hashLength = _hashLength_
		,hLocTL, hLocTR, hLocBR, hLocBL;
	
	for(; i < subLLength; i++){
		l = subLevels[i];
		if(l === true){
			gridCellSize = getGridCellSize(i);
			
			// Top Left is the registration
			hLocTL = toHash(
				 Math.floor(point[0] / gridCellSize)
				,Math.floor(point[1] / gridCellSize)
				,i // level is the index
				,hashLength
			);
			
			// top right hash
			hLocTR = toHash(
				 Math.floor(point[0] + gridCellSize / gridCellSize)
				,Math.floor(point[1] / gridCellSize)
				,i // level is the index
				,hashLength
			);
			
			// bottom right hash
			hLocBR = toHash(
				 Math.floor(point[0] + gridCellSize / gridCellSize)
				,Math.floor(point[1] + gridCellSize / gridCellSize)
				,i // level is the index
				,hashLength
			);
			
			// bottom left hash
			hLocBL = toHash(
				 Math.floor(point[0] / gridCellSize)
				,Math.floor(point[1] + gridCellSize / gridCellSize)
				,i // level is the index
				,hashLength
			);
			
			// add top left candidates always
			gridCell = hash[hLocTL];
			if(gridCell !== undefined){
				for(j = 0; j < gridCell.length; j++){
					candidates.push( gridCell[j] );
				}
			}
			
			// add top right candidates if different from top left
			if(hLocTR !== hLocTL){
				gridCell = hash[hLocTR];
				if(gridCell !== undefined){
					for(j = 0; j < gridCell.length; j++){
						candidates.push( gridCell[j] );
					}
				}
			}
			
			// add bottom right candidates if different from top left and top right
			if(hLocBR !== hLocTL && hLocBR !== hLocTR){
				gridCell = hash[hLocBR];
				if(gridCell !== undefined){
					for(j = 0; j < gridCell.length; j++){
						candidates.push( gridCell[j] );
					}
				}
			}
			
			// add bottom left candidates if different from top left, top right, and bottom right
			if(hLocBL !== hLocTL && hLocBL !== hLocTR && hLocBL !== hLocBR){
				gridCell = hash[hLocBL];
				if(gridCell !== undefined){
					for(j = 0; j < gridCell.length; j++){
						candidates.push( gridCell[j] );
					}
				}
			}
		}
	}
	return candidates;
}

function findCandidatesForAABB(aabb){
	var  i = 0
		,subLevels = _subLevels_
		,subLLength = subLevels.length
		,l
		,maxEdgeLength = getLongestAABBEdge(aabb.min, aabb.max)
		,gridCellSize = getGridCellSize( maxEdgeLength )
		,hLoc
		,hLocs = [];
	
	for(; i < subLLength; i++){
		l = subLevels[i];
		if(l === true){
			hLoc = toHash(
				 aabb.min[0] / gridCellSize
				,aabb.min[1] / gridCellSize
				//,0
				,i // level is the index
				,numBodies
			);
		}
		
	}
}

function drawHGrid(ctx, startDim, endDim){
	var subLevels = _subLevels_
		,subLevelsLength = subLevels.length
		,i, j, k
		,subLevel
		,gridCellSize
		,rgb = [1, 1, 1];
	
	ctx.lineWidth = 1;
	
	
	for(i = 0; i < subLevelsLength; i++){
		subLevel = subLevels[i];
		
		if(subLevel === undefined){ continue; }
	
		ctx.beginPath();
		gridCellSize = getGridCellSize( i );
		
		rgb[0] = 100;//30 * i;
		rgb[1] = 100;//255 * Math.random();
		rgb[2] = 100;//255 * Math.random();
		
		ctx.strokeStyle = 'rgba(' + ~~rgb[0] + ',' + ~~rgb[1] + ',' + ~~rgb[2] + ',0.2)';
		
		// x
		for(j = ~~(startDim[0] / gridCellSize); j < endDim[0]; j += gridCellSize){
			ctx.moveTo(j, startDim[1]);
			ctx.lineTo(j, endDim[1]);
		}
		
		// y
		for(j = ~~(startDim[1] / gridCellSize); j < endDim[1]; j += gridCellSize){
			ctx.moveTo(startDim[0], j);
			ctx.lineTo(endDim[0], j);
		}
		ctx.stroke();
	}	
}



//})(this);

function Vertex(args /*x, y, radius*/){
	var argProp;
	
	for(argProp in args){
		if(args.hasOwnProperty(argProp)){
			this[ argProp ] = args[argProp]; 
		}
	}
}

Vertex.prototype.computeAABB = function(){
	var rad = this.radius
		,x = this.x
		,y = this.y;
	return this.aabb = { 
		 min: [ x - rad, y - rad ]
		,max: [ x + rad, y + rad ]
	};
}

Vertex.prototype.draw = function(ctx, color){
	ctx.strokeStyle = color;
	ctx.beginPath();
	ctx.arc( this.x, this.y, this.radius, 0, Math.PI*2, false);
	ctx.strokeRect(this.aabb.min[0], this.aabb.min[1], this.radius*2, this.radius*2);
	ctx.stroke();
}