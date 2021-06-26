import {ICameraState, ICollidable, IExpirable, IExpirableTicks} from "./Interface";
import Quaternion from "quaternion";
import {EFaction, ISerializedShip} from "./Ship";
import {EResourceType, ICargoItem} from "./Resource";
import {Game} from "./Game";
import {Order} from "./Order";

export interface ISerializedCrate {
    id: string;
    color: string;
    size: number;
    position: Quaternion;
    positionVelocity: Quaternion;
    orientation: Quaternion;
    orientationVelocity: Quaternion;
    resourceType: EResourceType;
    sourcePlanetId: string;
    amount: number;
    pirated: boolean;
    maxLife: number;
    life: number;
    factionId: EFaction | null;
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

    public serialize(): ISerializedCrate {
        return {
            id: this.id,
            color: this.color,
            size: this.size,
            position: this.position,
            positionVelocity: this.positionVelocity,
            orientation: this.orientation,
            orientationVelocity: this.orientationVelocity,
            resourceType: this.resourceType,
            sourcePlanetId: this.sourcePlanetId,
            amount: this.amount,
            pirated: this.pirated,
            maxLife: this.maxLife,
            life: this.life,
            factionId: this.factionId,
        };
    }

    public deserializeUpdate(data: ISerializedCrate) {
        this.id = data.id;
        this.color = data.color;
        this.size = data.size;
        this.position = data.position;
        this.positionVelocity = data.positionVelocity;
        this.orientation = data.orientation;
        this.orientationVelocity = data.orientationVelocity;
        this.resourceType = data.resourceType;
        this.sourcePlanetId = data.sourcePlanetId;
        this.amount = data.amount;
        this.pirated = data.pirated;
        this.maxLife = data.maxLife;
        this.life = data.life;
        this.factionId = data.factionId;
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

export class SmokeCloud implements ICameraState, IExpirable {
    public id: string = "";
    public color: string = "grey";
    public position: Quaternion = Quaternion.ONE;
    public positionVelocity: Quaternion = Quaternion.ONE;
    public orientation: Quaternion = Quaternion.ONE;
    public orientationVelocity: Quaternion = Quaternion.ONE;
    public size: number = 1;
    public created: Date = new Date(Date.now());
    public expires: Date = new Date(Date.now() + 10000);
}

export interface ISerializedCannonBall {
    id: string;
    color: string;
    position: Quaternion;
    positionVelocity: Quaternion;
    orientation: Quaternion;
    orientationVelocity: Quaternion;
    size: number;
    damage: number;
    maxLive: number;
    life: number;
    factionId: EFaction | null;
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
    /**
     * Cannon balls have a faction, to avoid team killing teammates.
     */
    public factionId: EFaction | null;

    public serialize(): ISerializedCannonBall {
        return {
            id: this.id,
            color: this.color,
            position: this.position,
            positionVelocity: this.positionVelocity,
            orientation: this.orientation,
            orientationVelocity: this.orientationVelocity,
            size: this.size,
            damage: this.damage,
            maxLive: this.maxLife,
            life: this.life,
            factionId: this.factionId,
        };
    }

    public deserializeUpdate(data: ISerializedCannonBall) {
        this.id = data.id;
        this.color = data.color;
        this.position = data.position;
        this.positionVelocity = data.positionVelocity;
        this.orientation = data.orientation;
        this.orientationVelocity = data.orientationVelocity;
        this.size = data.size;
        this.damage = data.damage;
        this.maxLife = data.maxLive;
        this.life = data.life;
        this.factionId = data.factionId;
    }

    public static deserialize(data: ISerializedCannonBall): CannonBall {
        const item = new CannonBall(data.factionId);
        item.deserializeUpdate(data);
        return item;
    }

    constructor(faction: EFaction) {
        this.factionId = faction;
    }
}