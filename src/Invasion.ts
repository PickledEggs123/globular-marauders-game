import {Faction, ISerializedFaction} from "./Faction";
import {EFaction} from "./EFaction";
import {Game} from "./Game";
import {IFormCard} from "./Interface";

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

export interface IInvasionAttackerScore {
    playerId: string;
    name: string;
    capture: number;
    damage: number;
}

export interface IInvasionDefenderScore {
    playerId: string;
    name: string;
    damage: number;
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
    attackerScores: IInvasionAttackerScore[];
    defenderScores: IInvasionDefenderScore[];
    captureDoneTick: number;
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
    public attackerScores: IInvasionAttackerScore[] = [];
    public defenderScores: IInvasionDefenderScore[] = [];
    public captureDoneTick: number = -10;

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

    public applyPointsToFactionShips(faction: Faction, numPoints: number) {
        const planet = this.instance.planets.get(this.planetId);
        for (const ship of planet.county.ships) {
            if (ship.faction === faction) {
                const playerData = Array.from(this.instance.playerData.values()).find(p => p.shipId === ship.id);
                if (playerData) {
                    const item = this.instance.scoreBoard.capture.find(i => i.playerId === playerData.id);
                    if (item) {
                        item.count += numPoints;
                    } else {
                        this.instance.scoreBoard.capture.push({
                            playerId: playerData.id,
                            name: playerData.name,
                            count: numPoints
                        });
                    }
                    this.instance.scoreBoard.capture.sort((a, b) => b.count - a.count);

                    const invasionItem = this.attackerScores.find(i => i.playerId === playerData.id);
                    if (invasionItem) {
                        invasionItem.capture += numPoints;
                    } else {
                        this.attackerScores.push({
                            playerId: playerData.id,
                            name: playerData.name,
                            capture: numPoints,
                            damage: 0
                        });
                    }
                    this.attackerScores.sort((a, b) => {
                        const captureDiff = b.capture - a.capture;
                        if (captureDiff) {
                            return captureDiff;
                        }
                        return b.damage - a.damage;
                    });
                }
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
                this.startExpiration -= 1
                if (this.startProgress % (30 * 10) === (30 * 10 - 1)) {
                    this.applyPointsToFactionShips(this.attacking, 2);
                }
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
                if (this.captureProgress % (30 * 10) === (30 * 10 - 1)) {
                    this.applyPointsToFactionShips(this.attacking, 1);
                }
                if (this.liberationProgress % (30 * 10) === (30 * 10 - 1)) {
                    this.applyPointsToFactionShips(this.defending, 1);
                }
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
                this.captureDoneTick += 1;
                break;
            }
        }
    }

    public getRewardMoney(index: number, success: boolean): number {
        let rewardMoney = 1000;
        if (index === 0) {
            rewardMoney = 10000;
        } else if (index === 1) {
            rewardMoney = 8000;
        } else if (index === 2) {
            rewardMoney = 5000;
        } else if (index === 3) {
            rewardMoney = 3000;
        } else if (index === 4) {
            rewardMoney = 2000;
        }
        if (!success) {
            rewardMoney *= 0.5;
        }
        return rewardMoney;
    }

    public getInvasionResultForPlayer(playerId: string): IFormCard[] {
        const playerData = this.instance.playerData.get(playerId);
        if (!playerData) {
            return [];
        }
        const faction = this.instance.factions.get(playerData.factionId);
        if (!faction) {
            return [];
        }

        const cards: IFormCard[] = [];
        if (this.attacking === faction) {
            const index = this.attackerScores.findIndex(x => x.playerId === playerId);
            if (this.invasionPhase === EInvasionPhase.CAPTURED) {
                const rewardMoney = this.getRewardMoney(index, true);
                if (index === 0) {
                    cards.push({
                        title: "You were given feudal ownership of the planet for your success",
                        fields: [],
                        data: {}
                    });
                }
                cards.push({
                    title: "You were given " + rewardMoney + " Gold for your successful attack",
                    fields: [],
                    data: {}
                });
            }
            if (this.invasionPhase === EInvasionPhase.REPELLED) {
                const rewardMoney = this.getRewardMoney(index, false);
                cards.push({
                    title: "You were given " + rewardMoney + " Gold for your failed attack",
                    fields: [],
                    data: {}
                });
            }
        }
        if (this.defending === faction) {
            const index = this.defenderScores.findIndex(x => x.playerId === playerId);
            if (this.invasionPhase === EInvasionPhase.CAPTURED) {
                const rewardMoney = this.getRewardMoney(index, false);
                cards.push({
                    title: "You were given " + rewardMoney + " Gold for your failed defense",
                    fields: [],
                    data: {}
                });
            }
            if (this.invasionPhase === EInvasionPhase.REPELLED) {
                const rewardMoney = this.getRewardMoney(index, true);
                cards.push({
                    title: "You were given " + rewardMoney + " Gold for your successful defense",
                    fields: [],
                    data: {}
                });
            }
        }
        return cards;
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
            attackerScores: this.attackerScores,
            defenderScores: this.defenderScores,
            captureDoneTick: this.captureDoneTick,
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
        this.attackerScores = data.attackerScores;
        this.defenderScores = data.defenderScores;
        this.captureDoneTick = data.captureDoneTick;
    }

    public static deserialize(game: Game, data: ISerializedInvasion) {
        const item = new Invasion(game, game.factions.get(data.attacking), game.factions.get(data.defending), data.planetId);
        item.deserializeUpdate(data);
        return item;
    }
}
