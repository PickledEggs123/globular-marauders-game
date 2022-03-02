import {Faction} from "./Faction";

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

export class Invasion {
    public id: string;
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
    public planetSpawnAllowed = true;

    public constructor(attacking: Faction, defending: Faction, planetId: string) {
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
}
