import { CookieService } from "@/features/cookie/services/cookie.service";

export async function generateFingerprint(): Promise<string | null> {
	if (typeof window === "undefined") return "";

	try {
		const components = {
			userAgent: navigator.userAgent,
			language: navigator.language,
			screenResolution: `${window.screen.width}x${window.screen.height}`,
			availableResolution: `${window.screen.availWidth}x${window.screen.availHeight}`,
			colorDepth: window.screen.colorDepth,
			timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
			timezoneOffset: new Date().getTimezoneOffset(),
			hardwareConcurrency: navigator.hardwareConcurrency,
			deviceMemory: (navigator as any).deviceMemory || "unknown",
			platform: (navigator as any).platform || "unknown",
			canvas: getCanvasFingerprint(),
		};

		const str = JSON.stringify(components);
		const msgUint8 = new TextEncoder().encode(str);
		const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

		return hashHex;
	} catch {
		return null;
	}
}

function getCanvasFingerprint(): string {
	try {
		const canvas = document.createElement("canvas");
		const ctx = canvas.getContext("2d");
		if (!ctx) return "";

		canvas.width = 200;
		canvas.height = 20;
		ctx.textBaseline = "top";
		ctx.font = "14px 'Arial'";
		ctx.textBaseline = "alphabetic";
		ctx.fillStyle = "#f60";
		ctx.fillRect(125, 1, 62, 20);
		ctx.fillStyle = "#069";
		ctx.fillText("PKVSTID", 2, 15);
		ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
		ctx.fillText("PKVSTID", 4, 17);

		return canvas.toDataURL();
	} catch {
		return "";
	}
}

function isPreferencesConsented(): boolean {
	if (typeof window === "undefined") return false;

	const cookieService = new CookieService();
	const consent = cookieService.getConsent();

	if (!consent) return false;

	return consent.preferences ?? false;
}

export async function getFingerprint(): Promise<string | undefined> {
	const STORAGE_KEY = "pkvstid";

	if (typeof window === "undefined") return "";

	if (!isPreferencesConsented()) {
		return undefined;
	}

	const existing = localStorage.getItem(STORAGE_KEY);
	if (existing) return existing;

	const generated = await generateFingerprint();
	if (generated) {
		localStorage.setItem(STORAGE_KEY, generated);
		return generated;
	}
}
