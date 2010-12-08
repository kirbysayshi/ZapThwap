// Hierarchical Spatial Hash Grid: HSHG

// Ceased development using this specific version of the algorithm
// because it's fundamentally based on having two separate classes
// of objects, such as tetrahedrons (bodies) and vertices. You're
// supposed to map the vertices in the first pass, and then compute
// what grid cells the body covers, and then collide all vertices
// that are in those cells with the body. You'd need to use a lookup 
//table to not duplicate reported collisions. For a Particle vs Body
// detection, this would be perfect, but not for body vs body. In 
// other words, if everything is supposed to collide with everything
// (or at least most things) then this method won't work, because 
// most of the time would be spent checking if a collision was already
// reported. There's no way to reliably traverse the "grid" (1D array)
// without checking for duplicates.

(function(root, undefined){
	
var _hash_
	,_hashLength_
	,_subLevels_
	,_gridCellSizeCache_;

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

// gets the grid cell size given a subdivision level.
// This plus the getSubdivisionLevel guarantees that for 2D, 
// no object will span more than 4 cells.
function getGridCellSize(subdivisionLevel){
	var sl = _gridCellSizeCache_[subdivisionLevel];
	if(sl !== undefined){
		return sl;
	} else {
		return _gridCellSizeCache_[subdivisionLevel] = Math.pow(2, subdivisionLevel);
	}
}

// given an (x, y), subdivision level, and length of the hash (basically
// the number of bodies being hashed), computes a hash used to construct
// the spatial grid 
function toHashFromCellCoords(x, y, l, m){
	var hash = x * 73856093;
	hash = hash ^ (y * 19349663);
	hash = hash ^ (l * 67867979);
	return Math.abs(hash % m);
}

function mapScene(objArr){
	var i = 0, length = objArr.length
		,obj, subLevel, s
		,hLocMin, hLocMax, hLocTopRight, hLocBottomLeft
		,gridCellSize
		,minHashCell, maxHashCell
		,gridX, gridY;
	
	// set global length for later hash translations
	_hashLength_ = length;
	
	for(; i < length; i++){
		obj = objArr[i];
		aabb = obj.getAABB();
		
		s = getLongestAABBEdge( aabb.min, aabb.max );
		subLevel = getSubdivisionLevel( s );
		
		// store subdivision level
		_subLevels_[subLevel] = true;
		
		// the grid cell size is guaranteed to be able to contain
		// the aabb given, thus any object will fit within no more
		// than 4 grid cells for a given subdivision level.
		gridCellSize = getGridCellSize( subLevel );
		gridX = Math.floor(aabb.min[0] / gridCellSize);
		gridY = Math.floor(aabb.min[1] / gridCellSize);
		hLocMin = toHashFromCellCoords(
			 gridX
			,gridY
			,subLevel
			,length
		);
		
		if(_hash_[hLocMin] == undefined){ _hash_[hLocMin] = []; }

		_hash_[hLocMin].push(obj);

		obj._HSHG = {
			 hash: hLocMin
			,subLevel: subLevel
			,longestSide: s
			,gridSize: gridCellSize
			,gridCoords: '[' + gridX + ', ' + gridY + ']'
		};

		//console.log('"' + obj.name + '" minHash: ' + hLocMin
		//	+ ', cell size: ' + gridCellSize 
		//	+ ', subdivision: ' + subLevel);
	}
}

function findCandidatesForPointAtGridLevel(point, level){
	var  i = level, j
		,subLevels = _subLevels_
		,subLLength = subLevels.length
		,gridCellSize
		,candidates = []
		,gridCell
		,hash = _hash_
		,hashLength = _hashLength_
		,hLocTL, hLocTR, hLocBR, hLocBL;
	
	for(; i < subLLength; i++){
		// if i is a valid level
		if(subLevels[i] === true){
			gridCellSize = getGridCellSize(i);
			
			// since all objects per a subdivision level are bound
			// by at most 4 cells, and assuming the top left (minimum)
			// point of the AABB was used to compute the object hash, we manually 
			// query the four possible cells the object could be in to find
			// those candidates that exist in those cells.
			
			// Top Left is the registration
			hLocTL = toHashFromCellCoords(
				 Math.floor(point[0] / gridCellSize)
				,Math.floor(point[1] / gridCellSize)
				,i // level is the index
				,hashLength
			);
			
			// top right hash
			hLocTR = toHashFromCellCoords(
				 Math.floor((point[0] + gridCellSize) / gridCellSize)
				,Math.floor(point[1] / gridCellSize)
				,i // level is the index
				,hashLength
			);
			
			// bottom right hash
			hLocBR = toHashFromCellCoords(
				 Math.floor((point[0] + gridCellSize) / gridCellSize)
				,Math.floor((point[1] + gridCellSize) / gridCellSize)
				,i // level is the index
				,hashLength
			);
			
			// bottom left hash
			hLocBL = toHashFromCellCoords(
				 Math.floor(point[0] / gridCellSize)
				,Math.floor((point[1] + gridCellSize) / gridCellSize)
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

// this is broken right now
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
			hLoc = toHashFromCellCoords(
				 aabb.min[0] / gridCellSize
				,aabb.min[1] / gridCellSize
				//,0
				,i // level is the index
				,numBodies
			);
		}
		
	}
}

function drawGrid(ctx, startDim, endDim){
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
		
		ctx.strokeStyle = 'rgba(' 
			+ ~~rgb[0] + ',' 
			+ ~~rgb[1] + ',' 
			+ ~~rgb[2] + ',0.2)';
		
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

root['HSHG'] = {
	 mapScene: mapScene
	,reset: resetSpatialHash
	,findCandidatesForPointAtGridLevel: findCandidatesForPointAtGridLevel
	,drawGrid: drawGrid
	// mostly just for testing, should not be used except for getting status
	,_private: function(){
	 	return {
			hash: _hash_
			,hashLength: _hashLength_
			,subLevels: _subLevels_
			,gridCellSizeCache: _gridCellSizeCache_

			,getLongestAABBEdge: getLongestAABBEdge
			,getSubdivisionLevel: getSubdivisionLevel
			,getGridCellSize: getGridCellSize
			,toHashFromCellCoords: toHashFromCellCoords
		}
	}
}

})(this);