import {ICameraState, IScoreBoard} from "./Interface";
import {DelaunayGraph, VoronoiCell, VoronoiGraph} from "./Graph";
import Quaternion from "quaternion";
import {ISerializedPlanet, ISerializedPlanetFull, Planet} from "./Planet";
import {Faction} from "./Faction";
import {Game, IGameSyncFrame, IPlayerData, ISoundEvent} from "./Game";
import {Ship} from "./Ship";
import {CannonBall, Crate, SpellBall} from "./Item";
import {ISerializedStar, Star} from "./Star";
import {EFaction} from "./EFaction";

interface IVoronoiTreeNodeParent<T extends ICameraState> {
    nodes: Array<VoronoiTreeNode<T>>;
    app: Game;

    /**
     * How a voronoi tree will break down into smaller parts.
     */
    recursionNodeLevels(): number[];
}

/**
 * A voronoi tree used to speed up collision detection.
 */
export class VoronoiTreeNode<T extends ICameraState> implements IVoronoiTreeNodeParent<T> {
    public nodes: Array<VoronoiTreeNode<T>> = [];
    public point: [number, number, number];
    public voronoiCell: VoronoiCell;
    public radius: number = 0;
    public level: number;
    public parent: IVoronoiTreeNodeParent<T>;
    public neighbors: Array<VoronoiTreeNode<T>> = [];
    public items: T[] = [];
    public app: Game;

    public recursionNodeLevels(): number[] {
        return this.parent.recursionNodeLevels();
    }

    constructor(app: Game, voronoiCell: VoronoiCell, level: number, parent: IVoronoiTreeNodeParent<T>) {
        this.app = app;
        this.voronoiCell = new VoronoiCell();
        this.voronoiCell.vertices = voronoiCell.vertices;
        this.voronoiCell.centroid = voronoiCell.centroid;
        this.voronoiCell.radius = voronoiCell.radius;
        this.voronoiCell.vertex = voronoiCell.vertex;
        this.voronoiCell.neighborIndices = voronoiCell.neighborIndices;
        this.point = voronoiCell.centroid;
        this.level = level;
        this.parent = parent;
    }

    /**
     * Add an object to the voronoi tree for faster referencing when performing physics and collision, possibly even
     * networking. Send only people or ships within the player's section of a tree.
     * @param drawable
     */
    addItem(drawable: T) {
        if (this.nodes.length === 0 && this.level < this.recursionNodeLevels().length) {
            this.nodes = VoronoiTreeNode.createTreeNodes<T>(this.parent.nodes, this);
        }

        // end of tree, add to tree
        if (this.nodes.length === 0) {
            this.items.push(drawable);
            return;
        }

        // recurse tree
        const position = drawable.position.clone().rotateVector([0, 0, 1]);

        let bestDistance: number | null = null;
        let bestNode: VoronoiTreeNode<T> | null = null;
        for (const node of this.nodes) {
            const distance = VoronoiGraph.angularDistance(node.point, position, this.app.worldScale);
            if (bestDistance === null || distance < bestDistance) {
                bestDistance = distance;
                bestNode = node;
            }
        }
        if (bestDistance !== null && bestNode !== null) {
            // quick index for performance
            drawable.voronoiIndices[this.level] = this.nodes.indexOf(bestNode);

            bestNode.addItem(drawable);
        }
    }

    /**
     * Remove an object from the voronoi tree.
     * @param drawable
     */
    removeItem(drawable: T) {
        // end of tree, remove from tree
        if (this.nodes.length === 0) {
            const index = this.items.findIndex(i => i === drawable);
            if (index >= 0) {
                this.items.splice(index, 1);
            }
            return;
        }

        // quick index
        if (typeof drawable.voronoiIndices[this.level] === "number") {
            this.nodes[drawable.voronoiIndices[this.level]].removeItem(drawable);
            return;
        }

        // recurse tree
        const position = drawable.position.clone().rotateVector([0, 0, 1]);

        let bestDistance: number | null = null;
        let bestNode: VoronoiTreeNode<T> | null = null;
        for (const node of this.nodes) {
            const distance = VoronoiGraph.angularDistance(node.point, position, this.app.worldScale);
            if (bestDistance === null || distance < bestDistance) {
                bestDistance = distance;
                bestNode = node;
            }
        }
        if (bestDistance !== null && bestNode !== null) {
            bestNode.removeItem(drawable);
        }
    }

    /**
     * Return a list of items within a visible area on the voronoi tree.
     * @param position A position to find near by objects with.
     * @param additionalRadius
     */
    public* listItems(position: [number, number, number], additionalRadius?: number): Generator<T> {
        // found items
        if (this.nodes.length === 0) {
            for (const item of this.items) {
                yield item;
            }
            return;
        }

        // recurse tree
        for (const node of this.nodes) {
            const distance = VoronoiGraph.angularDistance(node.point, position, this.app.worldScale);
            if (distance < node.radius + (additionalRadius ?? 0)) {
                const generator = node.listItems(position, additionalRadius);
                while (true) {
                    const res = generator.next();
                    if (res.done) {
                        break;
                    }
                    yield res.value;
                }
            }
        }
    }

    /**
     * Return a list of voronoi cells form the tree.
     */
    public* listCells(): Generator<VoronoiCell> {
        // found leaf node, return voronoi cell
        if (this.level === this.recursionNodeLevels().length) {
            return yield this.voronoiCell;
        }

        for (const node of this.nodes) {
            const generator = node.listCells();
            while (true) {
                const res = generator.next();
                if (res.done) {
                    break;
                }
                yield res.value;
            }
        }
    }

    /**
     * Return a random polygon triangle of a voronoi cell.
     * @return int between 0 and n - 1, which is a triangle slice from the centroid to the pair of vertices.
     * @private
     */
    private getRandomTriangleOfSphericalPolygon<T extends ICameraState>(forNode: VoronoiTreeNode<T>): number {
        const triangleAreasInPolygon: number[] = [];
        // for each pair of vertices
        for (let i = 0; i < forNode.voronoiCell.vertices.length; i++) {
            // create triangle centroid, i, i + 1
            const a = forNode.voronoiCell.centroid;
            const b = forNode.voronoiCell.vertices[i % forNode.voronoiCell.vertices.length];
            const c = forNode.voronoiCell.vertices[(i + 1) % forNode.voronoiCell.vertices.length];
            const nab = DelaunayGraph.crossProduct(a, b);
            const nbc = DelaunayGraph.crossProduct(b, c);
            const nca = DelaunayGraph.crossProduct(c, a);
            const angleA = Math.acos(DelaunayGraph.dotProduct(nab, [-nca[0], -nca[1], -nca[2]]));
            const angleB = Math.acos(DelaunayGraph.dotProduct(nbc, [-nab[0], -nab[1], -nab[2]]));
            const angleC = Math.acos(DelaunayGraph.dotProduct(nca, [-nbc[0], -nbc[1], -nbc[2]]));
            const area = angleA + angleB + angleC - Math.PI;
            triangleAreasInPolygon.push(area);
        }
        const triangleAreasInPolygonSum = triangleAreasInPolygon.reduce((sum, v) => sum + v, 0);
        const triangleAreasInPolygonCum = triangleAreasInPolygon.reduce((acc: number[], v): number[] => {
            if (acc.length > 0) {
                acc.push(acc[acc.length - 1] + v);
            } else {
                acc.push(v);
            }
            return acc;
        }, [] as number[]);

        // pick random triangle index of voronoi cell
        const randomTriangleInPolygonRandValue = this.app.seedRandom.double() * triangleAreasInPolygonSum;
        let randomTriangleInPolygonIndex: number = 0;
        for (let i = 0; i < triangleAreasInPolygonCum.length; i++) {
            if (triangleAreasInPolygonCum[i] > randomTriangleInPolygonRandValue) {
                randomTriangleInPolygonIndex = i;
                break;
            }
        }
        return randomTriangleInPolygonIndex;
    }

    private static rotateVoronoiCell(rotation: Quaternion, polygon: VoronoiCell): VoronoiCell {
        const o = new VoronoiCell();
        o.centroid = rotation.mul(Quaternion.fromBetweenVectors([0, 0, 1], polygon.centroid))
            .rotateVector([0, 0, 1]);
        o.vertex = rotation.mul(Quaternion.fromBetweenVectors([0, 0, 1], polygon.vertex))
            .rotateVector([0, 0, 1]);
        o.vertices = polygon.vertices.map(v => {
            return rotation.mul(Quaternion.fromBetweenVectors([0, 0, 1], v))
                .rotateVector([0, 0, 1]);
        });
        o.radius = polygon.radius;
        o.neighborIndices = polygon.neighborIndices;
        return o;
    }

    /**
     * Perform Sutherland-hodgman polygon clipping on a pair of voronoi cells. This will fit a voronoi cell inside
     * another voronoi cell, on a sphere. For hierarchical voronoi tree.
     * @param forNode The outer polygon.
     * @param polygon The inner polygon.
     * @private
     */
    private static polygonClip<T extends ICameraState>(forNode: VoronoiTreeNode<T>, polygon: VoronoiCell): VoronoiCell {
        // copy data, to make the function immutable
        let vertices: Array<[number, number, number]> = polygon.vertices;
        let tempVertices: Array<[number, number, number]> = [];

        // for each outer line, assume infinite line segment
        for (let outerIndex = 0; outerIndex < forNode.voronoiCell.vertices.length; outerIndex++) {
            const outerA = forNode.voronoiCell.vertices[outerIndex % forNode.voronoiCell.vertices.length];
            const outerB = forNode.voronoiCell.vertices[(outerIndex + 1) % forNode.voronoiCell.vertices.length];
            const outerN = DelaunayGraph.normalize(DelaunayGraph.crossProduct(outerA, outerB));

            // used to clip the polygon, the first goal is to find an inner a and outer b
            let beginClipping: boolean = false;

            // for each inner line segment
            for (let innerIndex = 0; innerIndex < vertices.length || beginClipping; innerIndex++) {
                // compute intersection with line segment and infinite culling line
                const innerA = vertices[innerIndex % vertices.length];
                const innerB = vertices[(innerIndex + 1) % vertices.length];
                const midPoint = DelaunayGraph.normalize(Game.getAveragePoint([innerA, innerB]));
                const innerN = DelaunayGraph.normalize(DelaunayGraph.crossProduct(innerA, innerB));
                const line = DelaunayGraph.normalize(DelaunayGraph.crossProduct(outerN, innerN));
                const intercept: [number, number, number] = DelaunayGraph.dotProduct(line, midPoint) >= 0 ? line : [
                    -line[0],
                    -line[1],
                    -line[2]
                ];

                if (DelaunayGraph.dotProduct(intercept, outerN) > 0.001) {
                    intercept[0] *= -1;
                    intercept[1] *= -1;
                    intercept[2] *= -1;
                }
                if (DelaunayGraph.dotProduct(intercept, outerN) > 0.001) {
                    throw new Error("BAD INTERCEPT");
                }

                // determine if to cull or to cut the polygon
                const isInnerAInside = DelaunayGraph.dotProduct(outerN, innerA) > 0;
                const isInnerBInside = DelaunayGraph.dotProduct(outerN, innerB) > 0;
                if (isInnerAInside && !isInnerBInside) {
                    // moved outside of polygon, begin clipping
                    beginClipping = true;
                    tempVertices.push(innerA, intercept);
                } else if (!isInnerAInside && !isInnerBInside) {
                    // still outside of polygon, skip this segment
                } else if (!isInnerAInside && isInnerBInside) {
                    // moved back inside polygon, perform clip
                    beginClipping = false;
                    // fix duplicate vertex bug caused by a polygon starting on a polygon clip
                    // if there is a triangle 1, 2, 3 with 1 being out of bounds, it would insert intercept 1-2, 2, 3, intercept 3-1
                    // do not insert intercept 1-2 twice, the for loop can continue past the last index
                    if (innerIndex < vertices.length) {
                        tempVertices.push(intercept);
                    }
                } else {
                    tempVertices.push(innerA);
                }
            }
            vertices = tempVertices;
            tempVertices = [];
        }

        // compute new voronoi cell
        const copy = new VoronoiCell();
        copy.vertices = vertices;
        copy.centroid = DelaunayGraph.normalize(Game.getAveragePoint(copy.vertices));
        copy.vertex = polygon.vertex;
        copy.radius = copy.vertices.reduce((acc: number, vertex): number => {
            return Math.max(
                acc,
                VoronoiGraph.angularDistance(
                    copy.centroid,
                    vertex,
                    forNode.app.worldScale
                )
            );
        }, 0);
        copy.neighborIndices = polygon.neighborIndices;
        return copy;
    }

    /**
     * If the voronoi tree node contains the point.
     * @param point The point to test.
     */
    public containsPoint(point: [number, number, number]): boolean {
        return this.voronoiCell.containsPoint(point);
    }

    /**
     * Perform a brute force check of all children to determine the nearest node.
     * @param position The position to check.
     * @param arr An array of children.
     */
    public static getBruteForceNearestTerrain<S extends VoronoiTreeNode<any>>(position: [number, number, number], arr: S[], app: Game): S | null {
        const itemDistances = arr.map((d): [S, number] => [d, VoronoiGraph.angularDistance(
            d.voronoiCell.centroid,
            position,
            app.worldScale
        )]);
        let closestItem: S | null = null;
        let closestItemDistance: number | null = null;
        for (const [item, distance] of itemDistances) {
            if (closestItemDistance === null || distance < closestItemDistance) {
                closestItem = item;
                closestItemDistance = distance;
            }
        }
        return closestItem;
    }

    /**
     * If the point is near by a voronoi node.
     * @param point The point to test.
     * @param radius The radius of the sphere to test.
     */
    public isNearBy(point: [number, number, number], radius: number = 1): boolean {
        return VoronoiGraph.angularDistance(point, this.voronoiCell.centroid, this.app.worldScale) <
            this.voronoiCell.radius + (Math.PI * radius / this.app.worldScale);
    }

    public createRandomPoint<T extends ICameraState>(forNode: VoronoiTreeNode<T>): [number, number, number] {
        for (let tries = 0; tries < 10; tries++) {
            // pick a random triangle of a polygon
            const randomTriangleIndex = this.getRandomTriangleOfSphericalPolygon<T>(forNode);

            // create a random point between tree points by computing a weighted average
            // create dirichlet distribution
            const dirichletDistribution = [this.app.seedRandom.double(), this.app.seedRandom.double(), this.app.seedRandom.double()];
            const dirichletDistributionSum = dirichletDistribution.reduce((acc, v) => acc + v, 0);
            dirichletDistribution[0] /= dirichletDistributionSum;
            dirichletDistribution[1] /= dirichletDistributionSum;
            dirichletDistribution[2] /= dirichletDistributionSum;

            // get points
            const a = forNode.voronoiCell.centroid;
            const b = forNode.voronoiCell.vertices[randomTriangleIndex % forNode.voronoiCell.vertices.length];
            const c = forNode.voronoiCell.vertices[(randomTriangleIndex + 1) % forNode.voronoiCell.vertices.length];

            // compute weighted average
            const sumPoint = DelaunayGraph.add(
                DelaunayGraph.add([
                    dirichletDistribution[0] * a[0],
                    dirichletDistribution[0] * a[1],
                    dirichletDistribution[0] * a[2],
                ], [
                    dirichletDistribution[1] * b[0],
                    dirichletDistribution[1] * b[1],
                    dirichletDistribution[1] * b[2],
                ]),
                [
                    dirichletDistribution[2] * c[0],
                    dirichletDistribution[2] * c[1],
                    dirichletDistribution[2] * c[2],
                ]
            );
            const randomPoint = DelaunayGraph.normalize(sumPoint);

            if (forNode.containsPoint(randomPoint) || tries === 10 - 1) {
                return randomPoint;
            }
        }
        throw new Error("Failed to generate random point in triangle");
    }

    /**
     * Create child nodes of a current child node. This will create a hierarchical voronoi graph. Voronoi cells within
     * a voronoi cells, on a sphere.
     * @param originalNodes
     * @param forNode
     * @param voronoiCells
     */
    public static createTreeNodes<T extends ICameraState>(originalNodes: Array<VoronoiTreeNode<T>>, forNode: VoronoiTreeNode<T>, voronoiCells?: VoronoiCell[], numRandomPoints?: number) {
        const nodes: Array<VoronoiTreeNode<T>> = [];
        if (numRandomPoints === undefined) {
            numRandomPoints = forNode.recursionNodeLevels()[forNode.level];
        }

        let goodPoints: VoronoiCell[] = [];
        if (voronoiCells) {
            // pre-initialized points
            goodPoints.push(...voronoiCells);
        } else {
            // generate random points within a voronoi cell.
            let randomPointsWithinVoronoiCell: Array<[number, number, number]> = [];
            for (let i = 0; i < numRandomPoints; i++) {
                randomPointsWithinVoronoiCell.push(forNode.createRandomPoint(forNode));
            }

            // compute random nodes within voronoi cell, hierarchical voronoi tree.
            let numSteps: number = 10;
            // if (forNode.level === 1) {
            //     goodPoints.push(forNode.voronoiCell);
            //     numSteps = 0;
            // }
            for (let step = 0; step < numSteps || (goodPoints.length !== numRandomPoints && step < numSteps * 2); step++) {
                const delaunay = new DelaunayGraph<T>(forNode.app);
                // this line is needed because inserting vertices could remove old vertices.
                while (randomPointsWithinVoronoiCell.length < numRandomPoints) {
                    randomPointsWithinVoronoiCell.push(forNode.createRandomPoint(forNode));
                }

                // rotate random points to the bottom of the tetrahedron
                const rotationToBottomOfTetrahedron = Quaternion.fromBetweenVectors(forNode.voronoiCell.centroid, [0, 0, -1]);
                delaunay.initializeWithPoints([
                    ...delaunay.getTetrahedronPoints(),
                    ...randomPointsWithinVoronoiCell.map(p => {
                        return rotationToBottomOfTetrahedron.mul(Quaternion.fromBetweenVectors([0, 0, 1], p)).rotateVector([0, 0, 1]);
                    })
                ]);

                // this line is needed because inserting vertices could remove old vertices.
                while (delaunay.numRealVertices() < numRandomPoints) {
                    delaunay.incrementalInsert(forNode.createRandomPoint(forNode));
                }
                const outOfBoundsVoronoiCells = delaunay.getVoronoiGraph().cells;

                // perform sutherland-hodgman polygon clipping
                const points1 = outOfBoundsVoronoiCells.map((polygon) => {
                    return VoronoiTreeNode.rotateVoronoiCell(rotationToBottomOfTetrahedron.clone().inverse(), polygon);
                });
                const points2 = points1.map((polygon) => VoronoiTreeNode.polygonClip<T>(forNode, polygon));
                goodPoints = points2.filter((polygon) => forNode.containsPoint(polygon.vertex));
                randomPointsWithinVoronoiCell = goodPoints.reduce((acc, v) => {
                    if (acc.every(p => VoronoiGraph.angularDistance(p, v.centroid, 1) > 0.000001)) {
                        acc.push(v.centroid);
                    }
                    return acc;
                }, [] as Array<[number, number, number]>);
            }

            // check number of points
            if (goodPoints.length !== numRandomPoints) {
                throw new Error("Incorrect number of points");
            }
        }

        // create tree nodes
        for (const point of goodPoints) {
            // skip bad voronoi cells
            if (point.vertices.length < 3) {
                continue;
            }

            // insert good voronoi cell
            const node = new VoronoiTreeNode<T>(forNode.app, point, forNode.level + 1, forNode);
            node.radius = point.vertices.reduce((acc, v) => Math.max(
                acc,
                VoronoiGraph.angularDistance(point.centroid, v, forNode.app.worldScale)
            ), 0);
            nodes.push(node);
        }

        return nodes;
    }

    public generateTerrainPlanet(step: number = 0, maxStep: number = 3) {
        if (step >= maxStep) {
            return;
        }
        this.nodes = VoronoiTreeNode.createTreeNodes(this.parent.nodes, this);
        for (const node of this.nodes) {
            node.generateTerrainPlanet(step + 1, maxStep);
        }
    }

    public serializeTerrainPlanet() {
        return {
            voronoiCells: this.nodes.map(n => n.voronoiCell),
            nodes: this.nodes.map(n => n.serializeTerrainPlanet()),
        }
    }

    public deserializeTerrainPlanet(data: ISerializedTree) {
        this.nodes = VoronoiTreeNode.createTreeNodes(this.parent.nodes, this, data ? data.voronoiCells : undefined);
        this.nodes.forEach((x, index) => x.deserializeTerrainPlanet(data.nodes[index]));
    }
}

/**
 * A voronoi tree used to speed up collision detection.
 */
export class VoronoiTree<T extends ICameraState> implements IVoronoiTreeNodeParent<T> {
    public nodes: Array<VoronoiTreeNode<T>> = [];
    public app: Game;
    public defaultRecursionNodeLevels: number[] = [30, 5, 5];

    public recursionNodeLevels(): number[] {
        return this.defaultRecursionNodeLevels;
    }

    constructor(app: Game) {
        this.app = app;
    }

    /**
     * Create initial level 1 nodes for a tree. These are top level nodes.
     * @param parent The parent containing top level nodes, most likely VoronoiTree.
     * @param voronoiCells Optional data to initialize the nodes.
     */
    public createRootNodes<T extends ICameraState>(parent: IVoronoiTreeNodeParent<T>, voronoiCells?: VoronoiCell[]) {
        const nodes: Array<VoronoiTreeNode<T>> = [];

        // compute points
        const goodPoints: VoronoiCell[] = voronoiCells || this.app.generateTessellatedPoints(2, 0);
        for (const point of goodPoints) {
            const node = new VoronoiTreeNode<T>(parent.app, point, 1, parent);
            node.radius = point.vertices.reduce((acc, v) => Math.max(
                acc,
                VoronoiGraph.angularDistance(point.centroid, v, this.app.worldScale)
            ), 0);
            nodes.push(node);
        }
        for (let i = 0; i < goodPoints.length; i++) {
            const node = nodes[i];
            const point = goodPoints[i];
            node.neighbors = point.neighborIndices.map(index => nodes[index]);
        }
        return nodes;
    }

    /**
     * Add an item to the voronoi tree for quick lookup in the future. Useful for grouping objects close together. Required
     * for good physics and collision detection. Instead of comparing 1 cannon ball to 2000 ships which would be 2000
     * physics operations, use this class to divide recursively, 2000 / 10 = 200 / 10 = 20 / 10 = 2, resulting in
     * 30 tree operations + 2 physics operations.
     * @param drawable
     */
    public addItem(drawable: T) {
        if (this.nodes.length === 0) {
            this.nodes = this.createRootNodes<T>(this);
        }

        const position = drawable.position.clone().rotateVector([0, 0, 1]);

        let bestDistance: number | null = null;
        let bestNode: VoronoiTreeNode<T> | null = null;
        for (const node of this.nodes) {
            const distance = VoronoiGraph.angularDistance(node.point, position, this.app.worldScale);
            if (bestDistance === null || distance < bestDistance) {
                bestDistance = distance;
                bestNode = node;
            }
        }
        if (bestDistance !== null && bestNode !== null) {
            // quick index
            drawable.voronoiIndices = [this.nodes.indexOf(bestNode)];

            bestNode.addItem(drawable);
        }
    }

    /**
     * Remove an item from the voronoi tree. Useful for resetting the tree before the movement phase.
     * @param drawable
     */
    public removeItem(drawable: T) {
        // quick index
        if (typeof drawable.voronoiIndices[0] === "number") {
            this.nodes[drawable.voronoiIndices[0]].removeItem(drawable);
            return;
        }

        // recurse tree
        const position = drawable.position.clone().rotateVector([0, 0, 1]);

        let bestDistance: number | null = null;
        let bestNode: VoronoiTreeNode<T> | null = null;
        for (const node of this.nodes) {
            const distance = VoronoiGraph.angularDistance(node.point, position, this.app.worldScale);
            if (bestDistance === null || distance < bestDistance) {
                bestDistance = distance;
                bestNode = node;
            }
        }
        if (bestDistance !== null && bestNode !== null) {
            bestNode.removeItem(drawable);
        }
    }

    /**
     * List items near a specific position within the Voronoi Tree. Useful for finding nearest neighbors, when doing
     * physics and collision detection.
     * @param position
     * @param additionalRadius
     */
    public* listItems(position: [number, number, number], additionalRadius?: number): Generator<T> {
        // recurse tree
        for (const node of this.nodes) {
            const distance = VoronoiGraph.angularDistance(node.point, position, this.app.worldScale);
            if (distance < node.radius + (additionalRadius ?? 0)) {
                const generator = node.listItems(position, additionalRadius);
                while (true) {
                    const res = generator.next();
                    if (res.done) {
                        break;
                    }
                    yield res.value;
                }
            }
        }
    }

    /**
     * Get a list of cells to print, useful for debugging the voronoi tree structure.
     */
    public* listCells(): Generator<VoronoiCell> {
        for (const node of this.nodes) {
            const generator = node.listCells();
            while (true) {
                const res = generator.next();
                if (res.done) {
                    break;
                }
                yield res.value;
            }
        }
    }
}

export interface ISerializedFeudalGovernment {
    feudalObligationRatio: number;
}

/**
 * A class which manages feudal governments.
 */
export class FeudalGovernment {
    public static LIST_OF_FEUDAL_OBLIGATION_RATIOS: number[] = [
        1 / 2,
        1 / 3,
        1 / 4,
        1 / 5
    ];

    /**
     * The amount of feudal obligation to the current tier of government. Essentially the tax rate of free resources
     * for the domain of this government.
     */
    feudalObligationRatio: number = 1 / 3;

    /**
     * A function passed by the owning class to help determine the feudal government above this government.
     */
    getLordFeudalGovernment: () => FeudalGovernment | null;

    /**
     * Create an instance of a feudal government.
     * @param getLordFeudalGovernment A function which finds the lord of this feudal government.
     */
    constructor(getLordFeudalGovernment: () => FeudalGovernment | null) {
        this.getLordFeudalGovernment = getLordFeudalGovernment;
    }

    public serialize(): ISerializedFeudalGovernment {
        return {
            feudalObligationRatio: this.feudalObligationRatio
        };
    }

    public deserializeUpdate(data: ISerializedFeudalGovernment) {
        this.feudalObligationRatio = data.feudalObligationRatio;
    }

    public static deserialize(planet: Planet, data: ISerializedFeudalGovernment): FeudalGovernment {
        const item = new FeudalGovernment(planet.findFeudalLord.bind(planet));
        item.deserializeUpdate(data);
        return item;
    }

    /**
     * The amount of feudal obligation to the lord, the tier above this government. The tax rate of the lord, which
     * this government will pay.
     */
    getCurrentFeudalObligationRatio() {
        if (this.getLordFeudalGovernment) {
            // has feudal lord, pay obligation
            const feudalLord = this.getLordFeudalGovernment();
            if (feudalLord) {
                return feudalLord.feudalObligationRatio;
            }
        }
        // no feudal lord, no obligation
        return 0;
    }
}

export interface ISerializedVoronoiCounty {
    faction: EFaction | null;
    planet: ISerializedPlanetFull | null;
    capital: number | null;
}

/**
 * A voronoi tree node used to generate the terrain of a kingdom. There are 5 duchies in a kingdom.
 */
export class VoronoiCounty extends VoronoiTreeNode<ICameraState> {
    duchy: VoronoiDuchy;
    faction: Faction | null = null;
    planet: Planet | null = null;
    getPlanetId: () => number;
    capital: Planet | null = null;

    ships: Ship[] = [];
    cannonBalls: CannonBall[] = [];
    spellBalls: SpellBall[] = [];
    crates: Crate[] = [];

    public serialize(): ISerializedVoronoiCounty {
        return {
            faction: this.faction ? this.faction.id : null,
            planet: this.planet ? this.planet.serializeFull() : null,
            capital: this.planet ? 0 : null
        };
    }

    public deserializeUpdate(data: ISerializedVoronoiCounty) {
        this.faction = this.app.factions.get(data.faction) ?? null;

        // update planet;
        if (this.planet === null && data.planet) {
            this.planet = Planet.deserializeFull(this.app, this, data.planet);
        } else if (this.planet && data.planet) {
            this.planet.deserializeUpdateFull(data.planet);
        } else if (this.planet && data.planet === null) {
            this.planet = null;
        }

        this.capital = this.planet || null;
    }

    constructor(
        app: Game,
        voronoiCell: VoronoiCell,
        level: number,
        parent: IVoronoiTreeNodeParent<ICameraState>,
        duchy: VoronoiDuchy,
        getPlanetId: () => number
    ) {
        super(app, voronoiCell, level, parent);
        this.duchy = duchy;
        this.getPlanetId = getPlanetId;
    }

    public generateTerrain(data?: ISerializedVoronoiCounty) {
        if (data) {
            if (data.planet) {
                this.planet = Planet.deserialize(this.app, this, data.planet);
            } else {
                this.planet = null;
            }
        } else {
            this.planet = this.app.createPlanet(this.voronoiCell.centroid, this, this.getPlanetId());
        }
    }

    public getNearestPlanet(position: [number, number, number]): Planet {
        if (this.planet) {
            return this.planet;
        }
        throw new Error("Could not find nearest planet");
    }

    public *getPlanets(): Generator<Planet> {
        if (this.planet) {
            yield this.planet;
        }
    }

    removeDataItem(key: any, item: any) {
        const index = this[key].findIndex(i => i.id === item.id);
        if (index >= 0) {
            this[key].splice(index, 1);
        }
    }

    addDataItem(key: any, item: any) {
        this[key].push(item);
    }

    removeShip(item: Ship) {
        this.removeDataItem("ships", item);
    }

    addShip(item: Ship) {
        this.addDataItem("ships", item);
    }

    removeCannonBall(item: CannonBall) {
        this.removeDataItem("cannonBalls", item);
    }

    addCannonBall(item: CannonBall) {
        this.addDataItem("cannonBalls", item);
    }

    removeSpellBall(item: SpellBall) {
        this.removeDataItem("spellBalls", item);
    }

    addSpellBall(item: SpellBall) {
        this.addDataItem("spellBalls", item);
    }

    removeCrate(item: Crate) {
        this.removeDataItem("crates", item);
    }

    addCrate(item: Crate) {
        this.addDataItem("crates", item);
    }

    public claim(faction: Faction) {
        // set faction
        const oldFaction = this.faction;
        this.faction = faction;

        // if no capital, make only planet the capital
        if (!this.capital) {
            this.capital = this.planet;
        }

        // handle planet
        if (this.planet) {
            // remove planet from faction
            if (oldFaction) {
                const planetIndex = oldFaction.planetIds.findIndex(id => this.planet && id === this.planet.id);
                if (planetIndex >= 0) {
                    oldFaction.planetIds.splice(planetIndex, 1);
                }
                if (oldFaction.homeWorldPlanetId === this.planet.id) {
                    // destroy faction
                    //
                    // destroy all ships
                    for (const shipId of [...oldFaction.shipIds]) {
                        const ship = this.app.ships.get(shipId);
                        if (ship) {
                            // to lazy to make ships free ships, I'll self-destruct them on failure instead.
                            ship.health = 0;
                        }
                    }
                    // claim all planets
                    for (const planetId of [...oldFaction.planetIds]) {
                        const planet = this.app.planets.get(planetId);
                        if (planet) {
                            planet.claim(faction, true, null);
                        }
                    }
                    // remove all player titles
                    oldFaction.factionPlanetRoster = [];
                    // set faction as dead
                    oldFaction.alive = false;
                }
            }
            // add planet to faction
            if (!faction.planetIds.includes(this.planet.id)) {
                faction.planetIds.push(this.planet.id);
            }
        }

        // perform duchy claim
        this.duchy.claim(this, faction);
    }
}

export interface ISerializedVoronoiDuchy {
    voronoiCells: VoronoiCell[];
    faction: EFaction;
    capital: number | null;
    counties: ISerializedVoronoiCounty[];
    stars: ISerializedStar[];
    color: string;
}

/**
 * A voronoi tree node used to generate the terrain of a kingdom. There are 5 duchies in a kingdom.
 */
export class VoronoiDuchy extends VoronoiTreeNode<ICameraState> {
    kingdom: VoronoiKingdom;
    faction: Faction | null = null;
    capital: VoronoiCounty | null = null;
    counties: VoronoiCounty[] = [];
    stars: Star[] = [];
    getPlanetId: () => number;
    getStarId: () => number;
    color: string = "red";

    public serialize(): ISerializedVoronoiDuchy {
        return {
            voronoiCells: this.nodes.map(n => n.voronoiCell),
            faction: this.faction !== null ? this.faction.id : null,
            capital: this.capital !== null ? this.counties.indexOf(this.capital) : null,
            counties: this.counties.map(k => k.serialize()),
            stars: this.stars.map(s => s.serialize()),
            color: this.color
        };
    }

    public deserializeUpdate(data: ISerializedVoronoiDuchy) {
        this.faction = this.app.factions.get(data.faction) || null;
        this.capital = this.counties[data.capital] || null;
        for (let i = 0; i < data.counties.length && i < this.counties.length; i++) {
            this.counties[i].deserializeUpdate(data.counties[i]);
        }
        for (let i = 0; i < data.stars.length && i < this.stars.length; i++) {
            this.stars[i].deserializeUpdate(data.stars[i]);
        }
        this.color = data.color;
    }

    constructor(
        app: Game,
        voronoiCell: VoronoiCell,
        level: number,
        parent: IVoronoiTreeNodeParent<ICameraState>,
        kingdom: VoronoiKingdom,
        getPlanetId: () => number,
        getStarId: () => number,
        color: string
    ) {
        super(app, voronoiCell, level, parent);
        this.kingdom = kingdom;
        this.getPlanetId = getPlanetId;
        this.getStarId = getStarId;
        this.color = color;
    }

    public generateTerrain(data?: ISerializedVoronoiDuchy) {
        this.nodes = VoronoiTreeNode.createTreeNodes(this.parent.nodes, this, data ? data.voronoiCells : null);
        this.counties = this.nodes.map(n => new VoronoiCounty(n.app, n.voronoiCell, n.level, n.parent, this, this.getPlanetId));

        if (data) {
            // create stars from data
            this.stars = data.stars.map(s => Star.deserialize(this.app, s));
        } else {
            // create stars from scratch
            const tempStars = VoronoiTreeNode.createTreeNodes(this.parent.nodes, this, undefined, 15);
            this.stars = tempStars.map(s => s.voronoiCell.centroid).map((starPosition) => {
                return this.app.buildStar.call(this.app, starPosition, this.getStarId());
            });
        }

        for (let i = 0; i < this.counties.length; i++) {
            const county = this.counties[i];
            county.generateTerrain(data ? data.counties[i] : undefined);
        }
    }

    public getNearestPlanet(position: [number, number, number]): Planet {
        // try polygon check
        for (const county of this.counties) {
            if (county.voronoiCell.containsPoint(position)) {
                return county.getNearestPlanet(position);
            }
        }

        // try brute force distance check
        const bruteforceCounty = VoronoiTreeNode.getBruteForceNearestTerrain(position, this.counties, this.app);
        if (bruteforceCounty) {
            return bruteforceCounty.getNearestPlanet(position);
        }
        throw new Error("Could not find nearest planet");
    }

    public *getPlanets(position?: [number, number, number]): Generator<Planet> {
        for (const county of this.counties) {
            if (!position) {
                yield * county.getPlanets();
            } else if (position && county.isNearBy(position)) {
                yield * county.getPlanets();
            }
        }
    }

    public *getStars(): Generator<Star> {
        for (const star of this.stars) {
            yield star;
        }
    }

    public getNearestCounty(position: [number, number, number]): VoronoiCounty | null {
        let bestCounty: VoronoiCounty | null = null;
        let bestDistance: number | null = null;
        for (const county of this.counties) {
            const distance = VoronoiGraph.angularDistance(position, county.voronoiCell.centroid, this.app.worldScale);
            if (bestDistance === null || (distance < bestDistance)) {
                bestCounty = county;
                bestDistance = distance;
            }
        }
        if (bestCounty !== null) {
            return bestCounty;
        } else {
            return null;
        }
    }

    public claim(county: VoronoiCounty, faction: Faction) {
        // set faction
        this.faction = faction;

        // if no capital, make first colony the capital
        if (!this.capital) {
            this.capital = county;
        }

        // perform kingdom claim
        this.kingdom.claim(this, faction);
    }
}

export interface ISerializedVoronoiKingdom {
    voronoiCells: VoronoiCell[];
    neighborKingdoms: number[];
    faction: EFaction | null;
    capital: number | null;
    duchies: ISerializedVoronoiDuchy[];
}

/**
 * A voronoi tree node used to generate the terrain of a kingdom. There are 5 duchies in a kingdom.
 */
export class VoronoiKingdom extends VoronoiTreeNode<ICameraState> {
    terrain: VoronoiTerrain;
    neighborKingdoms: VoronoiKingdom[] = [];
    faction: Faction | null = null;
    capital: VoronoiDuchy | null = null;
    duchies: VoronoiDuchy[] = [];
    getPlanetId: () => number;
    getStarId: () => number;

    public serialize(): ISerializedVoronoiKingdom {
        return {
            voronoiCells: this.nodes.map(n => n.voronoiCell),
            neighborKingdoms: this.neighborKingdoms.map(k => this.terrain.kingdoms.indexOf(k)),
            faction: this.faction !== null ? this.faction.id : null,
            capital: this.capital !== null ? this.duchies.indexOf(this.capital) : null,
            duchies: this.duchies.map(k => k.serialize())
        };
    }

    public deserializeUpdate(data: ISerializedVoronoiKingdom) {
        this.neighborKingdoms = data.neighborKingdoms.map(index => this.terrain.kingdoms[index]);
        this.faction = this.app.factions.get(data.faction) || null;
        this.capital = this.duchies[data.capital] || null;
        for (let i = 0; i < data.duchies.length && this.duchies.length; i++) {
            this.duchies[i].deserializeUpdate(data.duchies[i]);
        }
    }

    constructor(
        app: Game,
        voronoiCell: VoronoiCell,
        level: number,
        parent: IVoronoiTreeNodeParent<ICameraState>,
        terrain: VoronoiTerrain,
        getPlanetId: () => number,
        getStarId: () => number
    ) {
        super(app, voronoiCell, level, parent);
        this.terrain = terrain;
        this.getPlanetId = getPlanetId;
        this.getStarId = getStarId;
    }

    public generateTerrain(data?: ISerializedVoronoiKingdom) {
        this.nodes = VoronoiTreeNode.createTreeNodes(this.parent.nodes, this, data ? data.voronoiCells : undefined);
        this.duchies = this.nodes.map((n, index) => {
            let color: string;
            if (index % 3 === 0)
                color = "#ff4444";
            else if (index % 3 === 1)
                color = "#44ff44";
            else
                color = "#4444ff";
            return new VoronoiDuchy(n.app, n.voronoiCell, n.level, n.parent, this, this.getPlanetId ,this.getStarId, color)
        });
        for (let i = 0; i < this.duchies.length; i++) {
            const duchy = this.duchies[i];
            duchy.generateTerrain(data ? data.duchies[i] : undefined);
        }
    }

    public getNearestPlanet(position: [number, number, number]): Planet {
        // try polygon check
        for (const duchy of this.duchies) {
            if (duchy.voronoiCell.containsPoint(position)) {
                return duchy.getNearestPlanet(position);
            }
        }

        // try brute force distance check
        const bruteForceDuchy = VoronoiTreeNode.getBruteForceNearestTerrain(position, this.duchies, this.app);
        if (bruteForceDuchy) {
            return bruteForceDuchy.getNearestPlanet(position);
        }

        throw new Error("Could not find nearest planet");
    }

    public *getPlanets(position?: [number, number, number]): Generator<Planet> {
        for (const duchy of this.duchies) {
            if (!position) {
                yield * duchy.getPlanets();
            } else if (position && duchy.isNearBy(position)) {
                yield * duchy.getPlanets(position);
            }
        }
    }

    public *getStars(position?: [number, number, number], radius: number = 1): Generator<Star> {
        for (const duchy of this.duchies) {
            if (!position) {
                yield * duchy.getStars();
            } else if (position && duchy.isNearBy(position, radius)) {
                yield * duchy.getStars();
            }
        }
    }

    public *getNearestCounties(position: [number, number, number], radius: number = 1): Generator<VoronoiCounty> {
        for (const duchy of this.duchies) {
            if (duchy.isNearBy(position, radius)) {
                for (const county of duchy.counties) {
                    yield county;
                }
            }
        }
    }

    public getNearestCounty(position: [number, number, number]): VoronoiCounty | null {
        let bestDuchy: VoronoiDuchy | null = null;
        let bestDistance: number | null = null;
        for (const duchy of this.duchies) {
            const distance = VoronoiGraph.angularDistance(position, duchy.voronoiCell.centroid, this.app.worldScale);
            if (bestDistance === null || (distance < bestDistance)) {
                bestDuchy = duchy;
                bestDistance = distance;
            }
        }
        if (bestDuchy !== null) {
            return bestDuchy.getNearestCounty(position);
        } else {
            return null;
        }
    }

    public claim(duchy: VoronoiDuchy, faction: Faction) {
        // set faction
        this.faction = faction;

        // if no capital, make first colony the capital
        if (!this.capital) {
            this.capital = duchy;
        }
    }
}

export interface ISerializedVoronoiTerrain {
    voronoiCells: VoronoiCell[];
    kingdoms: ISerializedVoronoiKingdom[];
}

interface IVoronoiTerrainItem<T extends ICameraState> {
    item: T;
    voronoiCounty: VoronoiCounty;
}

export interface ISerializedTree {
    voronoiCells: VoronoiCell[];
    nodes: ISerializedTree[];
}

/**
 * A voronoi tree used to generate terrain. There are 20 kingdoms.
 */
export class VoronoiTerrain extends VoronoiTree<ICameraState> {
    kingdoms: VoronoiKingdom[] = [];
    private nodeLevels: number[] = [20, 3, 3];
    recursionNodeLevels(): number[] {
        return this.nodeLevels;
    }
    setRecursionNodeLevels(nodeLevels: number[]) {
        this.nodeLevels = nodeLevels;
    }

    ships: Record<string, IVoronoiTerrainItem<Ship>> = {};
    cannonBalls: Record<string, IVoronoiTerrainItem<CannonBall>> = {};
    spellBalls: Record<string, IVoronoiTerrainItem<SpellBall>> = {};
    crates: Record<string, IVoronoiTerrainItem<Crate>> = {};

    planetId: number = 0;
    getPlanetId = () => {
        const id = this.planetId;
        this.planetId += 1;
        return id;
    }

    starId: number = 0;
    getStarId = () => {
        const id = this.starId;
        this.starId += 1;
        return id;
    }

    public serialize(): ISerializedVoronoiTerrain {
        return {
            voronoiCells: this.nodes.map(n => n.voronoiCell),
            kingdoms: this.kingdoms?.map(k => k.serialize())
        };
    }

    public serializeTerrainPlanet(): ISerializedTree {
        return {
            voronoiCells: this.nodes.map(n => n.voronoiCell),
            nodes: this.nodes.map(n => n.serializeTerrainPlanet()),
        }
    }

    public static deserializeTerrainPlanet(game: Game, data: ISerializedTree): VoronoiTerrain {
        const item = new VoronoiTerrain(game);
        item.nodes = item.createRootNodes(item, data ? data.voronoiCells : undefined);
        item.nodes.forEach((x, index) => x.deserializeTerrainPlanet(data.nodes[index]));
        return item;
    }

    public deserializeUpdate(data: ISerializedVoronoiTerrain) {
        for (let i = 0; i < data.kingdoms.length && i < this.kingdoms.length; i++) {
            this.kingdoms[i].deserializeUpdate(data.kingdoms[i]);
        }
    }

    public static deserialize(game: Game, data: ISerializedVoronoiTerrain): VoronoiTerrain {
        const item = new VoronoiTerrain(game);
        item.generateTerrain(data);
        item.deserializeUpdate(data);
        return item;
    }

    public generateTerrain(data?: ISerializedVoronoiTerrain) {
        this.nodes = this.createRootNodes(this, data ? data.voronoiCells : undefined);
        this.kingdoms = this.nodes.map(n => new VoronoiKingdom(n.app, n.voronoiCell, n.level, n.parent, this, this.getPlanetId, this.getStarId));
        for (let i = 0; i < this.kingdoms.length; i++) {
            const node = this.nodes[i];
            const kingdom = this.kingdoms[i];
            kingdom.neighborKingdoms = node.voronoiCell.neighborIndices.map(idx => this.kingdoms[idx]);
        }
        for (let i = 0; i < this.kingdoms.length; i++) {
            const kingdom = this.kingdoms[i];
            kingdom.generateTerrain(data ? data.kingdoms[i] : undefined);
        }
    }

    public generateTerrainPlanet(step: number = 0, maxStep: number = 3) {
        const planetVoronoiCells = this.app.generateGoodPoints(100, 10);
        this.nodes = this.createRootNodes(this, planetVoronoiCells);
        if (step >= maxStep) {
            return;
        }
        for (const node of this.nodes) {
            node.generateTerrainPlanet(step + 1, maxStep);
        }
    }

    public getNearestPlanet(position: [number, number, number]): Planet {
        // try polygon check
        for (const kingdom of this.kingdoms) {
            if (kingdom.voronoiCell.containsPoint(position)) {
                return kingdom.getNearestPlanet(position);
            }
        }

        // try brute force distance check
        const bruteForceKingdom = VoronoiTreeNode.getBruteForceNearestTerrain(position, this.kingdoms, this.app);
        if (bruteForceKingdom) {
            return bruteForceKingdom.getNearestPlanet(position);
        }

        throw new Error("Could not find nearest planet");
    }

    public *getPlanets(position?: [number, number, number]): Generator<Planet> {
        for (const kingdom of this.kingdoms) {
            if (!position) {
                yield * kingdom.getPlanets();
            } else if (position && kingdom.isNearBy(position)) {
                yield * kingdom.getPlanets(position);
            }
        }
    }

    public *getStars(position?: [number, number, number], radius: number = 1): Generator<Star> {
        for (const kingdom of this.kingdoms) {
            if (!position) {
                yield * kingdom.getStars();
            } else if (position && kingdom.isNearBy(position, radius)) {
                yield * kingdom.getStars(position, radius);
            }
        }
    }

    public *getNearestCounties(position: [number, number, number], radius: number = 1): Generator<VoronoiCounty> {
        for (const kingdom of this.kingdoms) {
            if (kingdom.isNearBy(position, radius)) {
                yield * kingdom.getNearestCounties(position, radius);
            }
        }
    }

    public removeDataItem<T extends ICameraState>(
        key: any,
        removeItem: (voronoiCounty: VoronoiCounty, item: T) => void,
        item: T
    ) {
        const voronoiTerrainItem = this[key][item.id];
        if (voronoiTerrainItem) {
            removeItem(voronoiTerrainItem.voronoiCounty, item);
            delete this[key][item.id];
        }
    }

    public updateDataItem<T extends ICameraState>(
        key: any,
        removeItem: (voronoiCounty: VoronoiCounty, item: T) => void,
        addItem: (voronoiCounty: VoronoiCounty, item: T) => void,
        item: T
    ) {
        // remove old item
        const voronoiTerrainItem = this[key][item.id];
        if (voronoiTerrainItem) {
            removeItem(voronoiTerrainItem.voronoiCounty, item);
        }

        // add new item
        const closestCounty = this.getNearestCounty(item.position.rotateVector([0, 0, 1]));
        addItem(closestCounty, item);
        if (voronoiTerrainItem) {
            voronoiTerrainItem.voronoiCounty = closestCounty;
        } else {
            this[key][item.id] = {
                item,
                voronoiCounty: closestCounty
            };
        }
    }

    public updateShip(item: Ship) {
        this.updateDataItem(
            "ships",
            (voronoiCounty: VoronoiCounty, item: Ship) => voronoiCounty.removeShip(item),
            (voronoiCounty: VoronoiCounty, item: Ship) => voronoiCounty.addShip(item),
            item);
    }
    public removeShip(item: Ship) {
        this.removeDataItem(
            "ships",
            (voronoiCounty: VoronoiCounty, item: Ship) => voronoiCounty.removeShip(item),
            item);
    }
    public updateCannonBall(item: CannonBall) {
        this.updateDataItem(
            "cannonBalls",
            (voronoiCounty: VoronoiCounty, item: CannonBall) => voronoiCounty.removeCannonBall(item),
            (voronoiCounty: VoronoiCounty, item: CannonBall) => voronoiCounty.addCannonBall(item),
            item);
    }
    public removeCannonBall(item: CannonBall) {
        this.removeDataItem(
            "cannonBalls",
            (voronoiCounty: VoronoiCounty, item: CannonBall) => voronoiCounty.removeCannonBall(item),
            item);
    }
    public updateSpellBall(item: SpellBall) {
        this.updateDataItem(
            "spellBalls",
            (voronoiCounty: VoronoiCounty, item: SpellBall) => voronoiCounty.removeSpellBall(item),
            (voronoiCounty: VoronoiCounty, item: SpellBall) => voronoiCounty.addSpellBall(item),
            item);
    }
    public removeSpellBall(item: SpellBall) {
        this.removeDataItem(
            "spellBalls",
            (voronoiCounty: VoronoiCounty, item: SpellBall) => voronoiCounty.removeSpellBall(item),
            item);
    }
    public updateCrate(item: Crate) {
        this.updateDataItem(
            "crates",
            (voronoiCounty: VoronoiCounty, item: Crate) => voronoiCounty.removeCrate(item),
            (voronoiCounty: VoronoiCounty, item: Crate) => voronoiCounty.addCrate(item),
            item);
    }
    public removeCrate(item: Crate) {
        this.removeDataItem(
            "crates",
            (voronoiCounty: VoronoiCounty, item: Crate) => voronoiCounty.removeCrate(item),
            item);
    }

    public getNearestCounty(position: [number, number, number]): VoronoiCounty | null {
        let bestKingdom: VoronoiKingdom | null = null;
        let bestDistance: number | null = null;
        for (const kingdom of this.kingdoms) {
            const distance = VoronoiGraph.angularDistance(position, kingdom.voronoiCell.centroid, this.app.worldScale);
            if (bestDistance === null || (distance < bestDistance)) {
                bestKingdom = kingdom;
                bestDistance = distance;
            }
        }
        if (bestKingdom !== null) {
            return bestKingdom.getNearestCounty(position);
        } else {
            return null;
        }
    }

    public getScoreBoardItemsForPlayer<T extends {playerId: string}>(playerData: IPlayerData, items: T[]): T[] {
        const playerItem: T = items.find(t => t.playerId === playerData.id);
        const data: T[] = items.slice(0, 10);
        if (!data.some(i => i.playerId === playerData.id) && playerItem) {
            data[data.length - 1] = playerItem;
        }
        return data;
    }
    public getScoreBoardForPlayer(playerData: IPlayerData): IScoreBoard {
        return {
            damage: this.getScoreBoardItemsForPlayer(playerData, this.app.scoreBoard.damage),
            loot: this.getScoreBoardItemsForPlayer(playerData, this.app.scoreBoard.loot),
            money: this.getScoreBoardItemsForPlayer(playerData, this.app.scoreBoard.money),
            land: this.getScoreBoardItemsForPlayer(playerData, this.app.scoreBoard.land),
            bounty: this.getScoreBoardItemsForPlayer(playerData, this.app.scoreBoard.bounty),
            capture: this.getScoreBoardItemsForPlayer(playerData, this.app.scoreBoard.capture),
        }
    }

    public getClientFrame(playerData: IPlayerData, position: [number, number, number], radius: number = 1): IGameSyncFrame {
        const ships: Ship[] = [];
        const cannonBalls: CannonBall[] = [];
        const spellBalls: SpellBall[] = [];
        const crates: Crate[] = [];
        const planets: Planet[] = [];
        const factions: Faction[] = Array.from(this.app.factions.values());

        for (const county of this.getNearestCounties(position, radius)) {
            ships.push.apply(ships, county.ships);
            cannonBalls.push.apply(cannonBalls, county.cannonBalls);
            spellBalls.push.apply(spellBalls, county.spellBalls);
            crates.push.apply(crates, county.crates);
            if (county.planet) {
                planets.push(county.planet);
            }
        }

        const soundEvents: ISoundEvent[] = this.app.soundEvents.filter(x => ships.some(ship => ship.id === x.shipId));

        return this.app.getSyncFrame(playerData, {
            id: playerData.id,
            ships: ships.map(s => s.serialize()),
            cannonBalls: cannonBalls.map(c => c.serialize()),
            spellBalls: spellBalls.map(c => c.serialize()),
            crates: crates.map(c => c.serialize()),
            planets: planets.map(p => p.serialize()),
            factions: factions.map(f => f.serialize()),
            scoreBoard: [{id: "a", ...this.getScoreBoardForPlayer(playerData)}],
            soundEvents,
        });
    }
}