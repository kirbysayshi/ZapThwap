describe('HSHG', function(){
	
	it('can make a 4x4 Grid with proper offsets', function(){
		var p = HSHG._private();
		var grid = new p.Grid(20, 16);
		
		expect(grid.rowColumnCount).toEqual(4);
		grid.initCells();
		
		//  null	4		5		||	6	7	8
		//  null	0		1		||	3	4	5
		//  null	null	null	||	0	1	2
		expect(grid.allCells[0].neighborOffsetArray).toEqual([
			null, null, null, null, 0, 1, null, 4, 5
		]);
		
		expect(grid.allCells[4].neighborOffsetArray).toEqual([
			null, -4, -3, null, 0, 1, null, 4, 5
		]);
		
		console.log(grid);
	});
	
	it('can hash appropriately', function(){
		var p = HSHG._private();
		var grid = new p.Grid(133, 256);
		grid.initCells();
		
		console.log(grid.toHash(10,11));
		console.log(grid.toHash(10,10));
		console.log(grid.toHash(10,1000));
		console.log(grid.toHash(10000,100));
		
		expect(grid.toHash(10,11)).toEqual(grid.toHash(10,10));
		expect(grid.toHash(10,1000)).not.toEqual(grid.toHash(10000,1000));
	});
	
	it('can add an object to the grid', function(){
		var v1 = new Vertex({ x: 10, y: 1000, radius: 40 }),
			p;
			
		HSHG.init();
		HSHG.addObject(v1);
		p = HSHG._private();
		expect(p._grids.length).toEqual(1);
		expect(p._grids[0].occupiedCells.length).toEqual(1);
		expect(p._globalObjects.length).toEqual(1);
		console.log( HSHG._private() );
	});
	
	it('can add three similar objects to the same grid', function(){
		var v1 = new Vertex({ x: 10, y: 1000, radius: 40 }),
		 	v2 = new Vertex({ x: 10, y: 1000, radius: 45 }),
		 	v3 = new Vertex({ x: 10, y: 1000, radius: 50 }), 
			p;
			
		HSHG.init();
		HSHG.addObject(v1);
		HSHG.addObject(v2);
		HSHG.addObject(v3);
		p = HSHG._private();
		
		expect(p._grids.length).toEqual(1);
		expect(p._globalObjects.length).toEqual(3);
		
		console.log( HSHG._private() );
	});
	
	it('can remove one object from the grid', function(){
		// the positions of these are purposeful. The grid size is approximately 57
		var v1 = new Vertex({ x: 0,  y: 1000, radius: 20 }),
		 	v2 = new Vertex({ x: 70, y: 1000, radius: 20 }),
		 	v3 = new Vertex({ x: 140, y: 1000, radius: 20 }),
			p;
			
		HSHG.init();
		HSHG.addObject(v1);
		HSHG.addObject(v2);
		HSHG.addObject(v3);
		p = HSHG._private();
		
		expect(p._grids[0].allObjects.length).toEqual(3);
		expect(p._grids[0].occupiedCells.length).toEqual(3);
		expect(p._globalObjects.length).toEqual(3);
		
		HSHG.removeObject(v3);
		p = HSHG._private(); // refresh the snapshot
		expect(p._grids[0].occupiedCells.length).toEqual(2);
		
		expect(v3.HSHG).toBe(undefined); // metadata should be gone
		expect(p._grids[0].allObjects.length).toEqual(2);
		expect(p._globalObjects.length).toEqual(2);
		
		console.log( HSHG._private() );
	});
	
	it('can detect possible collisions', function(){
		var v1 = new Vertex({ x: 10, y: 1000, radius: 40 }),
		 	v2 = new Vertex({ x: 20, y: 1000, radius: 45 }),
		 	v3 = new Vertex({ x: 40, y: 1000, radius: 50 }),
			p,
			collisions;
			
		HSHG.init();
		HSHG.addObject(v1);
		HSHG.addObject(v2);
		HSHG.addObject(v3);
		collisions = HSHG.queryForCollisionPairs();
		
		expect(collisions.length).toEqual(3);
	});
	
	it('can update object position in the grid', function(){
		var v1 = new Vertex({ x: 100, y: 0, radius: 1 }),
			p;
			
		HSHG.init();
		HSHG.addObject(v1);
		
		console.log(v1.HSHG);
		expect(v1.HSHG.hash).toEqual(243);
		v1.x = 200;
		HSHG.update();
		expect(v1.HSHG.hash).toEqual(246);
	});
});

// used to outline the interface the HSHG expects
function Vertex(args /*x, y, radius*/){
	var argProp;
	
	for(argProp in args){
		if(args.hasOwnProperty(argProp)){
			this[ argProp ] = args[argProp]; 
		}
	}
}

Vertex.prototype.getAABB = function(){
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