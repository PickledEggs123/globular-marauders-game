import {DelaunayGraph, OctreeTriangles} from "../src/Graph";
import {expect} from "chai";
import {Game} from "../src";

describe("octree", () => {
    describe("basic functionality", () => {
        it("should min max bounding box simple 1", function () {
            const octree = new OctreeTriangles<any>();
            expect(octree.getBoundingBox([
                [-1, -1, -1],
                [1, 1, 1],
            ])).to.deep.equal([
                [-1, -1, -1],
                [1, 1, 1],
            ]);
        });
        it("should min max bounding box simple reverse", function () {
            const octree = new OctreeTriangles<any>();
            expect(octree.getBoundingBox([
                [1, 1, 1],
                [-1, -1, -1],
            ])).to.deep.equal([
                [-1, -1, -1],
                [1, 1, 1],
            ]);
        });
        it("should handle boundingBoxSmallFactor", function () {
            const octree = new OctreeTriangles<any>();
            octree.boundingBoxSmallFactor = 6.1;
            expect(octree.isBoundingBoxSmall([
                [-1, -1, -1],
                [1, 1, 1],
            ])).to.equal(true);
            octree.boundingBoxSmallFactor = 1;
            expect(octree.isBoundingBoxSmall([
                [-1, -1, -1],
                [1, 1, 1],
            ])).to.equal(false);
        });
        it("should subdivide bounding box", function () {
            const octree = new OctreeTriangles<any>();
            expect(octree.boundingBoxDivisions()).to.deep.equal([
                [
                    [-1.1, -1.1, -1.1],
                    [0, 0, 0],
                ],
                [
                    [0, -1.1, -1.1],
                    [1.1, 0, 0],
                ],
                [
                    [-1.1, 0, -1.1],
                    [0, 1.1, 0],
                ],
                [
                    [0, 0, -1.1],
                    [1.1, 1.1, 0],
                ],
                [
                    [-1.1, -1.1, 0],
                    [0, 0, 1.1],
                ],
                [
                    [0, -1.1, 0],
                    [1.1, 0, 1.1],
                ],
                [
                    [-1.1, 0, 0],
                    [0, 1.1, 1.1],
                ],
                [
                    [0, 0, 0],
                    [1.1, 1.1, 1.1],
                ],
            ]);
        });
        it("should contain bounding box", function () {
            const octree = new OctreeTriangles<any>();
            octree.boundingBoxSmallFactor = 6.1;
            expect(octree.containsBoundingBox([
                [-1, -1, -1],
                [1, 1, 1],
            ])).to.equal(true);
            expect(octree.containsBoundingBox([
                [-1, -1, -1],
                [0, 0, 0],
            ])).to.equal(true);
            expect(octree.containsBoundingBox([
                [-2, -2, -2],
                [-1, -1, -1],
            ])).to.equal(true);
            expect(octree.containsBoundingBox([
                [-2, -2, -2],
                [-1.1, -1.1, -1.1],
            ])).to.equal(true);
            expect(octree.containsBoundingBox([
                [1.1, 1.1, 1.1],
                [2, 2, 2],
            ])).to.equal(true);
            expect(octree.containsBoundingBox([
                [1.2, 1.2, 1.2],
                [2, 2, 2],
            ])).to.equal(false);
            expect(octree.containsBoundingBox([
                [3, 3, 3],
                [3, 3, 3],
            ])).to.equal(false);
            expect(octree.containsBoundingBox([
                [-3, -3, -3],
                [-3, -3, -3],
            ])).to.equal(false);
        });
    });
    describe("performance functionality", () => {
        it("should handle 100 points", function () {
            const delaunay = new DelaunayGraph(new Game());
            delaunay.initialize();
            for (let i = 0; i < 100; i++) {
                delaunay.incrementalInsert();
            }
        });
        it("should handle 300 points", function () {
            const delaunay = new DelaunayGraph(new Game());
            delaunay.initialize();
            for (let i = 0; i < 300; i++) {
                delaunay.incrementalInsert();
            }
        });
        it("should handle 1000 points", function () {
            this.timeout(6000);
            const delaunay = new DelaunayGraph(new Game());
            delaunay.initialize();
            for (let i = 0; i < 1000; i++) {
                delaunay.incrementalInsert();
            }
        });
        it("should handle 3000 points", function () {
            this.timeout(60000);
            const delaunay = new DelaunayGraph(new Game());
            delaunay.initialize();
            for (let i = 0; i < 3000; i++) {
                delaunay.incrementalInsert();
            }
        });
    });
});
