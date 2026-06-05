export function buildCSPHeader(): string {
	const { CSP } = SECURITY;

	const directives = [
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
		SCRIPT_SRC: [
			"'self'",
			"'unsafe-eval'",
			"'unsafe-inline'",
			"https://cdn.jsdelivr.net",
			"https://code.iconify.design",
			"https://code.iconify.com",
			"https://cdn.iconify.design",
			"https://api.iconify.design",
		],

		WORKER_SRC: ["'self'", "blob:", "https://cdn.jsdelivr.net"],

		STYLE_SRC: [
			"'self'",
			"'unsafe-inline'",
			"https://fonts.googleapis.com",
			"https://code.iconify.design",
			"https://cdn.iconify.design",
			"https://code.iconify.com",
		],

		IMG_SRC: [
			"'self'",
			"blob:",
			"data:",
			"https:",
			"https://code.iconify.design",
			"https://cdn.iconify.design",
			"https://code.iconify.com",
			"https://api.iconify.design",
		],

		FONT_SRC: ["'self'", "https://fonts.gstatic.com", "https://cdn.iconify.design"],

		CONNECT_SRC: [
			"'self'",
			"https://api.iconify.design",
			"https://code.iconify.design",
			"https://cdn.jsdelivr.net",
			"https://data.geopf.fr",
			"https://api-adresse.data.gouv.fr",
		],

		FRAME_SRC: ["'self'"],

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
