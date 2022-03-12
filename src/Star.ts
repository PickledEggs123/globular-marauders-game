import {DeserializeQuaternion, ISerializedQuaternion, SerializeQuaternion} from "./Item";
import {ICameraState} from "./Interface";
import {Game} from "./Game";
import Quaternion from "quaternion";

export interface ISerializedStar {
    id: string;
    position: ISerializedQuaternion;
    positionVelocity: ISerializedQuaternion;
    orientation: ISerializedQuaternion;
    orientationVelocity: ISerializedQuaternion;
    color: string;
    size: number;
}

export class Star implements ICameraState {
    public instance: Game;
    public id: string = "";
    public position: Quaternion = Quaternion.ONE;
    public positionVelocity: Quaternion = Quaternion.ONE;
    public orientation: Quaternion = Quaternion.ONE;
    public orientationVelocity: Quaternion = Quaternion.ONE;
    public get localOrientation(): Quaternion {
        return this.position.clone().inverse().mul(this.orientation.clone());
    }
    public set localOrientation(i: Quaternion) {
        this.orientation = this.position.clone().mul(i.clone());
    }
    public get localOrientationVelocity(): Quaternion {
        return this.position.clone().inverse().mul(this.orientationVelocity.clone());
    }
    public set localOrientationVelocity(i: Quaternion) {
        this.orientationVelocity = this.position.clone().mul(i.clone());
    }
    public color: string = "blue";
    public size: number = 3;

    public serialize(): ISerializedStar {
        return {
            id: this.id,
            position: SerializeQuaternion(this.position),
            positionVelocity: SerializeQuaternion(this.positionVelocity),
            orientation: SerializeQuaternion(this.orientation),
            orientationVelocity: SerializeQuaternion(this.orientationVelocity),
            color: this.color,
            size: this.size
        };
    }

    public deserializeUpdate(data: ISerializedStar) {
        this.id = data.id;
        this.position = DeserializeQuaternion(data.position);
        this.positionVelocity = DeserializeQuaternion(data.positionVelocity);
        this.orientation = DeserializeQuaternion(data.orientation);
        this.orientationVelocity = DeserializeQuaternion(data.orientationVelocity);
        this.color = data.color;
        this.size = data.size;
    }

    static deserialize(instance: Game, data: ISerializedStar): Star {
        const item = new Star(instance);
        item.deserializeUpdate(data);
        return item;
    }

    constructor(instance: Game) {
        this.instance = instance;
    }
}