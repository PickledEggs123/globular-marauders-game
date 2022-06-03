/**
 * An object which stores money in a specific currency.
 */
export interface ICurrency {
    currencyId: string;
    amount: number;
}

export interface ISerializedMoneyAccount {
    currencies: ICurrency[];
}

/**
 * An object which has gold. Can be used to pay for ships.
 */
export class MoneyAccount {
    currencies: ICurrency[] = [];

    public serialize(): ISerializedMoneyAccount {
        return {
            currencies: this.currencies
        };
    }

    public deserializeUpdate(data: ISerializedMoneyAccount) {
        this.currencies.splice(0, this.currencies.length);
        this.currencies.push.apply(this.currencies, data.currencies);
    }

    public static deserialize(data: ISerializedMoneyAccount): MoneyAccount {
        const item = new MoneyAccount();
        item.deserializeUpdate(data);
        return item;
    }

    constructor(startingGold: number = 0) {
        this.currencies.push({
            currencyId: "GOLD",
            amount: startingGold
        });
    }

    public hasEnough(payments: ICurrency[]): boolean {
        return this.currencies.some(c => {
            const payment = payments.find(p => p.currencyId === c.currencyId);
            if (payment) {
                return c.amount >= payment.amount;
            } else {
                return false;
            }
        }) || payments.length === 0;
    }

    public makePayment(other: MoneyAccount, payments: ICurrency[]) {
        for (const c of this.currencies) {
            const payment = payments.find(p => p.currencyId === c.currencyId);
            if (payment && c.amount >= payment.amount) {
                this.removeMoney(payment);
                other.addMoney(payment);
            }
        }
    }

    public addMoney(payment: ICurrency) {
        const oldCurrency = this.currencies.find(c => c.currencyId === payment.currencyId);
        if (oldCurrency) {
            oldCurrency.amount += payment.amount;
        } else {
            this.currencies.push({
                currencyId: payment.currencyId,
                amount: payment.amount
            });
        }
    }

    public removeMoney(payment: ICurrency) {
        const oldCurrency = this.currencies.find(c => c.currencyId === payment.currencyId);
        if (oldCurrency) {
            oldCurrency.amount -= payment.amount;
            if (oldCurrency.amount <= 0) {
                const index = this.currencies.findIndex(c => c.currencyId === payment.currencyId);
                if (index >= 0) {
                    this.currencies.splice(index, 1);
                }
            }
        } else {
            throw new Error("Cannot make payment, not enough money");
        }
    }

    public getGold(): number {
        const oldCurrency = this.currencies.find(c => c.currencyId === "GOLD");
        if (oldCurrency) {
            return oldCurrency.amount;
        } else {
            return 0;
        }
    }
}