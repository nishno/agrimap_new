import type { HarvestEntry, Transaction } from '../types';
import type { WorkerActivity } from './activities';

export interface CurrencyBalance {
    currency: string;
    accrued: number;
    paid: number;
    balance: number;
}

export interface WorkerSummary {
    totalPickedKg: number;
    totalWorkHours: number;
    completedCount: number;
    pendingCount: number;
    balancesByCurrency: CurrencyBalance[];
    recentHarvestCount: number;
}

const normalizeCurrency = (raw?: string | null): string => {
    const val = String(raw || 'GEL').trim().toUpperCase();
    return val || 'GEL';
};

export function summarizeWorker(params: {
    harvestEntries?: HarvestEntry[];
    activities?: WorkerActivity[];
    transactions?: Transaction[];
}): WorkerSummary {
    const { harvestEntries = [], activities = [], transactions = [] } = params;

    const totalPickedKg = harvestEntries.reduce((sum, entry: any) => {
        const kg = Number(entry?.weightKg ?? entry?.netWeight ?? entry?.weight ?? 0);
        return sum + (Number.isFinite(kg) && kg > 0 ? kg : 0);
    }, 0);

    let totalWorkHours = 0;
    let completedCount = 0;
    let pendingCount = 0;

    for (const act of activities) {
        const hrs = Number(act.hours ?? 0);
        if (Number.isFinite(hrs) && hrs > 0) totalWorkHours += hrs;
        const st = String(act.status || '').toLowerCase();
        if (st === 'completed' || st === 'done' || st === 'verified' || st === 'approved' || st === 'paid') {
            completedCount += 1;
        } else {
            pendingCount += 1;
        }
    }

    // Per-currency payroll totals without silent FX conversion
    const currencyMap = new Map<string, CurrencyBalance>();
    for (const tx of transactions as any[]) {
        const amount = Number(tx?.amount ?? 0);
        if (!Number.isFinite(amount) || amount === 0) continue;
        const currency = normalizeCurrency(tx?.currency);
        const bucket = currencyMap.get(currency) || { currency, accrued: 0, paid: 0, balance: 0 };

        const kind = String(tx?.type || tx?.category || tx?.status || '').toLowerCase();
        const isPayment =
            kind.includes('payout') ||
            kind.includes('paid') ||
            kind.includes('salary_payment') ||
            kind.includes('advance') ||
            kind.includes('expense') ||
            kind === 'debit';

        if (isPayment) {
            bucket.paid += Math.abs(amount);
        } else {
            bucket.accrued += Math.abs(amount);
        }
        bucket.balance = bucket.accrued - bucket.paid;
        currencyMap.set(currency, bucket);
    }

    return {
        totalPickedKg: Number(totalPickedKg.toFixed(2)),
        totalWorkHours: Number(totalWorkHours.toFixed(2)),
        completedCount,
        pendingCount,
        balancesByCurrency: Array.from(currencyMap.values()).sort((a, b) => a.currency.localeCompare(b.currency)),
        recentHarvestCount: harvestEntries.length
    };
}
