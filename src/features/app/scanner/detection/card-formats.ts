export type CardFormat = "standard" | "square" | "portrait";

interface FormatSpec {
	ratio: number;
	tolerance: number;
}

export const CARD_FORMATS: Record<CardFormat, FormatSpec> = {
	standard: { ratio: 1.75, tolerance: 0.20 },
	square: { ratio: 1.0, tolerance: 0.20 },
	portrait: { ratio: 1 / 1.75, tolerance: 0.20 },
};

export function matchRatio(ratio: number): CardFormat | null {
	for (const [format, spec] of Object.entries(CARD_FORMATS) as [CardFormat, FormatSpec][]) {
		if (Math.abs(ratio - spec.ratio) / spec.ratio <= spec.tolerance) {
			return format;
		}
	}
	return null;
}
