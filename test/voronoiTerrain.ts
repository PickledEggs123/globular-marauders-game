import {Game, VoronoiTerrain} from "../src";
import {DelaunayGraph, VoronoiGraph} from "../src/Graph";


describe("Voronoi Terrain", () => {
    describe("Generate Terrain", () => {
        for (let i = 0; i < 1000; i++) {
            it(`should generate 100 times in a row: ${i + 1}`, () => {
                const game = new Game();
                const voronoiTerrain = new VoronoiTerrain(game);
                voronoiTerrain.generateTerrain();
            });
        }
    });
    describe("Good Points", () => {
        for (let i = 0; i < 1000; i++) {
            it(`should generate 100 times in a row: ${i + 1}`, () => {
                const game = new Game();
                game.generateGoodPoints(100, 10);
            });
        }
    });
});