export function buildCSPHeader(): string {
	const { CSP } = SECURITY;

	const directives = [
		`default-src ${CSP.DEFAULT_SRC.join(" ")}`,
		`script-src ${CSP.SCRIPT_SRC.join(" ")}`,
		`worker-src ${CSP.WORKER_SRC.join(" ")}`,
		`style-src ${CSP.STYLE_SRC.join(" ")}`,
		`img-src ${CSP.IMG_SRC.join(" ")}`,
		`font-src ${CSP.FONT_SRC.join(" ")}`,
		`object-src ${CSP.OBJECT_SRC.join(" ")}`,
		`connect-src ${CSP.CONNECT_SRC.join(" ")}`,
		`base-uri ${CSP.BASE_URI.join(" ")}`,
		`form-action ${CSP.FORM_ACTION.join(" ")}`,
		`frame-ancestors ${CSP.FRAME_ANCESTORS.join(" ")}`,
		`frame-src ${CSP.FRAME_SRC.join(" ")}`,
	];

	if (CSP.BLOCK_ALL_MIXED_CONTENT) {
		directives.push("block-all-mixed-content");
	}

	if (CSP.UPGRADE_INSECURE_REQUESTS) {
		directives.push("upgrade-insecure-requests");
	}

	return directives.join("; ");
}

export function buildPermissionsPolicy(): string {
	return Object.entries(SECURITY.PERMISSIONS_POLICY)
		.map(([feature, values]) => `${feature.toLowerCase()}=${values.join(", ")}`)
		.join(", ");
}

export const SECURITY = {
	CSP: {
		DEFAULT_SRC: ["'self'", "https://*.openfreemap.org"],

		SCRIPT_SRC: [
			"'self'",
			"'unsafe-eval'",
			"'unsafe-inline'",

			"https://cdn.jsdelivr.net",

			// Google
			"https://*.googletagmanager.com",
			"https://*.google-analytics.com",
			"https://*.google.com",
			"https://*.googleadservices.com",
			"https://*.doubleclick.net",

			// Iconify
			"https://code.iconify.design",
			"https://code.iconify.com",
			"https://cdn.iconify.design",
			"https://api.iconify.design",

			// Internal services
			"https://captcha.st-infra.dev",
			"https://umami.st-infra.dev",
			"https://matomo.st-infra.dev",

			// Lisio
			"https://www.numanis.net",
			"https://www.lisio-solution.com",

			// Google Translate
			"https://translate.google.com",
			"https://translate.googleapis.com",
			"https://translate-pa.googleapis.com",
		],

		WORKER_SRC: ["'self'", "blob:", "https://cdn.jsdelivr.net", "https://*.openfreemap.org"],

		STYLE_SRC: [
			"'self'",
			"'unsafe-inline'",

			"https://fonts.googleapis.com",

			// Iconify
			"https://code.iconify.design",
			"https://cdn.iconify.design",
			"https://code.iconify.com",

			// Maps
			"https://*.openfreemap.org",

			// Lisio
			"https://www.lisio-solution.com",

			// Google
			"https://www.gstatic.com",
		],

		IMG_SRC: [
			"'self'",
			"blob:",
			"data:",

			// Generic HTTPS images
			"https:",

			// Iconify
			"https://code.iconify.design",
			"https://cdn.iconify.design",
			"https://code.iconify.com",
			"https://api.iconify.design",

			// Maps
			"https://*.openfreemap.org",

			// Google Ads / Analytics
			"https://*.google.com",
			"https://*.googleadservices.com",
			"https://*.doubleclick.net",
			"https://*.g.doubleclick.net",
		],

		FONT_SRC: ["'self'", "https://fonts.gstatic.com", "https://cdn.iconify.design"],

		CONNECT_SRC: [
			"'self'",

			// Iconify
			"https://api.iconify.design",
			"https://code.iconify.design",

			// Internal services
			"https://captcha.st-infra.dev",
			"https://umami.st-infra.dev",
			"https://matomo.st-infra.dev",

			// CDN
			"https://cdn.jsdelivr.net",

			// Google Analytics / Ads / Tag Manager
			"https://*.google.com",
			"https://*.googleadservices.com",
			"https://*.google-analytics.com",
			"https://*.doubleclick.net",
			"https://*.g.doubleclick.net",
			"https://*.googletagmanager.com",

			// Maps
			"https://*.openfreemap.org",
			"https://demotiles.maplibre.org",

			// Address APIs
			"https://data.geopf.fr",
			"https://api-adresse.data.gouv.fr",

			// Lisio
			"https://www.mobiledition.com",
			"https://www.lisio-solution.com",

			// Google Translate
			"https://translate.googleapis.com",
			"https://translate-pa.googleapis.com",
		],

		FRAME_SRC: [
			"'self'",

			// YouTube
			"https://www.youtube.com",
			"https://www.youtube-nocookie.com",

			// Lisio
			"https://www.lisio-solution.com",
		],

		OBJECT_SRC: ["'none'"],

		BASE_URI: ["'self'"],

		FORM_ACTION: ["'self'"],

		FRAME_ANCESTORS: ["'none'"],

		BLOCK_ALL_MIXED_CONTENT: false,

		UPGRADE_INSECURE_REQUESTS: true,
	},

	PERMISSIONS_POLICY: {
		CAMERA: ["(self)"],
		MICROPHONE: ["()"],
		GEOLOCATION: ["()"],
		FULLSCREEN: ["(self)"],
	},
};
