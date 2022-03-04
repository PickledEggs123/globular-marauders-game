import {Faction, ISerializedFaction} from "./Faction";
import {EFaction} from "./EFaction";
import {Game} from "./Game";

export enum EInvasionPhase {
    PLANNING = "PLANNING",
    STARTING = "STARTING",
    CAPTURING = "CAPTURING",
    CAPTURED = "CAPTURED",
    REPELLED = "REPELLED",
}

export enum EInvasionCaptureState {
    NONE = "NONE",
    CAPTURING = "CAPTURING",
    CONTESTED = "CONTESTED",
    LIBERATING = "LIBERATING",
}

export interface ISerializedInvasion {
    id: string;
    attacking: EFaction;
    defending: EFaction;
    planetId: string;
    planExpiration: number;
    startExpiration: number;
    captureExpiration: number;
    startProgress: number;
    captureProgress: number;
    liberationProgress: number;
    invasionPhase: EInvasionPhase;
    overtime: boolean;
    planetSpawnAllowed: boolean;
}

export class Invasion {
    public id: string;
    public instance: Game;
    public attacking: Faction;
    public defending: Faction;
    public planetId: string;
    public planExpiration: number = 60 * 10;
    public startExpiration: number = 3 * 60 * 10;
    public captureExpiration: number = 6 * 60 * 10;
    public startProgress: number = 0;
    public captureProgress: number = 0;
    public liberationProgress: number = 0;
    public invasionPhase: EInvasionPhase = EInvasionPhase.PLANNING;
    public overtime: boolean = false;
    public planetSpawnAllowed: boolean = true;

    public constructor(instance: Game, attacking: Faction, defending: Faction, planetId: string) {
        this.instance = instance;
        this.attacking = attacking;
        this.defending = defending;
        this.planetId = planetId;

        this.id = `invasion-${Math.floor(Math.random() * 1000000)}`;
    }

    public applyCaptureProgress(state: EInvasionCaptureState) {
        // determine overtime and if allowing planet spawns
        this.planetSpawnAllowed = true;
        switch (state) {
            case EInvasionCaptureState.CAPTURING:
            case EInvasionCaptureState.CONTESTED: {
                this.overtime = true;
                this.planetSpawnAllowed = false;
                break;
            }
            case EInvasionCaptureState.NONE:
            case EInvasionCaptureState.LIBERATING: {
                this.overtime = false;
                break;
            }
        }
        switch (this.invasionPhase) {
            case EInvasionPhase.PLANNING:
            case EInvasionPhase.STARTING:
            case EInvasionPhase.REPELLED: {
                break;
            }
            case EInvasionPhase.CAPTURING:
            case EInvasionPhase.CAPTURED: {
                this.planetSpawnAllowed = false;
            }
        }

        // handle applying invasion capture progress
        switch (this.invasionPhase) {
            case EInvasionPhase.PLANNING: {
                this.planetSpawnAllowed = true;
                break;
            }
            case EInvasionPhase.STARTING: {
                switch (state) {
                    case EInvasionCaptureState.CAPTURING: {
                        this.startProgress += 1;
                        break;
                    }
                    case EInvasionCaptureState.NONE:
                    case EInvasionCaptureState.LIBERATING: {
                        this.startProgress -= 1;
                        break;
                    }
                    case EInvasionCaptureState.CONTESTED: {
                        break;
                    }
                }
                break;
            }
            case EInvasionPhase.CAPTURING: {
                switch (state) {
                    case EInvasionCaptureState.CAPTURING: {
                        this.captureProgress += 1;
                        break;
                    }
                    case EInvasionCaptureState.NONE:
                    case EInvasionCaptureState.LIBERATING: {
                        this.liberationProgress += 1;
                        break;
                    }
                    case EInvasionCaptureState.CONTESTED: {
                        break;
                    }
                }
                break;
            }
            case EInvasionPhase.CAPTURED:
            case EInvasionPhase.REPELLED: {
                break;
            }
        }
    }

    public handleInvasionLoop() {
        // handle the state machine involving the invasion
        switch (this.invasionPhase) {
            case EInvasionPhase.PLANNING: {
                this.planExpiration -= 1;
                if (this.planExpiration <= 0) {
                    this.invasionPhase = EInvasionPhase.STARTING;
                }
                break;
            }
            case EInvasionPhase.STARTING: {
                this.startExpiration -= 1;
                if (this.startProgress >= 30 * 10) {
                    this.invasionPhase = EInvasionPhase.CAPTURING;
                }
                if (this.startExpiration <= 0 && !this.overtime) {
                    this.invasionPhase = EInvasionPhase.REPELLED;
                }
                break;
            }
            case EInvasionPhase.CAPTURING: {
                this.captureExpiration -= 1;
                if (this.captureProgress >= 3 * 60 * 10) {
                    this.invasionPhase = EInvasionPhase.CAPTURED;
                }
                if (this.captureExpiration <= 0 && !this.overtime) {
                    this.invasionPhase = EInvasionPhase.REPELLED;
                }
                if (this.liberationProgress >= 30 * 10) {
                    this.liberationProgress = 0;
                    this.captureProgress = 0;
                    this.invasionPhase = EInvasionPhase.STARTING;
                }
                break;
            }
            case EInvasionPhase.CAPTURED:
            case EInvasionPhase.REPELLED: {
                break;
            }
        }
    }

    public serialize(): ISerializedInvasion {
        return {
            id: this.id,
            attacking: this.attacking.id,
            defending: this.defending.id,
            planetId: this.planetId,
            planExpiration: this.planExpiration,
            startExpiration: this.startExpiration,
            captureExpiration: this.captureExpiration,
            startProgress: this.startProgress,
            captureProgress: this.captureProgress,
            liberationProgress: this.liberationProgress,
            invasionPhase: this.invasionPhase,
            overtime: this.overtime,
            planetSpawnAllowed: this.planetSpawnAllowed,
        };
    }

    public deserializeUpdate(data: ISerializedInvasion) {
        this.id = data.id;
        this.attacking = this.instance.factions.get(data.attacking);
        this.defending = this.instance.factions.get(data.defending);
        this.planetId = data.planetId;
        this.planExpiration = data.planExpiration;
        this.startExpiration = data.startExpiration;
        this.captureExpiration = data.captureExpiration;
        this.startProgress = data.startProgress;
        this.captureProgress = data.captureProgress;
        this.liberationProgress = data.liberationProgress;
        this.invasionPhase = data.invasionPhase;
        this.overtime = data.overtime;
        this.planetSpawnAllowed = data.planetSpawnAllowed;
    }

    public static deserialize(game: Game, data: ISerializedInvasion) {
        const item = new Invasion(game, game.factions.get(data.attacking), game.factions.get(data.defending), data.planetId);
        item.deserializeUpdate(data);
        return item;
    }
}
