export interface ISerializedPlanetaryCurrencySystem {
    name: string;
    globalAmount: number;
}

/**
 * The currency system of a planetary economy. Each instance oc planetary economy will link to this which contains
 * the global amount of currency. Increasing currency will allow for short term purchase of goods or as payment of
 * captains after winning a battle. But too much currency will cause prices to double and triple.
 */
export class PlanetaryCurrencySystem {
    /**
     * The name of the currency. Each kingdom will contain it's own paper money, only redeemable in that kingdom. There
     * could be off shore markets which will convert foreign money to local money for a loss. Gold is special in that
     * it can be minted only if Gold ore is discovered. Paper money can be minted at any moment and in any amount.
     */
    public name: string;
    /**
     * The global amount of a currency.
     */
    public globalAmount: number = 0;

    public serialize(): ISerializedPlanetaryCurrencySystem {
        return {
            name: this.name,
            globalAmount: this.globalAmount,
        };
    }

    public deserializeUpdate(data: ISerializedPlanetaryCurrencySystem) {
        this.name = data.name;
        this.globalAmount = data.globalAmount;
    }

    public static deserialize(data: ISerializedPlanetaryCurrencySystem): PlanetaryCurrencySystem {
        const item = new PlanetaryCurrencySystem(data.name);
        item.deserializeUpdate(data);
        return item;
    }

    /**
     * Create a currency system.
     * @param name The name of the currency.
     */
    constructor(name: string) {
        this.name = name;
    }

    /**
     * Add more currency to the system. Should be called before giving money to a captain who helped in a battle. Planets
     * need to determine the correct amount of reward.
     * @param amount
     */
    public addCurrency(amount: number) {
        this.globalAmount += amount;
    }

    /**
     * Remove currency from the system. Should be called after collecting taxes. Planets need to determine the correct
     * amount of taxes.
     * @param amount
     */
    public removeCurrency(amount: number) {
        this.globalAmount -= amount;
    }
}