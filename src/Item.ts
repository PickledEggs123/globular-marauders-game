import {ICameraState, ICollidable, IExpirableTicks} from "./Interface";
import Quaternion from "quaternion";
import {EResourceType, ICargoItem} from "./Resource";
import {Game} from "./Game";
import {EFaction} from "./EFaction";

/**
 * The format of all serialized quaternion. Need to also serialize quaternions else
 * the game data wont transfer correctly.
 */
export interface ISerializedQuaternion {
    // picked poor names to catch type errors more easily
    a: number;
    b: number;
    c: number;
    d: number;
}

/**
 * Convert a game data quaternion into a network data object.
 * @param q The game quaternion to convert.
 * @constructor
 */
export const SerializeQuaternion = (q: Quaternion): ISerializedQuaternion => {
    return {
        a: q.w,
        b: q.x,
        c: q.y,
        d: q.z
    };
};

/**
 * Convert a network data object into a game data quaternion.
 * @param d The network data object to convert.
 * @constructor
 */
export const DeserializeQuaternion = (d: ISerializedQuaternion): Quaternion => {
    return new Quaternion(d.a, d.b, d.c, d.d);
};

export interface ISerializedCrate {
    id: string;
    color: string;
    size: number;
    position: ISerializedQuaternion;
    positionVelocity: ISerializedQuaternion;
    orientation: ISerializedQuaternion;
    orientationVelocity: ISerializedQuaternion;
    resourceType: EResourceType;
    sourcePlanetId: string;
    amount: number;
    pirated: boolean;
    maxLife: number;
    life: number;
    factionId: EFaction | null;
    voronoiIndices: number[];
}

export class Crate implements ICameraState, ICargoItem, IExpirableTicks, ICollidable {
    public id: string = "";
    public color: string = "brown";
    public size: number = 100;
    public position: Quaternion = Quaternion.ONE;
    public positionVelocity: Quaternion = Quaternion.ONE;
    public orientation: Quaternion = Quaternion.ONE;
    public orientationVelocity: Quaternion = Quaternion.ONE;
    public resourceType: EResourceType;
    public sourcePlanetId: string;
    public amount: number;
    public pirated: boolean = false;
    public maxLife: number = 10 * 60;
    public life: number = 0;
    public factionId: EFaction | null = null;
    public voronoiIndices: number[] = [];

    public serialize(): ISerializedCrate {
        return {
            id: this.id,
            color: this.color,
            size: this.size,
            position: SerializeQuaternion(this.position),
            positionVelocity: SerializeQuaternion(this.positionVelocity),
            orientation: SerializeQuaternion(this.orientation),
            orientationVelocity: SerializeQuaternion(this.orientationVelocity),
            resourceType: this.resourceType,
            sourcePlanetId: this.sourcePlanetId,
            amount: this.amount,
            pirated: this.pirated,
            maxLife: this.maxLife,
            life: this.life,
            factionId: this.factionId,
            voronoiIndices: this.voronoiIndices,
        };
    }

    public deserializeUpdate(data: ISerializedCrate) {
        this.id = data.id;
        this.color = data.color;
        this.size = data.size;
        this.position = DeserializeQuaternion(data.position);
        this.positionVelocity = DeserializeQuaternion(data.positionVelocity);
        this.orientation = DeserializeQuaternion(data.orientation);
        this.orientationVelocity = DeserializeQuaternion(data.orientationVelocity);
        this.resourceType = data.resourceType;
        this.sourcePlanetId = data.sourcePlanetId;
        this.amount = data.amount;
        this.pirated = data.pirated;
        this.maxLife = data.maxLife;
        this.life = data.life;
        this.factionId = data.factionId;
        this.voronoiIndices = data.voronoiIndices;
    }

    public static deserialize(data: ISerializedCrate): Crate {
        const item = new Crate(data.resourceType, data.sourcePlanetId, data.amount);
        item.deserializeUpdate(data);
        return item;
    }

    constructor(resourceType: EResourceType, sourcePlanetId: string, amount: number) {
        this.resourceType = resourceType;
        this.sourcePlanetId = sourcePlanetId;
        this.amount = amount;
    }
}

export interface ISerializedCannonBall {
    id: string;
    color: string;
    position: ISerializedQuaternion;
    positionVelocity: ISerializedQuaternion;
    orientation: ISerializedQuaternion;
    orientationVelocity: ISerializedQuaternion;
    size: number;
    damage: number;
    maxLive: number;
    life: number;
    factionId: EFaction | null;
    shipId: string;
    voronoiIndices: number[];
}

export class CannonBall implements ICameraState, IExpirableTicks, ICollidable {
    public id: string = "";
    public color: string = "grey";
    public position: Quaternion = Quaternion.ONE;
    public positionVelocity: Quaternion = Quaternion.ONE;
    public orientation: Quaternion = Quaternion.ONE;
    public orientationVelocity: Quaternion = Quaternion.ONE;
    public size: number = 1;
    public damage: number = 10;
    public maxLife: number = Game.PROJECTILE_LIFE;
    public life: number = 0;
    public voronoiIndices: number[] = [];
    /**
     * Cannon balls have a faction, to avoid team killing teammates.
     */
    public factionId: EFaction | null;
    /**
     * Cannon balls have a ship id to record damage scores per player.
     */
    public shipId: string;

    public serialize(): ISerializedCannonBall {
        return {
            id: this.id,
            color: this.color,
            position: SerializeQuaternion(this.position),
            positionVelocity: SerializeQuaternion(this.positionVelocity),
            orientation: SerializeQuaternion(this.orientation),
            orientationVelocity: SerializeQuaternion(this.orientationVelocity),
            size: this.size,
            damage: this.damage,
            maxLive: this.maxLife,
            life: this.life,
            factionId: this.factionId,
            shipId: this.shipId,
            voronoiIndices: this.voronoiIndices,
        };
    }

    public deserializeUpdate(data: ISerializedCannonBall) {
        this.id = data.id;
        this.color = data.color;
        this.position = DeserializeQuaternion(data.position);
        this.positionVelocity = DeserializeQuaternion(data.positionVelocity);
        this.orientation = DeserializeQuaternion(data.orientation);
        this.orientationVelocity = DeserializeQuaternion(data.orientationVelocity);
        this.size = data.size;
        this.damage = data.damage;
        this.maxLife = data.maxLive;
        this.life = data.life;
        this.factionId = data.factionId;
        this.shipId = data.shipId;
        this.voronoiIndices = data.voronoiIndices;
    }

    public static deserialize(data: ISerializedCannonBall): CannonBall {
        const item = new CannonBall(data.factionId, data.shipId);
        item.deserializeUpdate(data);
        return item;
    }

    constructor(faction: EFaction, shipId: string) {
        this.factionId = faction;
        this.shipId = shipId;
    }
}

export interface ISerializedSpellBall {
    id: string;
    color: string;
    position: ISerializedQuaternion;
    positionVelocity: ISerializedQuaternion;
    orientation: ISerializedQuaternion;
    orientationVelocity: ISerializedQuaternion;
    size: number;
    damage: number;
    maxLive: number;
    life: number;
    factionId: EFaction | null;
    shipId: string;
    voronoiIndices: number[];
}

export class SpellBall implements ICameraState, IExpirableTicks, ICollidable {
    public id: string = "";
    public color: string = "grey";
    public position: Quaternion = Quaternion.ONE;
    public positionVelocity: Quaternion = Quaternion.ONE;
    public orientation: Quaternion = Quaternion.ONE;
    public orientationVelocity: Quaternion = Quaternion.ONE;
    public size: number = 1;
    public damage: number = 10;
    public maxLife: number = Game.PROJECTILE_LIFE;
    public life: number = 0;
    public voronoiIndices: number[] = [];
    /**
     * Cannon balls have a faction, to avoid team killing teammates.
     */
    public factionId: EFaction | null;
    /**
     * Cannon balls have a ship id to record damage scores per player.
     */
    public shipId: string;

    public serialize(): ISerializedSpellBall {
        return {
            id: this.id,
            color: this.color,
            position: SerializeQuaternion(this.position),
            positionVelocity: SerializeQuaternion(this.positionVelocity),
            orientation: SerializeQuaternion(this.orientation),
            orientationVelocity: SerializeQuaternion(this.orientationVelocity),
            size: this.size,
            damage: this.damage,
            maxLive: this.maxLife,
            life: this.life,
            factionId: this.factionId,
            shipId: this.shipId,
            voronoiIndices: this.voronoiIndices,
        };
    }

    public deserializeUpdate(data: ISerializedSpellBall) {
        this.id = data.id;
        this.color = data.color;
        this.position = DeserializeQuaternion(data.position);
        this.positionVelocity = DeserializeQuaternion(data.positionVelocity);
        this.orientation = DeserializeQuaternion(data.orientation);
        this.orientationVelocity = DeserializeQuaternion(data.orientationVelocity);
        this.size = data.size;
        this.damage = data.damage;
        this.maxLife = data.maxLive;
        this.life = data.life;
        this.factionId = data.factionId;
        this.shipId = data.shipId;
        this.voronoiIndices = data.voronoiIndices;
    }

    public static deserialize(data: ISerializedSpellBall): CannonBall {
        const item = new CannonBall(data.factionId, data.shipId);
        item.deserializeUpdate(data);
        return item;
    }

    constructor(faction: EFaction, shipId: string) {
        this.factionId = faction;
        this.shipId = shipId;
    }
}