/**
 * The scale of the graphics engine to physics. All graphics is a plane scaled down by this factor, then projected
 * onto the sphere.
 */
export const PHYSICS_SCALE = 1 / 1000;
/**
 * The galleon class ship hull. This format allows rendering in graphics and computing the physics hull.
 */
export const GalleonHull: Array<[number, number]> = [
    [0, -90],
    [25, -65],
    [25, 75],
    [15, 90],
    [0, 75],
    [-15, 90],
    [-25, 75],
    [-25, -65]
];
/**
 * The frigate class ship hull. This format allows rendering in graphics and computing the physics hull.
 */
export const FrigateHull: Array<[number, number]> = [
    [0, -60],
    [20, -50],
    [20, 55],
    [10, 60],
    [0, 55],
    [-10, 60],
    [-20, 55],
    [-20, -50]
];
/**
 * The brig class ship hull. This format allows rendering in graphics and computing the physics hull.
 */
export const BrigHull: Array<[number, number]> = [
    [0, -50],
    [18, -40],
    [18, 45],
    [9, 50],
    [0, 45],
    [-9, 50],
    [-18, 45],
    [-18, -40]
];
/**
 * The brigantine class ship hull. This format allows rendering in graphics and computing the physics hull.
 */
export const BrigantineHull: Array<[number, number]> = [
    [0, -40],
    [14, -30],
    [14, 35],
    [7, 40],
    [0, 35],
    [-7, 40],
    [-14, 35],
    [-14, -30]
];
/**
 * The corvette class ship hull. This format allows rendering in graphics and computing the physics hull.
 */
export const CorvetteHull: Array<[number, number]> = [
    [0, -30],
    [10, -20],
    [10, 25],
    [5, 30],
    [0, 25],
    [-5, 30],
    [-10, 25],
    [-10, -20]
];
/**
 * The hull of the sloop class ships. This format allows for rendering and physics hull computations.
 */
export const SloopHull: Array<[number, number]> = [
    [0, -20],
    [5, -15],
    [5, 20],
    [3, 15],
    [0, 18],
    [-3, 15],
    [-5, 20],
    [-5, -15]
];
/**
 * The hull of the cutter class ships. This format allows for rendering and physics hull computations.
 */
export const CutterHull: Array<[number, number]> = [
    [0, -15],
    [3, -10],
    [3, 15],
    [1.5, 10],
    [0, 12],
    [-1.5, 10],
    [-3, 15],
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
        numCannons: 80,
        numCannonades: 24,
        startY: 70,
        endY: -70,
        leftWall: 25,
        rightWall: -25
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
        startY: 45,
        endY: -45,
        leftWall: 20,
        rightWall: -20
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
        startY: 40,
        endY: -40,
        leftWall: 18,
        rightWall: -18
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
        startY: 30,
        endY: -30,
        leftWall: 14,
        rightWall: -14
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
        startY: 20,
        endY: -20,
        leftWall: 10,
        rightWall: -10
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
        startY: 15,
        endY: -15,
        leftWall: 5,
        rightWall: -5
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
        startY: 10,
        endY: -10,
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