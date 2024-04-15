import Quaternion from "quaternion";
import {IAutomatedShip, ICameraState} from "./Interface";
import {Game} from "./Game";

export interface ITessellatedTriangle {
    vertices: Quaternion[];
}

export interface IDrawableTile {
    vertices: Quaternion[];
    centroid: Quaternion;
    color: string;
    id: string;
}

export interface ICellData {
    vertices: Array<[number, number, number]>;
    centroid: [number, number, number];
}

/**
 * A polygon shape on a VoronoiGraph.
 */
export class VoronoiCell implements ICellData {
    public vertices: [number, number, number][] = [];
    public centroid: [number, number, number] = [0, 0, 0];
    public vertex: [number, number, number] = [0, 0, 0];
    public radius: number = 0;
    public neighborIndices: number[] = [];

    /**
     * If the voronoi cell contains the point.
     * @param point The point to test.
     */
    public containsPoint(point: [number, number, number]): boolean {
        // for each pair of vertices
        for (let i = 0; i < this.vertices.length; i++) {
            // test line segment and point
            const a = this.vertices[i % this.vertices.length];
            const b = this.vertices[(i + 1) % this.vertices.length];
            const n = DelaunayGraph.normalize(DelaunayGraph.crossProduct(a, b));
            const v = DelaunayGraph.dotProduct(n, point);
            if (v < 0) {
                // point is on the outside edge of the voronoi cell, return false
                return false;
            }
        }
        return true;
    }
}

/**
 * A drawable VoronoiCell.
 */
export class VoronoiTile implements IDrawableTile {
    public vertices: Quaternion[] = [];
    public centroid: Quaternion = Quaternion.ONE;
    public color: string = "red";
    public id: string = "";
}

/**
 * A list of voronoi cells.
 */
export class VoronoiGraph<T extends ICameraState> {
    /**
     * The app containing world scale.
     */
    app: Game;
    /**
     * A list of voronoi cell used for rendering and physics.
     */
    cells: VoronoiCell[] = [];

    /**
     * A list of drawables mapped to voronoi cells to speed up rendering.
     */
    drawableMap: Record<number, Array<T>> = {};

    /**
     * A list of drawable id to drawable map for quick reference.
     */
    drawableSet: Record<string, number> = {};

    constructor(app: Game) {
        this.app = app;
    }

    /**
     * The angular distance between two points.
     * @param a The first point.
     * @param b The second point.
     * @param worldScale The size of the world.
     */
    public static angularDistance(a: [number, number, number], b: [number, number, number], worldScale: number): number {
        return Math.acos(Math.max(-1, Math.min(DelaunayGraph.dotProduct(
            DelaunayGraph.normalize(a),
            DelaunayGraph.normalize(b)
        ), 1))) * worldScale;
    }

    /**
     * The angular distance of a quaternion.
     * @param a A quaternion with a angular rotation.
     * @param worldScale the size of the world.
     */
    public static angularDistanceQuaternion(a: Quaternion, worldScale: number): number {
        return Math.acos(Math.max(-1, Math.min(a.w, 1))) * 2 * worldScale;
    }

    /**
     * Find the closest voronoi cell index to a given position.
     * @param position The position to find.
     * @private
     */
    private findClosestVoronoiCellIndex(position: [number, number, number]): number {
        let closestDistance = Number.MAX_VALUE;
        let closestIndex = -1;
        for (let i = 0; i < this.cells.length; i++) {
            const cellDistance = VoronoiGraph.angularDistance(position, this.cells[i].centroid, this.app.worldScale);
            if (cellDistance < closestDistance) {
                closestIndex = i;
                closestDistance = cellDistance;
            }
        }

        return closestIndex;
    }

    /**
     * Add the drawable to the voronoi cell
     * @param drawable The drawable to add.
     */
    addDrawable(drawable: T) {

        const drawablePosition = drawable.position.rotateVector([0, 0, 1]);
        const closestIndex = this.findClosestVoronoiCellIndex(drawablePosition);
        if (closestIndex >= 0) {
            // if old index is different, remove old index
            const oldIndex: number | undefined = this.drawableSet[drawable.id];
            if (oldIndex !== undefined && closestIndex !== oldIndex) {
                const index = this.drawableMap[oldIndex].findIndex(d => d === drawable);
                this.drawableMap[oldIndex].splice(index, 1);
            }

            // add new mapping
            if (typeof (this.drawableMap[closestIndex]) === "undefined") {
                this.drawableMap[closestIndex] = [];
            }
            this.drawableMap[closestIndex].push(drawable);
            this.drawableSet[drawable.id] = closestIndex;
        }
    }

    /**
     * Fetch the drawables from the voronoi map.
     * @param position
     */
    * fetchDrawables(position: [number, number, number]): Generator<T> {
        const closestCellIndices: number[] = [];
        for (let i = 0; i < this.cells.length; i++) {
            const cell = this.cells[i];
            const cellDistance = Math.acos(DelaunayGraph.dotProduct(
                position,
                cell.centroid
            ));
            if (cellDistance < cell.radius) {
                closestCellIndices.push(i);
            }
        }
        for (const cellIndex of closestCellIndices) {
            if (typeof (this.drawableMap[cellIndex]) !== "undefined") {
                for (const drawable of this.drawableMap[cellIndex]) {
                    yield drawable;
                }
            }
        }
    }

    /**
     * The lloyd's relaxation of one cell.
     * @param cell The cell to compute the centroid of.
     */
    public static centroidOfCell(cell: VoronoiCell): [number, number, number] {
        // create a triangle fan of the polygon
        const triangleFanParameters: Array<{ averagePoint: [number, number, number], area: number }> = [];
        for (let i = 1; i < cell.vertices.length - 1; i++) {
            const a = cell.vertices[0];
            const b = cell.vertices[i];
            const c = cell.vertices[i + 1];

            // compute triangle fan parameters
            const averagePoint = DelaunayGraph.normalize(
                Game.getAveragePoint([cell.vertices[0], cell.vertices[i], cell.vertices[i + 1]])
            );
            const area = DelaunayGraph.distanceFormula(DelaunayGraph.crossProduct(
                DelaunayGraph.subtract(a, b),
                DelaunayGraph.subtract(c, b)
            ), [0, 0, 0]) / 2;
            triangleFanParameters.push({
                averagePoint,
                area
            });
        }

        // compute the centroid from a sum of triangle fan parameters
        let sumAveragePoint: [number, number, number] = [0, 0, 0];
        let sumWeight: number = 0;
        for (const triangleFanParameter of triangleFanParameters) {
            sumAveragePoint = DelaunayGraph.add(
                sumAveragePoint,
                [
                    triangleFanParameter.averagePoint[0] * triangleFanParameter.area,
                    triangleFanParameter.averagePoint[1] * triangleFanParameter.area,
                    triangleFanParameter.averagePoint[2] * triangleFanParameter.area
                ]
            );
            sumWeight += triangleFanParameter.area;
        }

        if (sumWeight === 0) {
            return cell.centroid;
        }
        return DelaunayGraph.normalize([
            sumAveragePoint[0] / sumWeight,
            sumAveragePoint[1] / sumWeight,
            sumAveragePoint[2] / sumWeight
        ]);
    }

    /**
     * Create a list of centered points, which can be used to iteratively improve randomly generated points to
     * create a good random mesh.
     */
    public lloydRelaxation(): Array<[number, number, number]> {
        // for each cell
        let relaxedPoints: Array<[number, number, number]> = [];
        for (const cell of this.cells) {
            // the sum had a division, this is the final result
            if (cell.centroid.some(i => isNaN(i))) {
                throw new Error("Bad cell centroid");
            }
            if (cell.vertices.some(v => v.some(i => isNaN(i)))) {
                throw new Error("Bad cell vertex");
            }
            const point = VoronoiGraph.centroidOfCell(cell);
            if (point.some(i => isNaN(i))) {
                throw new Error("Bad Output Centroid");
            }
            relaxedPoints.push(point);
        }

        // re center points to evenly distribute around the sphere. // skip this since this could be buggy
        for (let step = 0; step < 0; step++) {
            const averagePoint = Game.getAveragePoint(relaxedPoints);
            relaxedPoints = relaxedPoints.map(p => DelaunayGraph.normalize(DelaunayGraph.subtract(p, averagePoint)));
        }
        return relaxedPoints;
    }
}

/**
 * A simple class storing some vertices to render on scene
 */
export class DelaunayTriangle implements ICellData {
    public vertices: [number, number, number][] = [];
    public centroid: [number, number, number] = [0, 0, 0];
}

/**
 * A class used to render a delaunay triangle tile.
 */
export class DelaunayTile implements IDrawableTile {
    public vertices: Quaternion[] = [];
    public centroid: Quaternion = Quaternion.ONE;
    public color: string = "red";
    public id: string = "";
}

interface IPathingGraph {
    vertices: Array<[number, number, number]>;
    edges: [number, number][];
    app: Game;
}

interface IPathingNode<T extends IPathingGraph> {
    id: number;
    instance: T;
    closestVertex: number;
    position: [number, number, number];

    pathToObject(other: IPathingNode<T>): Array<[number, number, number]>;
}

export interface ISerializedPathingNode<T extends IPathingGraph> {
    id: number;
    closestVertex: number;
    position: [number, number, number];
}

export class PathingNode<T extends IPathingGraph> implements IPathingNode<T> {
    public id: number = -1;
    public instance: T;
    public closestVertex: number = -1;
    public position: [number, number, number] = [0, 0, 0];

    constructor(instance: T) {
        this.instance = instance;
    }

    public serialize(): ISerializedPathingNode<any> {
        return {
            id: this.id,
            closestVertex: this.closestVertex,
            position: this.position,
        };
    }

    public deserializeUpdate(data: ISerializedPathingNode<any>) {
        this.id = data.id;
        this.closestVertex = data.closestVertex;
        this.position = data.position;
    }

    public static deserialize<T extends IPathingGraph>(instance: T, data: ISerializedPathingNode<T>): PathingNode<T> {
        const item = new PathingNode<T>(instance);
        item.deserializeUpdate(data);
        return item;
    }

    /**
     * Compute the path to another object on the sphere using the Delaunay graph as an AI pathing graph.
     * @param other
     */
    public pathToObject(other: IPathingNode<T>): Array<[number, number, number]> {
        return [other.position];
    }
}

export class OctreeTriangles<T> {
    nodes: OctreeTriangles<T>[] = [];
    maxDepth = 4;
    depth = 0;
    items: T[] = [];
    indices: Map<T, number> = new Map<T, number>();
    boundingBoxSmallFactor: number = 1;

    constructor(boundingBox: [[number, number, number], [number, number, number]] | null = null, depth: number = 0, indices: Map<T, number> | null = null) {
        if (boundingBox) {
            this.boundingBox = boundingBox;
        }
        this.depth = depth;
        if (indices) {
            this.indices = indices;
        }
    }

    boundingBox: [[number, number, number], [number, number, number]] = [
        [-1.1, -1.1, -1.1],
        [1.1, 1.1, 1.1],
    ];

    getBoundingBox = (points: [number, number, number][]) => {
        const minX = points.map(x => x[0]).reduce((acc, x) => Math.min(x, acc), Infinity);
        const minY = points.map(x => x[1]).reduce((acc, x) => Math.min(x, acc), Infinity);
        const minZ = points.map(x => x[2]).reduce((acc, x) => Math.min(x, acc), Infinity);
        const maxX = points.map(x => x[0]).reduce((acc, x) => Math.max(x, acc), -Infinity);
        const maxY = points.map(x => x[1]).reduce((acc, x) => Math.max(x, acc), -Infinity);
        const maxZ = points.map(x => x[2]).reduce((acc, x) => Math.max(x, acc), -Infinity);
        return [
            [minX, minY, minZ],
            [maxX, maxY, maxZ],
        ] as [[number, number, number], [number, number, number]];
    }

    isBoundingBoxSmall = (bb: [[number, number, number], [number, number, number]]) => {
        const [
            [minX, minY, minZ],
            [maxX, maxY, maxZ],
        ] = bb;

        return (maxX - minX) + (maxY - minY) + (maxZ - minZ) < this.boundingBoxSmallFactor;
    };

    boundingBoxDivisions = () => {
        const [
            [minX, minY, minZ],
            [maxX, maxY, maxZ],
        ] = this.boundingBox;
        const avgX = (this.boundingBox[0][0] + this.boundingBox[1][0]) / 2;
        const avgY = (this.boundingBox[0][1] + this.boundingBox[1][1]) / 2;
        const avgZ = (this.boundingBox[0][2] + this.boundingBox[1][2]) / 2;

        return [
            [
                [minX, minY, minZ],
                [avgX, avgY, avgZ],
            ],
            [
                [avgX, minY, minZ],
                [maxX, avgY, avgZ],
            ],
            [
                [minX, avgY, minZ],
                [avgX, maxY, avgZ],
            ],
            [
                [avgX, avgY, minZ],
                [maxX, maxY, avgZ],
            ],
            [
                [minX, minY, avgZ],
                [avgX, avgY, maxZ],
            ],
            [
                [avgX, minY, avgZ],
                [maxX, avgY, maxZ],
            ],
            [
                [minX, avgY, avgZ],
                [avgX, maxY, maxZ],
            ],
            [
                [avgX, avgY, avgZ],
                [maxX, maxY, maxZ],
            ],
        ] as [[number, number, number], [number, number, number]][];
    }

    containsBoundingBox = (bb: [[number, number, number], [number, number, number]]): boolean => {
        const [
            [minX1, minY1, minZ1],
            [maxX1, maxY1, maxZ1],
        ] = this.boundingBox;
        const [
            [minX2, minY2, minZ2],
            [maxX2, maxY2, maxZ2],
        ] = bb;

        return maxX1 >= minX2 && maxY1 >= minY2 && maxZ1 >= minZ2 && minX1 <= maxX2 && minY1 <= maxY2 && minZ1 <= maxZ2;
    }

    insertTriangle = (a: [number, number, number], b: [number, number, number], c: [number, number, number], item: T, index: number) => {
        const bb = this.getBoundingBox([a, b, c]);
        if (!this.isBoundingBoxSmall(bb)) {
            return;
        }
        if (this.containsBoundingBox(bb)) {
            if (this.depth < this.maxDepth && this.nodes.length === 0) {
                this.nodes.push.apply(this.nodes, this.boundingBoxDivisions().map(bb => new OctreeTriangles(bb, this.depth + 1)));
            }

            const nodeIntersects = this.nodes.filter((n) => n.containsBoundingBox(bb));
            if (nodeIntersects.length >= 8) {
                this.items.push(item);
                this.indices.set(item, index);
                return;
            }
            for (const node of nodeIntersects) {
                node.insertTriangle(a, b, c, item, index);
            }
        }
    }

    insertEdge = (a: [number, number, number], b: [number, number, number], item: T, index: number) => {
        const bb = this.getBoundingBox([a, b]);
        if (!this.isBoundingBoxSmall(bb)) {
            return;
        }
        if (this.containsBoundingBox(bb)) {
            if (this.depth < this.maxDepth && this.nodes.length === 0) {
                this.nodes.push.apply(this.nodes, this.boundingBoxDivisions().map(bb => new OctreeTriangles(bb, this.depth + 1)));
            }

            const nodeIntersects = this.nodes.filter((n) => n.containsBoundingBox(bb));
            if (nodeIntersects.length >= 8) {
                this.items.push(item);
                this.indices.set(item, index);
                return;
            }
            for (const node of nodeIntersects) {
                node.insertEdge(a, b, item, index);
            }
        }
    }

    removeTriangle = (a: [number, number, number], b: [number, number, number], c: [number, number, number], item: T) => {
        const bb = this.getBoundingBox([a, b, c]);
        if (this.containsBoundingBox(bb)) {
            const itemIndex = this.items.indexOf(item);
            if (itemIndex >= 0) {
                this.items.splice(itemIndex, 1);
                const index = this.indices.get(item);
                Array.from(this.indices.entries()).forEach(([t, i]) => {
                    if (i > index) {
                        this.indices.set(t, i - 1);
                    }
                    if (i === index) {
                        this.indices.delete(t);
                    }
                });
                return;
            }
            this.nodes.forEach((n) => n.removeTriangle(a, b, c, item));
        }
    }

    removeEdge = (a: [number, number, number], b: [number, number, number], item: T) => {
        const bb = this.getBoundingBox([a, b]);
        if (this.containsBoundingBox(bb)) {
            const itemIndex = this.items.indexOf(item);
            if (itemIndex >= 0) {
                this.items.splice(itemIndex, 1);
                const index = this.indices.get(item);
                Array.from(this.indices.entries()).forEach(([t, i]) => {
                    if (i > index) {
                        this.indices.set(t, i - 1);
                    }
                    if (i === index) {
                        this.indices.delete(t);
                    }
                });
                return;
            }
            this.nodes.forEach((n) => n.removeEdge(a, b, item));
        }
    }

    getItemsAtPoint = (p: [number, number, number], items: Map<T, number> = new Map<T, number>()): Map<T, number> => {
        const bb = this.getBoundingBox([p]);
        if (this.containsBoundingBox(bb)) {
            const nodes = this.nodes.filter(n => n.containsBoundingBox(bb));
            if (nodes.length) {
                return new Map<T, number>([...items.entries(), ...nodes.reduce((acc, n) => [...acc, ...n.getItemsAtPoint(p, items)], [])]);
            }
            return new Map<T, number>(this.items.map(t => [t, this.indices.get(t)!]));
        }
        return new Map<T, number>();
    }
}

/**
 * A delaunay graph for procedural generation, automatic random landscapes.
 */
export class DelaunayGraph<T extends ICameraState> implements IPathingGraph {
    /**
     * Reference to the app containing the delaunay graph.
     */
    public app: Game;
    /**
     * The vertices of the graph.
     */
    public vertices: [number, number, number][] = [];
    /**
     * The edges of the graph.
     */
    public edges: [number, number][] = [];
    /**
     * The triangles of the graph.
     */
    public triangles: number[][] = [];

    /**
     * Triangle Octree for speed performance.
     */
    public triangleOctree: OctreeTriangles<number[]> = new OctreeTriangles<number[]>();

    /**
     * Edge Octree for speed performance.
     */
    public edgeOctree: OctreeTriangles<[number, number]> = new OctreeTriangles<[number, number]>();

    /**
     * Insert triangle helper function.
     * @param triangle
     * @param index
     */
    private insertTriangleOctree = (triangle: number[], index: number) => {
        const a = this.vertices[this.edges[triangle[0]][0]];
        const b = this.vertices[this.edges[triangle[1]][0]];
        const c = this.vertices[this.edges[triangle[2]][0]];
        this.triangleOctree.insertTriangle(a, b, c, triangle, index);
    }

    /**
     * Insert edge helper function.
     * @param edge
     * @param index
     */
    private insertEdgeOctree = (edge: [number, number], index: number) => {
        const a = this.vertices[edge[0]];
        const b = this.vertices[edge[1]];
        this.triangleOctree.insertEdge(a, b, edge, index);
    }

    /**
     * Remove triangle helper function.
     * @param triangle
     */
    private removeTriangleOctree = (triangle: number[]) => {
        const a = this.vertices[this.edges[triangle[0]][0]];
        const b = this.vertices[this.edges[triangle[1]][0]];
        const c = this.vertices[this.edges[triangle[2]][0]];
        this.triangleOctree.removeTriangle(a, b, c, triangle);
    }

    /**
     * Remove edge helper function.
     * @param edge
     */
    private removeEdgeOctree = (edge: [number, number]) => {
        const a = this.vertices[edge[0]];
        const b = this.vertices[edge[1]];
        this.triangleOctree.removeEdge(a, b, edge);
    }

    /**
     * A list of nodes such as planet to help AI travel around the map.
     */
    public pathingNodes: Record<number, PathingNode<DelaunayGraph<T>>> = {};

    constructor(app: Game) {
        this.app = app;
    }

    /**
     * Find the closest vertex index to a given position.
     * @param position The position to find.
     * @private
     */
    private findClosestVertexIndex(position: [number, number, number]): number {
        let closestDistance = Number.MAX_VALUE;
        let closestIndex = -1;
        for (let i = 0; i < this.vertices.length; i++) {
            const cellDistance = VoronoiGraph.angularDistance(position, this.vertices[i], this.app.worldScale);
            if (cellDistance < closestDistance) {
                closestIndex = i;
                closestDistance = cellDistance;
            }
        }

        return closestIndex;
    }

    private nextPathingNodeId: number = 0;

    public createPathingNode(position: [number, number, number]) {
        const closestVertex = this.findClosestVertexIndex(position);
        const pathingNode = new PathingNode<DelaunayGraph<T>>(this);
        pathingNode.id = this.nextPathingNodeId++;
        pathingNode.instance = this;
        pathingNode.closestVertex = closestVertex;
        pathingNode.position = position;
        this.pathingNodes[pathingNode.id] = pathingNode;
        return pathingNode;
    }

    /**
     * FInd the closest pathing node to a position, used to begin path finding algorithm.
     * @param position The position to find a nearby pathing node.
     */
    public findClosestPathingNode(position: [number, number, number]): PathingNode<DelaunayGraph<T>> {
        let closestDistance = Number.MAX_VALUE;
        let closestPathingNode: PathingNode<DelaunayGraph<T>> | null = null;
        const pathingNodes = Object.values(this.pathingNodes);
        for (const pathingNode of pathingNodes) {
            const cellDistance = VoronoiGraph.angularDistance(position, pathingNode.position, this.app.worldScale);
            if (cellDistance < closestDistance) {
                closestPathingNode = pathingNode;
                closestDistance = cellDistance;
            }
        }

        if (closestPathingNode === null) {
            throw new Error("Could not find closest pathing node for path finding");
        }

        return closestPathingNode;
    }

    public getTetrahedronPoints(): Array<[number, number, number]> {
        const north: [number, number, number] = DelaunayGraph.normalize([0, 0, 1]);

        const tetrahedronAngle = 120 / 180 * Math.PI;
        const base1: [number, number, number] = DelaunayGraph.normalize([
            Math.cos(0) * Math.sin(tetrahedronAngle),
            Math.sin(0) * Math.sin(tetrahedronAngle),
            Math.cos(tetrahedronAngle)
        ]);
        const base2: [number, number, number] = DelaunayGraph.normalize([
            Math.cos(tetrahedronAngle) * Math.sin(tetrahedronAngle),
            Math.sin(tetrahedronAngle) * Math.sin(tetrahedronAngle),
            Math.cos(tetrahedronAngle)
        ]);
        const base3: [number, number, number] = DelaunayGraph.normalize([
            Math.cos(2 * tetrahedronAngle) * Math.sin(tetrahedronAngle),
            Math.sin(2 * tetrahedronAngle) * Math.sin(tetrahedronAngle),
            Math.cos(2 * tetrahedronAngle)
        ]);

        return [north, base1, base2, base3];
    }

    /**
     * Initialize a basic graph, ready for incremental construction.
     */
    public initialize() {
        const [north, base1, base2, base3] = this.getTetrahedronPoints();
        this.vertices.push(north);
        this.vertices.push(base1, base2, base3);

        this.edges.push([0, 1], [1, 2], [2, 0]);
        this.edges.push([0, 2], [2, 3], [3, 0]);
        this.edges.push([0, 3], [3, 1], [1, 0]);
        this.edges.push([1, 2], [2, 3], [3, 1]);

        this.triangles.push([0, 1, 2]);
        this.triangles.push([3, 4, 5]);
        this.triangles.push([6, 7, 8]);
        this.triangles.push([9, 10, 11]);

        this.edges.forEach(this.insertEdgeOctree);
        this.triangles.forEach(this.insertTriangleOctree);
    }

    public initializeWithPoints(points: Array<[number, number, number]>) {
        if (points.length < 4) {
            this.initialize();
            return;
        }

        // initialize sphere
        this.initialize();

        // match vertices to the original point tetrahedron
        const pointPairs: number[] = [];
        const sortedTempPointPairs: Array<{index: number, value: number, distance: number}> = [];
        for (let i = 0; i < points.length; i++) {
            const point = points[i];

            for (let j = 0; j < this.vertices.length; j++) {
                const distance = VoronoiGraph.angularDistance(point, this.vertices[j], 1);
                if (distance < Math.PI) {
                    sortedTempPointPairs.push({
                        index: i,
                        value: j,
                        distance
                    });
                }
            }
        }
        sortedTempPointPairs.sort((a, b) => a.distance - b.distance);
        for (const { index, value } of sortedTempPointPairs) {
            let allFilled = true;
            for (let i = 0; i < 4; i++) {
                if (pointPairs[i] === undefined) {
                    allFilled = false;
                }
            }
            if (allFilled) {
                break;
            }
            if (pointPairs[value] === undefined || !pointPairs.includes(index))
                pointPairs[value] = index;
        }
        for (let i = 0; i < 4; i++) {
            if (pointPairs[i] === undefined) {
                throw new Error("Could not initialize sphere delaunay");
            }
        }

        // perform initialization using data points
        for (let i = 0; i < points.length; i++) {
            const point = points[i];

            if (pointPairs.includes(i)) {
                // for first four points replace original triangular pyramid
                this.vertices[pointPairs.indexOf(i)] = [...point];
            } else {
                // after first four points, perform regular insertion
                this.incrementalInsert(point);
            }
        }
    }

    public static randomInt(): number {
        return (Math.random() * 2) - 1;
    }

    public seedRandomInt(): number {
        return (this.app.seedRandom.double() * 2) - 1;
    }

    public static randomPoint(): [number, number, number] {
        // generate random vertex
        const vertex: [number, number, number] = [DelaunayGraph.randomInt(), DelaunayGraph.randomInt(), DelaunayGraph.randomInt()];
        return DelaunayGraph.normalize(vertex);
    }

    public seedRandomPoint(): [number, number, number] {
        // generate random vertex
        const vertex: [number, number, number] = [this.seedRandomInt(), this.seedRandomInt(), this.seedRandomInt()];
        return DelaunayGraph.normalize(vertex);
    }

    public static distanceFormula(a: [number, number, number], b: [number, number, number]): number {
        return Math.sqrt(Math.pow(b[0] - a[0], 2) + Math.pow(b[1] - a[1], 2) + Math.pow(b[2] - a[2], 2));
    }

    public static normalize(a: [number, number, number]): [number, number, number] {
        const vertexLength = DelaunayGraph.distanceFormula(a, [0, 0, 0]);
        return [
            a[0] / vertexLength,
            a[1] / vertexLength,
            a[2] / vertexLength,
        ];
    }

    /**
     * Compute the cross product of two vectors. Used to compute the normal of two vectors.
     * @param a The first vector.
     * @param b The second vector.
     */
    public static crossProduct(a: [number, number, number], b: [number, number, number]): [number, number, number] {
        return [
            a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0],
        ];
    }

    /**
     * Compute the subtraction of two vectors.
     * @param a The first vector.
     * @param b The second vector.
     */
    public static subtract(a: [number, number, number], b: [number, number, number]): [number, number, number] {
        return [
            a[0] - b[0],
            a[1] - b[1],
            a[2] - b[2],
        ];
    }

    /**
     * Compute the addition of two vectors.
     * @param a The first vector.
     * @param b The second vector.
     */
    public static add(a: [number, number, number], b: [number, number, number]): [number, number, number] {
        return [
            a[0] + b[0],
            a[1] + b[1],
            a[2] + b[2],
        ];
    }

    /**
     * Compute the cross product of two vectors.
     * @param a The first vector.
     * @param b The second vector.
     */
    public static dotProduct(a: [number, number, number], b: [number, number, number]): number {
        return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    }

    /**
     * Return the triangle index of the triangle intersection.
     * @param vertex The vertex to check for triangle intersection.
     * @private
     */
    private findTriangleIntersection(vertex: [number, number, number]): number {
        const validateTriangleIntersection = (triangle: number[]) => {
            // for each edge of a spherical triangle
            for (const edgeIndex of triangle) {
                // compute half plane of edge
                const startIndex = this.edges[edgeIndex][0];
                const endIndex = this.edges[edgeIndex][1];
                const start = this.vertices[startIndex];
                const end = this.vertices[endIndex];
                const normal = DelaunayGraph.normalize(DelaunayGraph.crossProduct(start, end));
                if (start.some(i => isNaN(i)) || end.some(i => isNaN(i))) {
                    throw new Error("Found bad vertex");
                }
                if (normal.some(i => isNaN(i))) {
                    return false;
                }
                // check to see if point is on the correct side of the half plane
                if (vertex[0] * normal[0] + vertex[1] * normal[1] + vertex[2] * normal[2] < 0) {
                    // incorrect side, return false, try next triangle
                    return false;
                }
            }
            // return true, the point is inside the correct side of all edges of the triangle
            // safe to assume the point is inside the triangle
            return true;
        };
        const shortcutTriangleMap = this.triangleOctree.getItemsAtPoint(vertex);
        const triangle = Array.from(shortcutTriangleMap.entries()).find(([v, i]) => validateTriangleIntersection(v));
        if (triangle) {
            return triangle[1];
        }
        return this.triangles.findIndex(validateTriangleIntersection);
    }

    /**
     * Build the initial triangle mesh for the newly inserted vertex.
     * @param vertex The vertex that was inserted into the triangle at triangle index.
     * @param triangleIndex The triangle to insert vertex into.
     * @private
     */
    private buildInitialTriangleMeshForNewVertex(vertex: [number, number, number], triangleIndex: number) {
        if (vertex.some(i => isNaN(i))) {
            throw new Error("Stopped insertion of bad vertex");
        }
        this.vertices.push(vertex);
        const threeEdgeIndices = this.triangles[triangleIndex];
        const threeVertexIndices = threeEdgeIndices.map((edgeIndex: number): number => {
            // get vertex index
            return this.edges[edgeIndex][0];
        });
        this.edges.push([this.vertices.length - 1, threeVertexIndices[0]], [threeVertexIndices[1], this.vertices.length - 1]);
        this.edges.push([this.vertices.length - 1, threeVertexIndices[1]], [threeVertexIndices[2], this.vertices.length - 1]);
        this.edges.push([this.vertices.length - 1, threeVertexIndices[2]], [threeVertexIndices[0], this.vertices.length - 1]);
        this.edges.map((v, i) => [v, i]).slice(-3).forEach(([v, i]: [[number, number], number]) => this.insertEdgeOctree(v, i));
        this.triangles.splice(triangleIndex, 1);
        this.removeTriangleOctree(this.triangles[triangleIndex]);
        this.triangles.push([threeEdgeIndices[0], this.edges.length - 7 + 2, this.edges.length - 7 + 1]);
        this.triangles.push([threeEdgeIndices[1], this.edges.length - 7 + 4, this.edges.length - 7 + 3]);
        this.triangles.push([threeEdgeIndices[2], this.edges.length - 7 + 6, this.edges.length - 7 + 5]);
        this.triangles.map((v, i) => [v, i]).slice(-3).forEach(([v, i]: [number[], number]) => this.insertTriangleOctree(v, i));
    }

    /**
     * Get the circumcircle of the 3 points on a sphere.
     * @param a
     * @param b
     * @param c
     */
    public getCircumcircleParameters(a: [number, number, number], b: [number, number, number], c: [number, number, number]): {
        center: [number, number, number],
        radius: number
    } | null {
        const computeCenterMaths: Array<() => [number, number, number]> = [() => {
            const v1 = DelaunayGraph.subtract(b, a);
            const v2 = DelaunayGraph.subtract(c, a);
            return DelaunayGraph.normalize(DelaunayGraph.crossProduct(
                v1,
                v2
            ));
        }, () => {
            const v1 = DelaunayGraph.subtract(c, b);
            const v2 = DelaunayGraph.subtract(a, b);
            return DelaunayGraph.normalize(DelaunayGraph.crossProduct(
                v1,
                v2
            ));
        }, () => {
            const v1 = DelaunayGraph.subtract(a, c);
            const v2 = DelaunayGraph.subtract(b, c);
            return DelaunayGraph.normalize(DelaunayGraph.crossProduct(
                v1,
                v2
            ));
        }]
        for (const math of computeCenterMaths) {
            const center = math();
            if (center.some(i => isNaN(i))) {
                // skip insertion if normal is NaN.
                continue;
            }
            const radius = VoronoiGraph.angularDistance(center, a, 1);
            const rb = VoronoiGraph.angularDistance(center, b, 1);
            const rc = VoronoiGraph.angularDistance(center, c, 1);
            if (Math.abs(rb - radius) < 0.000001 && Math.abs(rc - radius) < 0.000001) {
                return {
                    center,
                    radius,
                };
            }
        }
        return null;
    }

    private collinearWithSomething(vertex: [number, number, number]) {
        const triangleIndex = this.findTriangleIntersection(vertex);
        if (triangleIndex < 0) {
            const randomTriangleIndex = Math.floor(this.triangles.length * this.app.seedRandom.double());
            const triangle = this.triangles[randomTriangleIndex];
            if (!triangle) {
                return true;
            }
            const triangleVertices = triangle.map(edgeIndex => this.vertices[this.edges[edgeIndex][0]]);
            const area = DelaunayGraph.distanceFormula(DelaunayGraph.crossProduct(
                DelaunayGraph.normalize(DelaunayGraph.subtract(triangleVertices[0], triangleVertices[1])),
                DelaunayGraph.normalize(DelaunayGraph.subtract(triangleVertices[2], triangleVertices[1]))
            ), [0, 0, 0]) / 2;
            return area < 0.000001;
        } else {
            const triangle = this.triangles[triangleIndex];
            if (!triangle) {
                return true;
            }
            const triangleVertices = triangle.map(edgeIndex => this.vertices[this.edges[edgeIndex][0]]);
            const area = DelaunayGraph.distanceFormula(DelaunayGraph.crossProduct(
                DelaunayGraph.normalize(DelaunayGraph.subtract(triangleVertices[0], triangleVertices[1])),
                DelaunayGraph.normalize(DelaunayGraph.subtract(triangleVertices[2], triangleVertices[1]))
            ), [0, 0, 0]) / 2;
            return area < 0.000001;
        }
    }

    /**
     * Perform an incremental insert into the delaunay graph, add random data points and maintain the triangle mesh.
     * @param point An optional point to insert into the delaunay graph. If no point is supplied, a random point will
     * be generated.
     * @param step The number of steps executed so far.
     * @param skipCollinear Should skip collinear check
     */
    public incrementalInsert(point?: [number, number, number], step: number = 0, skipCollinear = false) {
        // the max step
        if (step >= 3) {
            return;
        }

        let vertex: [number, number, number];
        let triangleIndex: number = -1;
        if (point) {
            vertex = point;
        } else {
            vertex = this.seedRandomPoint();
        }
        if (!skipCollinear && this.collinearWithSomething(vertex)) {
            return this.incrementalInsert(undefined, step + 1);
        }

        // find triangle index
        for (let i = 0; i < 100; i++) {
            triangleIndex = this.findTriangleIntersection(vertex);
            if (triangleIndex < 0) {
                const randomTriangleIndex = Math.floor(this.triangles.length * this.app.seedRandom.double());
                const triangle = this.triangles[randomTriangleIndex];
                if (!triangle) {
                    return this.incrementalInsert(undefined, step + 1);
                }
                const triangleVertices = triangle.map(edgeIndex => this.vertices[this.edges[edgeIndex][0]]);
                vertex = DelaunayGraph.normalize(Game.getAveragePoint(triangleVertices));
            } else {
                break;
            }
        }
        if (triangleIndex < 0) {
            return this.incrementalInsert(undefined, step + 1);
        }

        // add triangle incrementally
        // this.buildInitialTriangleMeshForNewVertex(vertex, triangleIndex);

        // perform bowyer watson to balance triangles
        this.bowyerWatsonInsertion(vertex)
    }

    private validateTriangles() {
        for (const triangle of this.triangles) {
            if (Array.from(new Set(triangle.reduce((acc, edgeIndex) => [...acc, ...this.edges[edgeIndex]], [] as number[]))).length !== 3) {
                throw new Error("BAD TRIANGLE FOUND");
            }
        }
    }

    /**
     * A Delaunay triangulation balancing scheme where bad triangles are replaced with good triangles.
     * @param vertex The new vertex to insert.
     * @private
     */
    private deleteVertex(vertex: [number, number, number]) {
        // the new vertex index
        const newVertexIndex = this.vertices.findIndex(x => x[0] === vertex[0] && x[1] === vertex[1] && x[2] === vertex[2]);

        // find bad triangles and good edges of bad triangles
        let badTriangleIndices: number[] = [];
        const goodEdgeIndicesOfBadTriangles: number[] = [];
        const badEdgeIndicesOfBadTriangles: number[] = [];
        for (let triangleIndex = 0; triangleIndex < this.triangles.length; triangleIndex++) {
            // find bad triangle
            const testTriangleVertices: Array<[number, number, number]> = this.triangles[triangleIndex].map(testEdgeIndex => {
                return this.vertices[this.edges[testEdgeIndex][0]];
            });
            const circumcircle = this.getCircumcircleParameters(testTriangleVertices[0], testTriangleVertices[1], testTriangleVertices[2]);
            if (circumcircle && VoronoiGraph.angularDistance(circumcircle.center, vertex, 1) < circumcircle.radius) {
                badTriangleIndices.push(triangleIndex);
            }
        }
        // find good edges
        for (const triangleIndex of badTriangleIndices) {
            // find good edges of bad triangles
            for (const edgeIndex of this.triangles[triangleIndex]) {
                const edge = this.edges[edgeIndex];
                // find opposite edge
                const validateEdgeComplement = (testEdge: [number, number]) => {
                    return testEdge[0] === edge[1] && testEdge[1] === edge[0];
                };
                const shortcutEdgeMap = this.edgeOctree.getItemsAtPoint(vertex);
                const edgeComplement = Array.from(shortcutEdgeMap.entries()).find(([v, i]: [[number, number], number]) => validateEdgeComplement(v));
                const complementOfBadTriangleEdgeIndex = edgeComplement ? edgeComplement[1] : this.edges.findIndex(validateEdgeComplement);
                if (complementOfBadTriangleEdgeIndex >= 0) {
                    // find if opposite edge is not in any bad triangles
                    const isInsideGoodTriangle = badTriangleIndices.every(badTriangleIndex => {
                        // for each bad triangle, complement edge is not in bad triangle
                        return !this.triangles[badTriangleIndex].includes(complementOfBadTriangleEdgeIndex);
                    });
                    if (isInsideGoodTriangle) {
                        // add good edge
                        goodEdgeIndicesOfBadTriangles.push(edgeIndex);
                    } else {
                        badEdgeIndicesOfBadTriangles.push(edgeIndex);
                    }
                }
            }
        }

        // create good triangles
        const verticesToDupe = [];
        for (const edgeIndex of goodEdgeIndicesOfBadTriangles) {
            verticesToDupe.push(this.vertices[this.edges[edgeIndex][0]]);
        }
        const dupeDelaunay = new DelaunayGraph(this.app);
        dupeDelaunay.initializeWithPoints(verticesToDupe);
        const dupeIndex = [];
        for (const v of dupeDelaunay.vertices.slice(4)) {
            const index = this.vertices.findIndex(x => x[0] == v[0] && x[1] === v[1] && x[2] == v[2]);
            if (index >= 0) {
                dupeIndex.push([index, index]);
            } else {
                this.vertices.push(v);
                dupeIndex.push([index, this.vertices.length - 1]);
            }
        }
        const dupeEdges = [];
        for (const [v1, v2] of dupeDelaunay.edges.slice(12)) {
            const index = this.edges.findIndex(x => x[0] === v1 && x[1] === v2);
            if (index >= 0) {
                dupeEdges.push([index, index]);
            } else {
                this.edges.push([dupeIndex.find(y => y[0] === v1)[1], dupeIndex.find(y => y[1] === v2)[1]] as [number, number]);
                dupeIndex.push([index, this.edges.length - 1]);
            }
        }
        for (const [a, b, c] of dupeDelaunay.triangles.slice(4)) {
            const index = this.triangles.findIndex(x => x[0] === a && x[1] === b && x[2] === c);
            if (index < 0) {
                this.triangles.push([dupeIndex.find(y => y[0] === a)[1], dupeIndex.find(y => y[1] === b)[1], dupeIndex.find(y => y[2] === c)[2]] as [number, number, number]);
            }
        }

        // delete bad triangles
        badTriangleIndices = badTriangleIndices.sort((a, b) => b - a);
        for (const triangleIndex of badTriangleIndices) {
            this.triangles.splice(triangleIndex, 1);
            this.validateTriangles();
        }

        // delete bad triangle edges
        badEdgeIndicesOfBadTriangles.sort((a, b) => b - a);
        for (const edgeIndex of badEdgeIndicesOfBadTriangles) {
            for (let triangleIndex = 0; triangleIndex < this.triangles.length; triangleIndex++) {
                for (let i = 0; i < this.triangles[triangleIndex].length; i++) {
                    if (this.triangles[triangleIndex][i] > edgeIndex) {
                        this.triangles[triangleIndex][i] -= 1;
                    }
                }
            }
            this.edges.splice(edgeIndex, 1);
            this.validateTriangles();
        }
    }

    /**
     * A Delaunay triangulation balancing scheme where bad triangles are replaced with good triangles.
     * @param vertex The new vertex to insert.
     * @private
     */
    private bowyerWatsonInsertion(vertex: [number, number, number]) {
        // the new vertex index
        this.vertices.push(vertex);
        const newVertexIndex = this.vertices.length - 1;

        // find bad triangles and good edges of bad triangles
        let badTriangleIndices: number[] = [];
        const goodEdgeIndicesOfBadTriangles: number[] = [];
        const badEdgeIndicesOfBadTriangles: number[] = [];
        for (let triangleIndex = 0; triangleIndex < this.triangles.length; triangleIndex++) {
            // find bad triangle
            const testTriangleVertices: Array<[number, number, number]> = this.triangles[triangleIndex].map(testEdgeIndex => {
                return this.vertices[this.edges[testEdgeIndex][0]];
            });
            const circumcircle = this.getCircumcircleParameters(testTriangleVertices[0], testTriangleVertices[1], testTriangleVertices[2]);
            if (circumcircle && VoronoiGraph.angularDistance(circumcircle.center, vertex, 1) < circumcircle.radius) {
                badTriangleIndices.push(triangleIndex);
            }
        }
        // find good edges
        for (const triangleIndex of badTriangleIndices) {
            // find good edges of bad triangles
            for (const edgeIndex of this.triangles[triangleIndex]) {
                const edge = this.edges[edgeIndex];
                // find opposite edge
                const complementOfBadTriangleEdgeIndex = this.edges.findIndex((testEdge) => {
                    return testEdge[0] === edge[1] && testEdge[1] === edge[0];
                });
                if (complementOfBadTriangleEdgeIndex >= 0) {
                    // find if opposite edge is not in any bad triangles
                    const isInsideGoodTriangle = badTriangleIndices.every(badTriangleIndex => {
                        // for each bad triangle, complement edge is not in bad triangle
                        return !this.triangles[badTriangleIndex].includes(complementOfBadTriangleEdgeIndex);
                    });
                    if (isInsideGoodTriangle) {
                        // add good edge
                        goodEdgeIndicesOfBadTriangles.push(edgeIndex);
                    } else {
                        badEdgeIndicesOfBadTriangles.push(edgeIndex);
                    }
                }
            }
        }

        // create good triangles
        for (const edgeIndex of goodEdgeIndicesOfBadTriangles) {
            // get points
            const aIndex = this.edges[edgeIndex][0];
            const bIndex = this.edges[edgeIndex][1];

            // create edge and triangle
            this.edges.push([bIndex, newVertexIndex], [newVertexIndex, aIndex]);
            const triangle = [
                edgeIndex,
                this.edges.length - 2,
                this.edges.length - 1,
            ];
            this.triangles.push(triangle);

            // validate triangle
            let isOrientedCorrectly: boolean = true;
            if (this.edges[triangle[0]][1] !== this.edges[triangle[1]][0]) {
                isOrientedCorrectly = false;
            }
            if (this.edges[triangle[1]][1] !== this.edges[triangle[2]][0]) {
                isOrientedCorrectly = false;
            }
            if (this.edges[triangle[2]][1] !== this.edges[triangle[0]][0]) {
                isOrientedCorrectly = false;
            }
            if (Array.from(new Set(triangle.reduce((acc, edgeIndex) => [...acc, ...this.edges[edgeIndex]], [] as number[]))).length !== 3) {
                isOrientedCorrectly = false;
            }
            const vertices = triangle.map(edgeIndex => this.vertices[this.edges[edgeIndex][0]]);
            if (
                DelaunayGraph.dotProduct(DelaunayGraph.crossProduct(
                    DelaunayGraph.subtract(vertices[1], vertices[0]),
                    DelaunayGraph.subtract(vertices[2], vertices[0])
                ), DelaunayGraph.normalize(Game.getAveragePoint(vertices))) < 0
            ) {
                this.triangles[this.triangles.length - 1] = [
                    triangle[0],
                    triangle[2],
                    triangle[1]
                ];
            }
            if (!isOrientedCorrectly) {
                throw new Error("Newly created triangle not oriented correctly");
            }
            this.validateTriangles();
        }

        // delete bad triangles
        badTriangleIndices = badTriangleIndices.sort((a, b) => b - a);
        for (const triangleIndex of badTriangleIndices) {
            this.triangles.splice(triangleIndex, 1);
            this.validateTriangles();
        }

        // delete bad triangle edges
        badEdgeIndicesOfBadTriangles.sort((a, b) => b - a);
        for (const edgeIndex of badEdgeIndicesOfBadTriangles) {
            for (let triangleIndex = 0; triangleIndex < this.triangles.length; triangleIndex++) {
                for (let i = 0; i < this.triangles[triangleIndex].length; i++) {
                    if (this.triangles[triangleIndex][i] > edgeIndex) {
                        this.triangles[triangleIndex][i] -= 1;
                    }
                }
            }
            this.edges.splice(edgeIndex, 1);
            this.validateTriangles();
        }
    }

    /**
     * Get the data from the graph, most likely for rendering.
     * @constructor
     */
    public* GetTriangles(): Generator<DelaunayTriangle> {
        for (let triangleIndex = 0; triangleIndex < this.triangles.length; triangleIndex++) {
            const triangle = this.triangles[triangleIndex];
            const data = new DelaunayTriangle();
            for (let edgeIndex = 0; edgeIndex < triangle.length; edgeIndex++) {
                const edge = this.edges[triangle[edgeIndex]];
                const vertex = this.vertices[edge[0]];
                data.vertices.push(vertex);
            }
            data.centroid = DelaunayGraph.normalize(Game.getAveragePoint(data.vertices));
            yield data;
        }
    }

    // create new triangles to keep a constant number of points of a delaunay graph.
    public numRealVertices(): number {
        return this.getRealVertices().length;
    }
    public getRealVertices(): Array<[number, number, number]> {
        if (this.vertices.length > 100) {
            return this.vertices;
        }
        const realVertexIndices: number[] = [];
        for (let triangleIndex = 0; triangleIndex < this.triangles.length; triangleIndex++) {
            const triangle = this.triangles[triangleIndex];
            for (let edgeIndex = 0; edgeIndex < triangle.length; edgeIndex++) {
                const edge = this.edges[triangle[edgeIndex]];
                const vertexIndex = edge[0];
                if (!realVertexIndices.includes(vertexIndex)) {
                    realVertexIndices.push(vertexIndex);
                }
            }
        }
        return realVertexIndices.sort((a, b) => a - b).map((i) => this.vertices[i]);
    }

    public getVoronoiGraph(): VoronoiGraph<T> {
        const graph = new VoronoiGraph<T>(this.app);

        // for each triangle, find neighboring triangle
        for (let vertexIndex = 0; vertexIndex < this.vertices.length; vertexIndex++) {
            // find edges which connect to the vertex
            let points: Array<[number, number, number]> = [];
            let edges: Array<{
                thetaAngle: number,
                a: [number, number, number],
                b: [number, number, number],
                vertex: [number, number, number],
                neighborIndex: number,
            }> = [];

            // build edge data for algebra
            for (let edgeIndex = 0; edgeIndex < this.edges.length; edgeIndex++) {
                const edge = this.edges[edgeIndex];
                const aIndex = edge[0];
                const bIndex = edge[1];
                // skip edges which do not match the voronoi cell vertex/center
                // we want edges starting at the vertex and leaving it
                if (!(aIndex === vertexIndex && bIndex !== vertexIndex && aIndex !== bIndex)) {
                    continue;
                }

                // get point
                const aVertex = this.vertices[aIndex];
                const bVertex = this.vertices[bIndex];

                // compute the theta angle to orient the edges counter clockwise
                const polarRotation = Quaternion.fromBetweenVectors([0, 0, 1], aVertex);
                const delta = DelaunayGraph.subtract(
                    polarRotation.inverse().mul(Quaternion.fromBetweenVectors([0, 0, 1], bVertex)).rotateVector([0, 0, 1]),
                    polarRotation.inverse().mul(Quaternion.fromBetweenVectors([0, 0, 1], aVertex)).rotateVector([0, 0, 1])
                );
                const thetaAngle = Math.atan2(delta[1], delta[0]);

                // compute the half plane to construct the dual graph, delaunay triangulation -> voronoi tessellation.
                const averagePoint = DelaunayGraph.normalize(Game.getAveragePoint([aVertex, bVertex]));
                const rotation = Quaternion.fromAxisAngle(averagePoint, Math.PI / 2);
                const a = rotation.rotateVector(aVertex);
                const b = rotation.rotateVector(bVertex);
                if (a.some(i => isNaN(i))) {
                    throw new Error("a is Invalid");
                }
                if (b.some(i => isNaN(i))) {
                    throw new Error("b is Invalid");
                }
                if (
                    edges.every(edge => edge.thetaAngle !== thetaAngle && DelaunayGraph.distanceFormula(edge.b, b) > 0.000001) &&
                    DelaunayGraph.distanceFormula(a, b) > 0.000001
                ) {
                    edges.push({
                        a,
                        b,
                        thetaAngle,
                        vertex: bVertex,
                        neighborIndex: bIndex,
                    });
                }
            }

            if (edges.length >= 3) {
                // sort counter clockwise, ascending order.
                edges = edges.sort((a, b) => a.thetaAngle - b.thetaAngle);

                // for each edge, compute a point of the voronoi cell
                for (let i = 0; i < edges.length; i++) {
                    // get counter clockwise edge pair
                    const firstEdge = edges[i % edges.length];
                    const secondEdge = edges[(i + 1) % edges.length];

                    if (firstEdge.a.some(i => isNaN(i))) {
                        throw new Error("firstEdge.a is invalid");
                    }
                    if (firstEdge.b.some(i => isNaN(i))) {
                        throw new Error("firstEdge.b is invalid");
                    }
                    if (secondEdge.a.some(i => isNaN(i))) {
                        throw new Error("secondEdge.a is invalid");
                    }
                    if (secondEdge.b.some(i => isNaN(i))) {
                        throw new Error("secondEdge.b is invalid");
                    }

                    // compute intersection point
                    const firstNormal = DelaunayGraph.normalize(
                        DelaunayGraph.crossProduct(firstEdge.a, firstEdge.b)
                    );
                    if (firstNormal.some(i => isNaN(i))) {
                        throw new Error("firstNormal is invalid");
                    }
                    const secondNormal = DelaunayGraph.normalize(
                        DelaunayGraph.crossProduct(secondEdge.a, secondEdge.b)
                    );
                    if (secondNormal.some(i => isNaN(i))) {
                        throw new Error("secondNormal is invalid");
                    }
                    const line = DelaunayGraph.normalize(
                        DelaunayGraph.crossProduct(firstNormal, secondNormal)
                    );
                    if (line.some(i => isNaN(i))) {
                        throw new Error("line is invalid");
                    }
                    const point1 = line;
                    const point2: [number, number, number] = [-line[0], -line[1], -line[2]];
                    if (DelaunayGraph.dotProduct(firstEdge.a, point1) > 0) {
                        points.push(point1);
                    } else {
                        points.push(point2);
                    }
                }

                // reduce duplicate points
                points = points.reduce((acc, p) => {
                    if (!acc.some(v => DelaunayGraph.distanceFormula(v, p) < 0.000001)) {
                        return [...acc, p];
                    } else {
                        return acc;
                    }
                }, [] as Array<[number, number, number]>);

                // sort points counter clockwise
                const averagePoint = DelaunayGraph.normalize(Game.getAveragePoint(points));
                const averageTransform = Quaternion.fromBetweenVectors([0, 0, 1], averagePoint).inverse();
                const sortedPoints = points.sort((a, b): number => {
                    const aPoint = averageTransform.rotateVector(a);
                    const bPoint = averageTransform.rotateVector(b);
                    const aTheta = Math.atan2(aPoint[1], aPoint[0]);
                    const bTheta = Math.atan2(bPoint[1], bPoint[0]);
                    return aTheta - bTheta;
                });

                // validate data
                if (points.some(point => point.some(i => isNaN(i)))) {
                    throw new Error("Some point is invalid");
                }
                if (averagePoint.some(i => isNaN(i))) {
                    throw new Error("Average Point is Invalid");
                }

                // create voronoi cell
                const cell = new VoronoiCell();
                cell.vertices.push(...sortedPoints);
                cell.centroid = averagePoint;
                cell.vertex = this.vertices[vertexIndex];
                cell.radius = cell.vertices.reduce((acc: number, vertex): number => {
                    return Math.max(
                        acc,
                        VoronoiGraph.angularDistance(
                            cell.centroid,
                            vertex,
                            this.app.worldScale
                        )
                    );
                }, 0);
                cell.neighborIndices = edges.map(e => e.neighborIndex);
                graph.cells.push(cell);
            }
        }

        // return graph data
        return graph;
    }
}

export interface ISerializedPathFinder {
    points: Array<[number, number, number]>;
    lastStepShouldRotate: boolean;
}

/**
 * Allows the AI ship to move through the world.
 */
export class PathFinder<T extends IAutomatedShip> {
    public owner: T;
    public points: Array<[number, number, number]> = [];
    public lastStepShouldRotate: boolean = false;

    public serialize(): ISerializedPathFinder {
        return {
            points: this.points,
            lastStepShouldRotate: this.lastStepShouldRotate
        };
    }

    public deserializeUpdate(data: ISerializedPathFinder) {
        this.points = data.points;
        this.lastStepShouldRotate = data.lastStepShouldRotate;
    }

    public static deserialize<T extends IAutomatedShip>(instance: T, data: ISerializedPathFinder): PathFinder<T> {
        const item = new PathFinder<T>(instance);
        item.deserializeUpdate(data);
        return item;
    }

    constructor(owner: T) {
        this.owner = owner;
    }

    public checkNearNode(): boolean {
        if (this.points.length <= 0) {
            return false;
        }

        const distance = VoronoiGraph.angularDistance(
            this.owner.position.clone().rotateVector([0, 0, 1]),
            this.points[0],
            this.owner.app.worldScale
        );
        return this.points.length > 1 ?
            distance < this.owner.getVelocityAcceleration() * this.owner.app.worldScale * Math.PI / 2 * 300 :
            distance < this.owner.getVelocityAcceleration() * this.owner.app.worldScale * Math.PI / 2 * 100;
    }

    public integrateOrientationSpeedFrames(orientationSpeed: number): number {
        const n = Math.floor(orientationSpeed / this.owner.getRotation() / 2);
        return Math.max(5, (n * (n - 1)) / 2 * 0.8);
    }

    public pathFindingLoop(isAttacking: boolean = false) {
        // disable pathing which is bad
        if (this.points.length >= 2) {
            this.points = this.points.slice(-1);
        }

        // if near a point
        if (this.checkNearNode()) {
            // remove first point
            this.points = this.points.slice(1);
        }

        // if there are more points
        if (this.points.length > 0 && !isAttacking) {
            // move towards points
            const positionPoint = this.owner.position.rotateVector([0, 0, 1]);
            const targetPoint = this.points[0];
            const positionDiff = Quaternion.fromBetweenVectors(positionPoint, targetPoint);
            const distance = VoronoiGraph.angularDistanceQuaternion(positionDiff, this.owner.app.worldScale);

            // compute rotation towards target
            let targetOrientationPoint = this.owner.orientation.clone().inverse()
                .mul(this.owner.position.clone().inverse())
                .mul(Quaternion.fromBetweenVectors([0, 0, 1], targetPoint))
                .rotateVector([0, 0, 1]);
            targetOrientationPoint[2] = 0;
            targetOrientationPoint = DelaunayGraph.normalize(targetOrientationPoint);
            const orientationDiffAngle = Math.atan2(targetOrientationPoint[0], targetOrientationPoint[1]);
            const orientationSpeed = VoronoiGraph.angularDistanceQuaternion(this.owner.orientationVelocity, 1) * (orientationDiffAngle > 0 ? 1 : -1);
            const desiredOrientationSpeed = Math.max(-this.owner.getRotation() * 10, Math.min(Math.round(
                -(360 / 4) / Math.PI * orientationDiffAngle
            ), this.owner.getRotation() * 10));

            // compute speed towards target
            const positionAngularDistance = VoronoiGraph.angularDistanceQuaternion(positionDiff, this.owner.app.worldScale);
            const speed = VoronoiGraph.angularDistanceQuaternion(this.owner.positionVelocity, this.owner.app.worldScale);
            let desiredSpeed = Math.ceil(Math.max(0, Math.min(positionAngularDistance * 10 - speed * 10, 10)));

            // perform rotation and speed up
            // use a class variable to force more tight angle correction, and a more relaxed angle check while moving
            // should result in stop and go less often.
            const shouldRotate = this.lastStepShouldRotate ?
                Math.abs(orientationDiffAngle) > 2 / 180 * Math.PI * (Math.pow(Math.PI - distance, 2) + 1) || Math.abs(desiredOrientationSpeed) >= this.owner.getRotation() :
                Math.abs(orientationDiffAngle) > 5 / 180 * Math.PI * (Math.pow(Math.PI - distance, 2) + 1) || Math.abs(desiredOrientationSpeed) >= this.owner.getRotation();
            this.lastStepShouldRotate = shouldRotate;
            if (!shouldRotate) {
                desiredSpeed = 5;
            }
            const willReachTargetRotation = Math.abs(orientationDiffAngle) / Math.abs(orientationSpeed) < this.integrateOrientationSpeedFrames(orientationSpeed);
            const shouldSlowDown = speed > desiredSpeed || shouldRotate;
            const shouldSpeedUp = speed < desiredSpeed + 1 && !shouldRotate;
            if (shouldRotate && desiredOrientationSpeed > orientationSpeed && !willReachTargetRotation && !this.owner.activeKeys.includes("a")) {
                // press a to rotate left
                this.owner.activeKeys.push("a");
            } else if (shouldRotate && desiredOrientationSpeed < orientationSpeed && !willReachTargetRotation && !this.owner.activeKeys.includes("d")) {
                // press d to rotate right
                this.owner.activeKeys.push("d");
            } else if (shouldRotate && desiredOrientationSpeed > orientationSpeed && willReachTargetRotation && !this.owner.activeKeys.includes("d")) {
                const aIndex = this.owner.activeKeys.findIndex((key) => key === "a");
                if (aIndex >= 0) {
                    this.owner.activeKeys.splice(aIndex, 1);
                }

                // press d to rotate right to slow down
                this.owner.activeKeys.push("d");
            } else if (shouldRotate && desiredOrientationSpeed < orientationSpeed && willReachTargetRotation && !this.owner.activeKeys.includes("a")) {
                const dIndex = this.owner.activeKeys.findIndex((key) => key === "d");
                if (dIndex >= 0) {
                    this.owner.activeKeys.splice(dIndex, 1);
                }

                // press a to rotate left to slow down
                this.owner.activeKeys.push("a");
            } else if (!shouldRotate && orientationSpeed > 0 && willReachTargetRotation && !this.owner.activeKeys.includes("a")) {
                const dIndex = this.owner.activeKeys.findIndex((key) => key === "d");
                if (dIndex >= 0) {
                    this.owner.activeKeys.splice(dIndex, 1);
                }

                // press a to rotate left to slow down
                this.owner.activeKeys.push("a");
            } else if (!shouldRotate && orientationSpeed < 0 && willReachTargetRotation && !this.owner.activeKeys.includes("d")) {
                const aIndex = this.owner.activeKeys.findIndex((key) => key === "a");
                if (aIndex >= 0) {
                    this.owner.activeKeys.splice(aIndex, 1);
                }

                // press d to rotate right to slow down
                this.owner.activeKeys.push("d");
            } else {
                // remove a d keys
                const aIndex = this.owner.activeKeys.findIndex((key) => key === "a");
                if (aIndex >= 0) {
                    this.owner.activeKeys.splice(aIndex, 1);
                }
                const dIndex = this.owner.activeKeys.findIndex((key) => key === "d");
                if (dIndex >= 0) {
                    this.owner.activeKeys.splice(dIndex, 1);
                }
            }

            if (shouldSpeedUp && !this.owner.activeKeys.includes("w")) {
                // press w to speed up
                this.owner.activeKeys.push("w");
            } else if (shouldSlowDown && !this.owner.activeKeys.includes("s")) {
                // press s to slow down
                this.owner.activeKeys.push("s");
            } else {
                // remove w s keys
                const wIndex = this.owner.activeKeys.findIndex((key) => key === "w");
                if (wIndex >= 0) {
                    this.owner.activeKeys.splice(wIndex, 1);
                }
                const sIndex = this.owner.activeKeys.findIndex((key) => key === "s");
                if (sIndex >= 0) {
                    this.owner.activeKeys.splice(sIndex, 1);
                }
            }
        }
    }
}