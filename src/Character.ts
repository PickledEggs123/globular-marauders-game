import {GameFactionData, EFaction, ERaceData, EClassData} from "./EFaction";
import {Ship} from "./Ship";

export enum EHitType {
    MELEE = "MELEE",
    RANGE = "RANGE",
}

export enum EDamageType {
    MAGIC = "MAGIC",
    NORMAL = "NORMAL",
    STEALTH = "STEALTH",
}

/**
 * A class to simulate a DnD Pokemon battle between two ships.
 */
export class CharacterBattle {
    /**
     * The ships in the battle.
     */
    public ships: Ship[];

    /**
     * Get another enemy character to attack in a battle.
     * @param c
     */
    public getEnemyCharacter(c: Character): Character | null {
        const currentShip = this.ships[0];
        const otherShips = this.ships.filter(x => x.faction !== currentShip.faction);
        const otherShip = otherShips[Math.floor(Math.random() * otherShips.length)];
        const otherCharacters = [new Character(), new Character(), new Character()];
        return otherCharacters[Math.floor(Math.random() * otherCharacters.length)] ?? null;
    }

    /**
     * Each character takes turn attacking.
     */
    public takeTurn(): void {
        // do hit and damage
        this.ships.forEach(s => {
            const characters = [new Character(), new Character(), new Character()];
            characters.forEach(c => c.takeTurn());
        });
    }

    /**
     * Determine if the battle is over because the crew of one ship is knocked out.
     */
    public isDone(): boolean {
        // check win condition
        return this.ships.some(s => {
            const characters = [new Character(), new Character(), new Character()];
            return characters.every(c => c.hp <= 0);
        });
    }

    /**
     * Iterator function which runs the battle once.
     * @private
     */
    private *performBattle(): IterableIterator<void> {
        for (let i = 0; i < 100; i++) {
            this.takeTurn();
            if (this.isDone()) {
                return;
            }
            yield;
        }
    }

    /**
     * Instance of the iterator function.
     * @private
     */
    private battleIterator: IterableIterator<void> | null = null;

    /**
     * Run a battle until it's over turn by turn.
     */
    public runBattle(): boolean {
        if (!this.battleIterator) {
            this.battleIterator = this.performBattle();
        }

        const result = this.battleIterator.next();
        if (result.done) {
            this.battleIterator = null;
            return true;
        } else {
            return false;
        }
    }
}

export class Character {
    /**
     * Unique identifier for the character.
     */
    public id: string;
    /**
     * Faction of the character.
     */
    public faction: EFaction;
    /**
     * Race of the character.
     */
    public characterRace: ERaceData;
    /**
     * Class of the character.
     */
    public characterClass: EClassData;
    /**
     * The number of health points a character has.
     */
    public hp: number = 18;
    /**
     * The number of turns before melee can begin. This means rangers and mages can attack for a few turns for free.
     */
    public meleeDistance: number = 3;
    /**
     * The character is under melee attack, cannot range attack.
     */
    public underMelee: boolean = false;
    /**
     * The character is stealthy and hidden. Extra damage.
     */
    public isHidden: boolean = false;
    /**
     * The currently targeted character.
     */
    public targetCharacter: Character | null = null;
    /**
     * The battle class which connects to a character for the character to perform DnD battle.
     */
    public battle: CharacterBattle | null = null;

    /**
     * Setup for battle.
     */
    public setupForBattle(): void {
        this.hp = 18;
        this.meleeDistance = 3;
        this.underMelee = false;
        this.isHidden = true;
    }

    /**
     * Get character hit type, melee or range.
     */
    public getCharacterHitType(): EHitType {
        const classData = GameFactionData.find(x => x.id === this.faction)?.races.find(x => x.id === this.characterRace)?.classes.find(x => x.id === this.characterClass);
        if (classData) {
            if (classData.isRange && !this.underMelee) {
                return EHitType.RANGE;
            }
        }
        return EHitType.MELEE;
    }

    /**
     * Get character damage type, Magic, Normal, or Stealth.
     */
    public getCharacterDamageType(): EDamageType {
        const classData = GameFactionData.find(x => x.id === this.faction)?.races.find(x => x.id === this.characterRace)?.classes.find(x => x.id === this.characterClass);
        if (classData) {
            if (classData.isMagic && !this.underMelee) {
                return EDamageType.MAGIC;
            }
            if (classData.isStealth) {
                return EDamageType.STEALTH;
            }
        }
        return EDamageType.NORMAL;
    }

    /**
     * Basic roll function from [1, max].
     * @param max
     */
    public roll(max: number): number {
        return Math.floor(Math.random() * max) + 1;
    }

    /**
     * Calculate melee damage roll.
     */
    public meleeDamageRoll(): number {
        if (this.getCharacterDamageType() === EDamageType.STEALTH) {
            if (this.isHidden) {
                return this.roll(8);
            } else {
                return this.roll(4);
            }
        }
        return this.roll(6);
    }

    /**
     * Calculate range damage roll.
     */
    public rangeDamageRoll(): number {
        if (this.getCharacterDamageType() === EDamageType.MAGIC) {
            return this.roll(8);
        }
        return this.roll(6);
    }

    /**
     * Calculate stealth reveal roll.
     */
    public stealthRoll(): number {
        return this.roll(4);
    }

    /**
     * Apply special stat modifying magic.
     */
    public applyMagic(): void {
        // heal bless curse
    }

    /**
     * Apply damage to this character.
     * @param amount The points of damage.
     */
    public applyDamage(amount: number): void {
        const hitRoll = this.roll(20);
        if (hitRoll === 1) {
            return;
        }
        if (hitRoll === 20) {
            amount *= 2;
        }
        this.hp -= amount;
    }

    /**
     * Apply stealth reveal roll changes to this character.
     * @param amount The random probability of stealth.
     */
    public applyStealth(amount: number): void {
        if (amount === 1) {
            this.isHidden = false;
        }
        if (amount === 4) {
            this.isHidden = true;
        }
    }

    /**
     * Character takes a single turn in the DnD battle.
     */
    public takeTurn(): void {
        if (this.hp <= 0) {
            return;
        }

        if (this.targetCharacter.hp <= 0) {
            // target character is dead
            this.targetCharacter = null;
        }
        if (!this.targetCharacter) {
            // find new target character
            this.targetCharacter = this.battle?.getEnemyCharacter(this);
        }
        if (!this.targetCharacter) {
            // could not find target character
            return;
        }

        // perform battle
        switch (this.getCharacterHitType()) {
            case EHitType.MELEE: {
                // magic people can apply melee magic
                if (this.getCharacterDamageType() === EDamageType.MAGIC && !this.underMelee) {
                    this.applyMagic();
                    break;
                }
                // stealth people have stealth rolls
                if (this.getCharacterDamageType() === EDamageType.STEALTH && !this.underMelee) {
                    this.applyStealth(this.stealthRoll());
                }
                // melee people must close melee range to begin attacking
                if (this.meleeDistance > 0) {
                    this.meleeDistance -= 1;
                    break;
                }
                // apply melee damage
                this.targetCharacter.applyDamage(this.meleeDamageRoll());
                break;
            }
            case EHitType.RANGE: {
                // apply range damage
                this.targetCharacter.applyDamage(this.rangeDamageRoll());
                break;
            }
        }
    }
}