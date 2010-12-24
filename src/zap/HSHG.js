// Hierarchical Spatial Hash Grid: HSHG
// TODO: make the private vars configurable to the outside

(function(root, undefined){
	
var  MAX_OBJECT_CELL_DENSITY = 1/8 // objects / cells
	,INITIAL_GRID_LENGTH = 256 // 16x16
	,HIERARCHY_FACTOR = 2
	,HIERARCHY_FACTOR_SQRT = Math.SQRT2
	,UPDATE_METHOD = update_RECOMPUTE // or update_REMOVEALL
	,_grids
	,_globalObjects;

//---------------------------------------------------------------------
// GLOBAL FUNCTIONS
//---------------------------------------------------------------------

function init(){
	_grids = [];
	_globalObjects = [];
}

function addObject(obj){
	var  x ,i
		,cellSize
		,objAABB = obj.getAABB()
		,objSize = getLongestAABBEdge(objAABB.min, objAABB.max)
		,oneGrid, newGrid;
	
	// for HSHG metadata
	obj.HSHG = {
		globalObjectsIndex: _globalObjects.length
	};
	
	// add to global object array
	_globalObjects.push(obj);
	
	if(_grids.length == 0) {
		// no grids exist yet
		cellSize = objSize * HIERARCHY_FACTOR_SQRT;
		newGrid = new Grid(cellSize, INITIAL_GRID_LENGTH);
		newGrid.initCells();
		newGrid.addObject(obj);
		
		_grids.push(newGrid);	
	} else {
		x = 0;

		// grids are sorted by cellSize, smallest to largest
		for(i = 0; i < _grids.length; i++){
			oneGrid = _grids[i];
			x = oneGrid.cellSize;
			if(objSize < x){
				x = x / HIERARCHY_FACTOR;
				if(objSize < x) {
					// find appropriate size
					while( objSize < x ) {
						x = x / HIERARCHY_FACTOR;
					}
					newGrid = new Grid(x * HIERARCHY_FACTOR, INITIAL_GRID_LENGTH);
					newGrid.initCells();
					// assign obj to grid
					newGrid.addObject(obj)
					// insert grid into list of grids directly before oneGrid
					_grids.splice(i, 0, newGrid);
				} else {
					// insert obj into grid oneGrid
					oneGrid.addObject(obj);
				}
				return;
			}
		}
		
		while( objSize >= x ){
			x = x * HIERARCHY_FACTOR;
		}
		
		newGrid = new Grid(x, INITIAL_GRID_LENGTH);
		newGrid.initCells();
		// insert obj into grid
		newGrid.addObject(obj)
		// add newGrid as last element in grid list
		_grids.push(newGrid);
	}
}

function removeObject(obj){
	var  meta = obj.HSHG
		,globalObjectsIndex
		,replacementObj;
	
	if(meta === undefined){
		throw Error( obj + ' was not in the HSHG.' );
		return;
	}
	
	// remove object from global object list
	globalObjectsIndex = meta.globalObjectsIndex
	if(globalObjectsIndex === _globalObjects.length - 1){
		_globalObjects.pop();
	} else {
		replacementObj = _globalObjects.pop();
		replacementObj.HSHG.globalObjectsIndex = globalObjectsIndex;
		_globalObjects[ globalObjectsIndex ] = replacementObj;
	}
	
	meta.grid.removeObject(obj);
	
	// remove meta data
	delete obj.HSHG;
}

/**
 * Updates every object's position in the grid, but only if
 * the hash value for that object has changed.
 * This method DOES NOT take into account object expansion or
 * contraction, just position, and does not attempt to change 
 * the grid the object is currently in; it only (possibly) changes
 * the cell.
 *
 * If the object has significantly changed in size, the best bet is to
 * call removeObject() and addObject() sequentially, outside of the 
 * normal update cycle of HSHG.
 *
 * @return  void   desc
 */
function update_RECOMPUTE(){
		
	var i
		,obj
		,grid
		,meta
		,objAABB
		,newObjHash;
	
	// for each object
	for(i = 0; i < _globalObjects.length; i++){
		obj = _globalObjects[i];
		meta = obj.HSHG;
		grid = meta.grid;
		
		// recompute hash
		objAABB = obj.getAABB();
		newObjHash = grid.toHash(objAABB.min[0], objAABB.min[1]);
		
		if(newObjHash !== meta.hash){
			// grid position has changed, update!
			grid.removeObject(obj);
			grid.addObject(obj, newObjHash);
		} 
	}		
}

function update_REMOVEALL(){
	
}

function queryForCollisionPairs(broadOverlapTest){
	
	var i, j, k, l, c
		,grid
		,cell
		,objA
		,objB
		,offset
		,adjacentCell
		,biggerGrid
		,objAAABB
		,objAHashInBiggerGrid
		,possibleCollisions = []
	
	// default broad test to internal aabb overlap test
	broadOverlapTest = broadOverlapTest || testAABBOverlap;
	
	// for all grids ordered by cell size ASC
	for(i = 0; i < _grids.length; i++){
		grid = _grids[i];
		
		// for each cell of the grid that is occupied
		for(j = 0; j < grid.occupiedCells.length; j++){
			cell = grid.occupiedCells[j];
			
			// collide all objects within the occupied cell
			for(k = 0; k < cell.objectContainer.length; k++){
				objA = cell.objectContainer[k];
				for(l = k+1; l < cell.objectContainer.length; l++){
					objB = cell.objectContainer[l];
					if(broadOverlapTest(objA, objB) === true){
						possibleCollisions.push( [ objA, objB ] );
					}
				}
			}
			
			// for the first half of all adjacent cells (offset 4 is the current cell)
			for(c = 0; c < 4; c++){
				offset = cell.neighborOffsetArray[c];
				
				if(offset === null) { continue; }
				
				adjacentCell = grid.allCells[ cell.allCellsIndex + offset ];
				
				// collide all objects in cell with adjacent cell
				for(k = 0; k < cell.objectContainer.length; k++){
					objA = cell.objectContainer[k];
					for(l = 0; l < adjacentCell.objectContainer.length; l++){
						objB = adjacentCell.objectContainer[l];
						if(broadOverlapTest(objA, objB) === true){
							possibleCollisions.push( [ objA, objB ] );
						}
					}
				}
			}
		}
		
		// forall objects that are stored in this grid
		for(j = 0; j < grid.allObjects.length; j++){
			objA = grid.allObjects[j];
			objAAABB = objA.getAABB();
			
			// for all grids with cellsize larger than grid
			for(k = i + 1; k < _grids.length; k++){
				biggerGrid = _grids[k];
				objAHashInBiggerGrid = biggerGrid.toHash(objAAABB.min[0], objAAABB.min[1]);
				cell = biggerGrid.allCells[objAHashInBiggerGrid];
				
				// check objA against every object in all cells in offset array of cell
				// for all adjacent cells...
				for(c = 0; c < cell.neighborOffsetArray.length; c++){
					offset = cell.neighborOffsetArray[c];

					if(offset === null) { continue; }

					adjacentCell = biggerGrid.allCells[ cell.allCellsIndex + offset ];
					
					// for all objects in the adjacent cell...
					for(l = 0; l < adjacentCell.objectContainer.length; l++){
						objB = adjacentCell.objectContainer[l];
						// test against object A
						if(broadOverlapTest(objA, objB) === true){
							possibleCollisions.push( [ objA, objB ] );
						}
					}
				}
			}
		}
	}
	
	// return list of object pairs
	return possibleCollisions;
}

function testAABBOverlap(objA, objB){
	var  a = objA.getAABB()
		,b = objB.getAABB();
	
	if(a.min[0] > b.max[0] || a.min[1] > b.max[1]
	|| a.max[0] < b.min[0] || a.max[1] < b.min[1]){
		return false;
	} else {
		return true;
	}
}

function getLongestAABBEdge(min, max){
	return Math.max(
		Math.abs(max[0] - min[0]),
		Math.abs(max[1] - min[1])
	);
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

//---------------------------------------------------------------------
// ENTITIES
//---------------------------------------------------------------------

/**
 * Grid
 *
 * @constructor
 * @param  int cellSize  the pixel size of each cell of the grid
 * @param  int  cellCount  the total number of cells for the grid (width x height)
 * @return  void
 */
function Grid(cellSize, cellCount){
	this.cellSize = cellSize;
	this.inverseCellSize = 1/cellSize;
	this.rowColumnCount = ~~Math.sqrt(cellCount);
	this.xyHashMask = this.rowColumnCount - 1;
	this.occupiedCells = [];
	this.allCells = Array(this.rowColumnCount*this.rowColumnCount);
	this.allObjects = [];
	this.sharedInnerOffsets = [];
	this.totalObjects = 0;
}

Grid.prototype.initCells = function(){
	
	// TODO: inner/unique offset rows 0 and 2 may need to be
	// swapped due to +y being "down" vs "up"
	
	var  i, gridLength = this.allCells.length
		,x, y
		,wh = this.rowColumnCount
		,isOnRightEdge, isOnLeftEdge, isOnTopEdge, isOnBottomEdge
		,innerOffsets = [ 
			-1 + -wh, -wh, -wh + 1,
			-1, 0, 1,
			wh - 1, wh, wh + 1
		]
		,leftOffset, rightOffset, topOffset, bottomOffset
		,uniqueOffsets = []
		,cell;
	
	this.sharedInnerOffsets = innerOffsets;
	
	// init all cells, creating offset arrays as needed
	
	for(i = 0; i < gridLength; i++){
		
		cell = new Cell();
		// compute row (y) and column (x) for an index
		y = ~~(i / this.rowColumnCount);
		x = ~~(i - (y*this.rowColumnCount));
		
		// reset / init
		isOnRightEdge = false;
		isOnLeftEdge = false;
		isOnTopEdge = false;
		isOnBottomEdge = false;
		
		// right or left edge cell
		if((x+1) % this.rowColumnCount == 0){ isOnRightEdge = true; }
		else if(x % this.rowColumnCount == 0){ isOnLeftEdge = true; }
		
		// top or bottom edge cell
		if((y+1) % this.rowColumnCount == 0){ isOnTopEdge = true; }
		else if(y % this.rowColumnCount == 0){ isOnBottomEdge = true; }
		
		// if cell is edge cell, use unique offsets, otherwise use inner offsets
		if(isOnRightEdge || isOnLeftEdge || isOnTopEdge || isOnBottomEdge){
			
			// figure out cardinal offsets first
			rightOffset = isOnRightEdge === true ? -wh + 1 : 1;
			leftOffset = isOnLeftEdge === true ? wh - 1 : -1;
			topOffset = isOnTopEdge === true ? -gridLength + wh : wh;
			bottomOffset = isOnBottomEdge === true ? gridLength - wh : -wh;
			
			// diagonals are composites of the cardinals			
			uniqueOffsets = [ 
				leftOffset + bottomOffset, bottomOffset, rightOffset + bottomOffset,
				leftOffset, 0, rightOffset,
				leftOffset + topOffset, topOffset, rightOffset + topOffset
			];
			
			cell.neighborOffsetArray = uniqueOffsets;
		} else {
			cell.neighborOffsetArray = this.sharedInnerOffsets;
		}
		
		cell.allCellsIndex = i;
		this.allCells[i] = cell;
	}
}

Grid.prototype.toHash = function(x, y){
	var i, xHash, yHash;
	
	if(x < 0){
		i = (-x) * this.inverseCellSize;
		xHash = this.rowColumnCount - 1 - ( ~~i & this.xyHashMask );
		//xHash = this.rowColumnCount - 1 - ( ~~x % this.rowColumnCount);
	} else {
		i = x * this.inverseCellSize;
		xHash = ~~i & this.xyHashMask;
		//xHash = (~~i) % this.rowColumnCount;
	}
	
	if(y < 0){
		i = (-y) * this.inverseCellSize;
		yHash = this.rowColumnCount - 1 - ( ~~i & this.xyHashMask );
		//yHash = this.rowColumnCount - 1 - ( ~~y % this.rowColumnCount);
	} else {
		i = y * this.inverseCellSize;
		yHash = ~~i & this.xyHashMask;
		//yHash = (~~i) % this.rowColumnCount;
	}
	
	return xHash + yHash * this.rowColumnCount;
}

Grid.prototype.addObject = function(obj, hash){
	var  objAABB
		,objHash
		,targetCell;
	
	// technically, this should save some computational effort when updating objects
	if(hash !== undefined){
		objHash = hash;
	} else {
		objAABB = obj.getAABB()
		objHash = this.toHash(objAABB.min[0], objAABB.min[1])
	}
	targetCell = this.allCells[objHash];
	
	if(targetCell.objectContainer.length === 0){
		// initialize container (this is probably not actually necessary)
		//targetCell.objectContainer = [];
		// insert this cell into occupied cells list
		targetCell.occupiedCellsIndex = this.occupiedCells.length;
		this.occupiedCells.push(targetCell);
	}
	
	// add meta data to obj, for fast update/removal
	obj.HSHG.objectContainerIndex = targetCell.objectContainer.length;
	obj.HSHG.hash = objHash;
	obj.HSHG.grid = this;
	obj.HSHG.allGridObjectsIndex = this.allObjects.length;
	// add obj to cell
	targetCell.objectContainer.push(obj);
	
	// we can assume that the targetCell is already a member of the occupied list
	
	// add to grid-global object list
	this.allObjects.push(obj);
	
	// do test for grid density
	if(this.allObjects.length / this.allCells.length > MAX_OBJECT_CELL_DENSITY){
		// grid must be increased in size
		this.expandGrid();
	}
}

Grid.prototype.removeObject = function(obj){
	var  meta = obj.HSHG
		,hash
		,containerIndex
		,allGridObjectsIndex
		,cell
		,replacementCell
		,replacementObj;
	
	hash = meta.hash;
	containerIndex = meta.objectContainerIndex;
	allGridObjectsIndex = meta.allGridObjectsIndex;
	cell = this.allCells[hash];
	
	// remove object from cell object container
	if(cell.objectContainer.length === 1){
		// this is the last object in the cell, so reset it
		cell.objectContainer.length = 0;	
		
		// remove cell from occupied list
		if(cell.occupiedCellsIndex === this.occupiedCells.length - 1){
			// special case if the cell is the newest in the list
			this.occupiedCells.pop();
		} else {
			replacementCell = this.occupiedCells.pop();
			replacementCell.occupiedCellsIndex = cell.occupiedCellsIndex;
			this.occupiedCells[ cell.occupiedCellsIndex ] = replacementCell;
		}
		
		cell.occupiedCellsIndex = null;
	} else {
		// special case if the obj is the newest in the container
		if(containerIndex === cell.objectContainer.length - 1){
			cell.objectContainer.pop();
		} else {
			replacementObj = cell.objectContainer.pop();
			replacementObj.HSHG.objectContainerIndex = containerIndex;
			cell.objectContainer[ containerIndex ] = replacementObj;
		}
	}
	
	// remove object from grid object list
	if(allGridObjectsIndex === this.allObjects.length - 1){
		this.allObjects.pop();
	} else {
		replacementObj = this.allObjects.pop();
		replacementObj.HSHG.allGridObjectsIndex = allGridObjectsIndex;
		this.allObjects[ allGridObjectsIndex ] = replacementObj;
	}
}

Grid.prototype.expandGrid = function(){
	var  i, j
		,currentCellCount = this.allCells.length
		,currentRowColumnCount = this.rowColumnCount
		,currentXYHashMask = this.xyHashMask
		,currentTotalObjects = this.totalObjects
		
		,newCellCount = currentCellCount * 4 // double each dimension
		,newRowColumnCount = ~~Math.sqrt(newCellCount)
		,newXYHashMask = newRowColumnCount - 1
		,allObjects = this.allObjects.slice(0)
		,aCell
		,push = Array.prototype.push;
	
	// make a list of all the objects
	//for(i = 0; i < this.occupiedCells.length; i++){
	//	aCell = this.occupiedCells[i];
	//	// this should be faster than concat
	//	push.apply(allObjects, aCell.objectContainer);
	//}
	
	// remove all objects
	for(i = 0; i < allObjects.length; i++){
		this.removeObject(allObjects[i]);
	}
	
	// reset grid values
	this.rowColumnCount = newRowColumnCount;
	this.allCells = Array(this.rowColumnCount*this.rowColumnCount);
	this.xyHashMask = newXYHashMask;
	//this.totalObjects = 0;
	
	// initialize new cells
	this.initCells();
	
	// re-add all objects to grid
	for(i = 0; i < allObjects.length; i++){
		this.addObject(allObjects[i]);
	}
}

function Cell(){
	this.objectContainer = [];
	this.neighborOffsetArray;
	this.occupiedCellsIndex = null;
	this.allCellsIndex = null;
}

//---------------------------------------------------------------------
// EXPORTS
//---------------------------------------------------------------------

root['HSHG'] = {
	init: init
	,addObject: addObject
	,removeObject: removeObject
	,update: UPDATE_METHOD
	,queryForCollisionPairs: queryForCollisionPairs
	,_private: function(){ return {
		 Grid: Grid
		,_grids: _grids
		,_globalObjects: _globalObjects
	}}
}

})(this);
