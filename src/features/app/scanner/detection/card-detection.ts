import { matchRatio, type CardFormat } from "./card-formats";

export interface DetectionResult {
	valid: boolean;
	confidence: number;
	format: CardFormat | null;
}

const EDGE_THRESHOLD_GALLERY = 0.06;
const EDGE_THRESHOLD_CAMERA = 0.08;
const SAMPLE_W = 64;
const SAMPLE_H = 40;
const SOBEL_THRESHOLD = 30;

function subsample(src: ImageData, w: number, h: number): ImageData {
	const out = new ImageData(w, h);
	const xScale = src.width / w;
	const yScale = src.height / h;
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const sx = Math.floor(x * xScale);
			const sy = Math.floor(y * yScale);
			const si = (sy * src.width + sx) * 4;
			const di = (y * w + x) * 4;
			out.data[di] = src.data[si];
			out.data[di + 1] = src.data[si + 1];
			out.data[di + 2] = src.data[si + 2];
			out.data[di + 3] = src.data[si + 3];
		}
	}
	return out;
}

function sobelEdgeDensity(imageData: ImageData): number {
	const sampled =
		imageData.width > SAMPLE_W || imageData.height > SAMPLE_H
			? subsample(imageData, SAMPLE_W, SAMPLE_H)
			: imageData;

	const { data, width, height } = sampled;
	const gray = new Float32Array(width * height);
	for (let i = 0; i < width * height; i++) {
		gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
	}

	let edgeCount = 0;
	for (let y = 1; y < height - 1; y++) {
		for (let x = 1; x < width - 1; x++) {
			const i = y * width + x;
			const gx =
				-gray[i - width - 1] +
				gray[i - width + 1] +
				-2 * gray[i - 1] +
				2 * gray[i + 1] +
				-gray[i + width - 1] +
				gray[i + width + 1];
			const gy =
				-gray[i - width - 1] -
				2 * gray[i - width] -
				gray[i - width + 1] +
				gray[i + width - 1] +
				2 * gray[i + width] +
				gray[i + width + 1];
			if (gx * gx + gy * gy > SOBEL_THRESHOLD * SOBEL_THRESHOLD) edgeCount++;
		}
	}
	return edgeCount / ((width - 2) * (height - 2));
}

/** Gallery: ratio check + edge density. */
export function scoreGalleryImage(imageData: ImageData): DetectionResult {
	const ratio = imageData.width / imageData.height;
	const format = matchRatio(ratio);
	if (!format) return { valid: false, confidence: 0, format: null };

	const density = sobelEdgeDensity(imageData);
	const valid = density >= EDGE_THRESHOLD_GALLERY;
	return {
		valid,
		confidence: Math.min(1, density / (EDGE_THRESHOLD_GALLERY * 2)),
		format,
	};
}

/** Camera: edge density only — ratio is implicit from the viewfinder guide. */
export function scoreCameraFrame(imageData: ImageData): DetectionResult {
	const density = sobelEdgeDensity(imageData);
	const valid = density >= EDGE_THRESHOLD_CAMERA;
	return {
		valid,
		confidence: Math.min(1, density / (EDGE_THRESHOLD_CAMERA * 2)),
		format: valid ? "standard" : null,
	};
}
