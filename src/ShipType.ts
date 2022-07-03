/**
 * The scale of the graphics engine to physics. All graphics is a plane scaled down by this factor, then projected
 * onto the sphere.
 */
export const PHYSICS_SCALE = 1 / 1000;
/**
 * The galleon class ship hull. This format allows rendering in graphics and computing the physics hull.
 */
export const GalleonHull: Array<[number, number]> = [
    [0, -32],
    [7, -26],
    [7, 28],
    [5, 26],
    [0, 28],
    [-5, 32],
    [-7, 28],
    [-7, -26]
];
/**
 * The frigate class ship hull. This format allows rendering in graphics and computing the physics hull.
 */
export const FrigateHull: Array<[number, number]> = [
    [0, -32],
    [5, -26],
    [5, 28],
    [4, 26],
    [0, 28],
    [-4, 32],
    [-5, 28],
    [-5, -26]
];
/**
 * The brig class ship hull. This format allows rendering in graphics and computing the physics hull.
 */
export const BrigHull: Array<[number, number]> = [
    [0, -30],
    [5, -24],
    [5, 26],
    [4, 24],
    [0, 26],
    [-4, 30],
    [-5, 26],
    [-5, -24]
];
/**
 * The brigantine class ship hull. This format allows rendering in graphics and computing the physics hull.
 */
export const BrigantineHull: Array<[number, number]> = [
    [0, -24],
    [4, -20],
    [4, 18],
    [2, 24],
    [0, 20],
    [-2, 24],
    [-4, 18],
    [-4, -24]
];
/**
 * The corvette class ship hull. This format allows rendering in graphics and computing the physics hull.
 */
export const CorvetteHull: Array<[number, number]> = [
    [0, -22],
    [4, -18],
    [4, 15],
    [2, 22],
    [0, 18],
    [-2, 22],
    [-2, 15],
    [-4, -22]
];
/**
 * The hull of the sloop class ships. This format allows for rendering and physics hull computations.
 */
export const SloopHull: Array<[number, number]> = [
    [0, -16],
    [3, -10],
    [3, 16],
    [1.5, 10],
    [0, 14],
    [-1.5, 10],
    [-3, 16],
    [-3, -10]
];
/**
 * The hull of the cutter class ships. This format allows for rendering and physics hull computations.
 */
export const CutterHull: Array<[number, number]> = [
    [0, -14],
    [3, -10],
    [3, 14],
    [1.5, 10],
    [0, 12],
    [-1.5, 10],
    [-3, 14],
    [-3, -10]
];

/**
 * Types of ships.
 */
export enum EShipType {
    /**
     * A small ship with two cannons, one on each side. Meant for trading and speed. It is cheap to build.
     * It has 4 cannonades.
     */
    CUTTER = "CUTTER",
    /**
     * A ship with eight cannons, four on each side, it has 10 cannonades which automatically fire at nearby ship.
     * Great for speed and harassing enemies from strange angles. Also, cheap to build.
     */
    SLOOP = "SLOOP",
    /**
     * The cheap main battleship which has 8 cannons, 4 on each side and no cannonades. Made to attack ships directly.
     */
    CORVETTE = "CORVETTE",
    /**
     * 18 cannons.
     */
    BRIGANTINE = "BRIGANTINE",
    /**
     * 24 cannons.
     */
    BRIG = "BRIG",
    /**
     * 28 cannons.
     */
    FRIGATE = "FRIGATE",
    /**
     * 80 cannons.
     */
    GALLEON = "GALLEON",
}

/**
 * The data format for new ships.
 */
export interface IShipData {
    shipType: EShipType;
    cost: number;
    settlementProgressFactor: number;
    cargoSize: number;
    hull: Array<[number, number]>;
    hullStrength: number;
    cannons: {
        numCannons: number;
        numCannonades: number;
        startY: number;
        endY: number;
        leftWall: number;
        rightWall: number;
    };
    topSpeed: number;
    acceleration: number;
    rotation: number;
}

/**
 * The list of ship data.
 */
export const SHIP_DATA: IShipData[] = [{
    shipType: EShipType.GALLEON,
    cost: 4500,
    settlementProgressFactor: 5,
    cargoSize: 8,
    hull: GalleonHull,
    hullStrength: 1280,
    cannons: {
        numCannons: 82,
        numCannonades: 24,
        startY: 32,
        endY: -32,
        leftWall: 7,
        rightWall: -7
    },
    topSpeed: 0.75,
    acceleration: 0.66,
    rotation: 0.66,
}, {
    shipType: EShipType.FRIGATE,
    cost: 1500,
    settlementProgressFactor: 5,
    cargoSize: 5,
    hull: FrigateHull,
    hullStrength: 640,
    cannons: {
        numCannons: 28,
        numCannonades: 8,
        startY: 32,
        endY: -30,
        leftWall: 5,
        rightWall: -5
    },
    topSpeed: 0.80,
    acceleration: 0.80,
    rotation: 0.80,
}, {
    shipType: EShipType.BRIG,
    cost: 1200,
    settlementProgressFactor: 5,
    cargoSize: 5,
    hull: BrigHull,
    hullStrength: 640,
    cannons: {
        numCannons: 24,
        numCannonades: 6,
        startY: 30,
        endY: -30,
        leftWall: 5,
        rightWall: -5
    },
    topSpeed: 0.85,
    acceleration: 0.85,
    rotation: 0.85,
}, {
    shipType: EShipType.BRIGANTINE,
    cost: 900,
    settlementProgressFactor: 5,
    cargoSize: 4,
    hull: BrigantineHull,
    hullStrength: 640,
    cannons: {
        numCannons: 18,
        numCannonades: 6,
        startY: 24,
        endY: -24,
        leftWall: 4,
        rightWall: -4
    },
    topSpeed: 0.88,
    acceleration: 0.88,
    rotation: 0.88,
}, {
    shipType: EShipType.CORVETTE,
    cost: 600,
    settlementProgressFactor: 4,
    cargoSize: 3,
    hull: CorvetteHull,
    hullStrength: 640,
    cannons: {
        numCannons: 14,
        numCannonades: 6,
        startY: 22,
        endY: -22,
        leftWall: 4,
        rightWall: -4
    },
    topSpeed: 0.92,
    acceleration: 0.92,
    rotation: 0.92,
}, {
    shipType: EShipType.SLOOP,
    cost: 300,
    settlementProgressFactor: 2,
    cargoSize: 2,
    hull: SloopHull,
    hullStrength: 320,
    cannons: {
        numCannons: 8,
        numCannonades: 4,
        startY: 16,
        endY: -16,
        leftWall: 3,
        rightWall: -3
    },
    topSpeed: 0.95,
    acceleration: 0.95,
    rotation: 0.95,
}, {
    shipType: EShipType.CUTTER,
    cost: 150,
    settlementProgressFactor: 1,
    cargoSize: 1,
    hull: CutterHull,
    hullStrength: 160,
    cannons: {
        numCannons: 4,
        numCannonades: 2,
        startY: 14,
        endY: -14,
        leftWall: 3,
        rightWall: -3
    },
    topSpeed: 1,
    acceleration: 1,
    rotation: 1,
}];
export const GetShipData = (shipType: EShipType, scale: number): IShipData => {
    const data = SHIP_DATA.find(s => s.shipType === shipType);
    if (!data) {
        throw new Error("Could not find ship data for ship type");
    }
    const scaledShip: IShipData = {
        shipType: data.shipType,
        cost: data.cost,
        settlementProgressFactor: data.settlementProgressFactor,
        cargoSize: data.cargoSize,
        hull: data.hull.map(([x, y]) => [x * scale, y * scale]),
        hullStrength: data.hullStrength,
        cannons: {
            numCannons: data.cannons.numCannons,
            numCannonades: data.cannons.numCannonades,
            startY: data.cannons.startY * scale,
            endY: data.cannons.endY * scale,
            leftWall: data.cannons.leftWall * scale,
            rightWall: data.cannons.rightWall * scale,
        },
        topSpeed: data.topSpeed,
        acceleration: data.acceleration,
        rotation: data.rotation,
    };
    return scaledShip;
}