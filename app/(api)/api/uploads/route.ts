import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_MIME_TYPES: Record<string, { magic: Buffer[]; ext: string }> = {
	"image/jpeg": {
		magic: [Buffer.from([0xff, 0xd8, 0xff])],
		ext: ".jpg",
	},
	"image/png": {
		magic: [Buffer.from([0x89, 0x50, 0x4e, 0x47])],
		ext: ".png",
	},
	"image/webp": {
		magic: [Buffer.from("RIFF")],
		ext: ".webp",
	},
	"image/gif": {
		magic: [Buffer.from("GIF87a"), Buffer.from("GIF89a")],
		ext: ".gif",
	},
};

const MAX_SIZE = 8 * 1024 * 1024;

function detectMimeType(buffer: Buffer): string | null {
	for (const [mime, { magic }] of Object.entries(ALLOWED_MIME_TYPES)) {
		for (const magicBytes of magic) {
			if (buffer.subarray(0, magicBytes.length).equals(magicBytes)) {
				return mime;
			}
		}
	}
	return null;
}

function sanitizeFilename(name: string): string {
	return name.replace(/[^a-zA-Z0-9._-]/g, "_").substring(0, 100);
}

export async function POST(req: NextRequest) {
	const contentType = req.headers.get("content-type") ?? "";
	if (!contentType.includes("multipart/form-data")) {
		return NextResponse.json({ error: "Content-Type invalide" }, { status: 415 });
	}

	let form: FormData;
	try {
		form = await req.formData();
	} catch {
		return NextResponse.json({ error: "Formulaire invalide" }, { status: 400 });
	}

	const file = form.get("file");

	if (!(file instanceof File)) {
		return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
	}

	if (file.size === 0) {
		return NextResponse.json({ error: "Le fichier est vide" }, { status: 400 });
	}
	if (file.size > MAX_SIZE) {
		return NextResponse.json({ error: "Fichier trop volumineux (max 2 Mo)" }, { status: 400 });
	}

	if (!Object.keys(ALLOWED_MIME_TYPES).includes(file.type)) {
		return NextResponse.json({ error: "Type de fichier non autorisé" }, { status: 400 });
	}

	let buffer: Buffer;
	try {
		buffer = Buffer.from(await file.arrayBuffer());
	} catch {
		return NextResponse.json({ error: "Impossible de lire le fichier" }, { status: 400 });
	}

	const detectedMime = detectMimeType(buffer);
	if (!detectedMime) {
		return NextResponse.json({ error: "Le contenu du fichier ne correspond pas à une image valide" }, { status: 400 });
	}

	if (detectedMime !== file.type) {
		return NextResponse.json({ error: "Incohérence entre le type déclaré et le contenu réel" }, { status: 400 });
	}

	const ext = ALLOWED_MIME_TYPES[detectedMime].ext;
	const filename = `${randomUUID()}${ext}`;

	const uploadDir = join(process.cwd(), "public", "uploads");
	const filePath = join(uploadDir, filename);
	if (!filePath.startsWith(uploadDir)) {
		return NextResponse.json({ error: "Chemin de fichier invalide" }, { status: 400 });
	}

	try {
		await writeFile(filePath, buffer, { mode: 0o644 });
	} catch {
		return NextResponse.json({ error: "Erreur lors de l'enregistrement du fichier" }, { status: 500 });
	}

	console.info(`Upload OK – original: ${sanitizeFilename(file.name)}, saved: ${filename}`);

	return NextResponse.json({ url: `/uploads/${filename}` });
}
