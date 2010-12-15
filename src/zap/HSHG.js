// Hierarchical Spatial Hash Grid: HSHG

(function(root, undefined){
	
var  MAX_OBJECT_CELL_DENSITY = 1/8 // objects / cells
	,INITIAL_GRID_LENGTH = 256 // 16x16
	,HIERARCHY_FACTOR = 2
	,HIERARCHY_FACTOR_SQRT = Math.SQRT2
	,_grids;

//---------------------------------------------------------------------
// GLOBAL FUNCTIONS
//---------------------------------------------------------------------

function init(){
	_grids = [];
}

function addObject(obj){
	var  x ,i
		,cellSize
		,objAABB = obj.getAABB()
		,objSize = getLongestAABBEdge(objAABB.min, objAABB.max)
		,oneGrid, newGrid;
	
	// for HSHG metadata
	obj.HSHG = {};
	
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
	
}

function updateObject(obj){
	
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
		,uniqueOffsets = []
		,cell;
	
	this.sharedInnerOffsets = innerOffsets;
	
	// init all cells, creating offset arrays as needed
	
	for(i = 0; i < gridLength; i++){
		
		cell = new Cell();
		// compute row (y) and column (x) for an index
		y = ~~(i / this.rowColumnCount);
		x = ~~(i - (y*this.rowColumnCount))
		
		// reset / init
		isOnRightEdge = false;
		isOnLeftEdge = false;
		isOnTopEdge = false;
		isOnBottomEdge = false;
		
		// right or left edge cell
		if(x+1 % this.rowColumnCount == 0){ isOnRightEdge = true; }
		else if(x % this.rowColumnCount == 0){	isOnLeftEdge = true; }
		
		// top or bottom edge cell
		if(y+1 % this.rowColumnCount == 0){ isOnTopEdge = true; }
		else if(y % this.rowColumnCount == 0){ isOnBottomEdge = true; }
		
		// if cell is edge cell, use unique offsets, otherwise use inner offsets
		if(isOnRightEdge || isOnLeftEdge || isOnTopEdge || isOnBottomEdge){
			uniqueOffsets = [ 
				isOnLeftEdge || isOnBottomEdge ? null : -1 + -wh, isOnBottomEdge ? null : -wh, isOnRightEdge || isOnBottomEdge ? null : -wh + 1,
				isOnLeftEdge ? null : -1, 0, isOnRightEdge ? null : 1,
				isOnLeftEdge || isOnTopEdge ? null : wh - 1, isOnTopEdge ? null : wh, isOnRightEdge || isOnTopEdge ? null : wh + 1
			];
			cell.neighborOffsetArray = uniqueOffsets;
		} else {
			cell.neighborOffsetArray = this.sharedInnerOffsets;
		}
		
		this.allCells[i] = cell;
	}
}

Grid.prototype.toHash = function(x, y){
	var i, xHash, yHash;
	
	if(x < 0){
		i = (-x) * this.inverseCellSize;
		xHash = this.rowColumnCount - 1 - ( ~~x & this.xyHashMask );
	} else {
		i = x * this.inverseCellSize;
		xHash = ~~x & this.xyHashMask;
	}
	
	if(y < 0){
		i = (-y) * this.inverseCellSize;
		yHash = this.rowColumnCount - 1 - ( ~~y & this.xyHashMask );
	} else {
		i = y * this.inverseCellSize;
		yHash = ~~y & this.xyHashMask;
	}
	
	return xHash + yHash * this.rowColumnCount;
}

Grid.prototype.addObject = function(obj){
	var  objAABB = obj.getAABB()
		,objHash = this.toHash(objAABB.min[0], objAABB.min[1])
		,targetCell = this.allCells[objHash];
	
	if(targetCell.objectContainer === null){
		// initialize container (this is probably not actually necessary)
		targetCell.objectContainer = [];
		// insert this cell into occupied cells list
		targetCell.occupiedCellsIndex = this.occupiedCells.length;
		this.occupiedCells.push(targetCell);
	}
	
	// add meta data to obj, for fast update/removal
	obj.HSHG.objectContainerIndex = targetCell.objectContainer.length;
	obj.HSHG.hash = objHash;
	obj.HSHG.grid = this;
	// add obj to cell
	targetCell.objectContainer.push(obj);
	
	// we can assume that the targetCell is already a member of the occupied list
	
	this.totalObjects += 1;
	
	// do test for grid density
	if(this.totalObjects / this.allCells.length > MAX_OBJECT_CELL_DENSITY){
		// grid must be increased in size
		this.expandGrid();
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
		,allObjects = []
		,aCell
		,push = Array.prototype.push;
	
	// make a list of all the objects
	for(i = 0; i < this.occupiedCells.length; i++){
		aCell = this.occupiedCells[i];
		// this should be faster than concat
		push.apply(allObjects, aCell.objectContainer);
	}
	
	// reset grid values
	this.rowColumnCount = newRowColumnCount;
	this.allCells = Array(this.rowColumnCount*this.rowColumnCount);
	this.xyHashMask = newXYHashMask;
	this.totalObjects = 0;
	
	// initialize new cells
	this.initCells();
	
	// re-add all objects to grid
	for(i = 0; i < allObjects.length; i++){
		this.addObject(allObjects[i]);
	}
}

function Cell(){
	this.objectContainer = null;
	this.neighborOffsetArray;
	this.occupiedCellsIndex = null;
}

//---------------------------------------------------------------------
// EXPORTS
//---------------------------------------------------------------------

root['HSHG'] = {
	// mapScene: mapScene
	//,reset: resetSpatialHash
	//,findCandidatesForPointAtGridLevel: findCandidatesForPointAtGridLevel
	//,drawGrid: drawGrid
	//// mostly just for testing, should not be used except for getting status
	//,_private: function(){
	// 	return {
	//		hash: _hash_
	//		,hashLength: _hashLength_
	//		,subLevels: _subLevels_
	//		,gridCellSizeCache: _gridCellSizeCache_
    //
	//		,getLongestAABBEdge: getLongestAABBEdge
	//		,getSubdivisionLevel: getSubdivisionLevel
	//		,getGridCellSize: getGridCellSize
	//		,toHashFromCellCoords: toHashFromCellCoords
	//	}
	//}
	init: init
	,addObject: addObject
	,_private: function(){ return {
		 Grid: Grid
		,_grids: _grids
	}}
}

})(this);