import { writeFileSync } from "node:fs";
import sharp from "sharp";

const source =
	process.argv[2] ??
	"https://avatars.githubusercontent.com/u/100082621?v=4&s=460";
const N = 240;
const OUT = 480;
const K = OUT / N;

const input = source.startsWith("http")
	? Buffer.from(await (await fetch(source)).arrayBuffer())
	: source;

const { data } = await sharp(input)
	.resize(N, N, { fit: "cover" })
	.grayscale()
	.normalise()
	.blur(1.2)
	.raw()
	.toBuffer({ resolveWithObject: true });

let seed = 7;
const rand = () => {
	seed = (seed * 16807) % 2147483647;
	return seed / 2147483647;
};

const clamp = (v: number) => Math.min(N - 1, Math.max(0, Math.round(v)));
const lum = (x: number, y: number) => data[clamp(y) * N + clamp(x)] / 255;
const inside = (x: number, y: number) =>
	Math.hypot(x - N / 2, y - N / 2) < N * (0.46 + rand() * 0.03);

const layers = [
	{ angle: 45, threshold: 0.82, gap: 10 },
	{ angle: -45, threshold: 0.6, gap: 10 },
	{ angle: 0, threshold: 0.4, gap: 8 },
	{ angle: 90, threshold: 0.22, gap: 7 },
];

const segments: string[] = [];
const pt = (x: number, y: number) =>
	`${((x + (rand() - 0.5) * 0.6) * K).toFixed(1)} ${((y + (rand() - 0.5) * 0.6) * K).toFixed(1)}`;

for (const { angle, threshold, gap } of layers) {
	const r = (angle * Math.PI) / 180;
	const [ux, uy, nx, ny] = [
		Math.cos(r),
		Math.sin(r),
		-Math.sin(r),
		Math.cos(r),
	];
	const reach = N * 0.75;
	for (let o = -reach; o <= reach; o += gap / K) {
		let start: [number, number] | null = null;
		let length = 0;
		let limit = 12 + rand() * 24;
		for (let s = -reach; s <= reach; s += 0.5) {
			const x = N / 2 + nx * o + ux * s;
			const y = N / 2 + ny * o + uy * s;
			const ink =
				x >= 0 &&
				y >= 0 &&
				x < N &&
				y < N &&
				inside(x, y) &&
				lum(x, y) < threshold;
			if (ink && !start) {
				start = [x, y];
				length = 0;
			}
			if (start && ink) length += 0.5;
			if (start && (!ink || length > limit)) {
				segments.push(`M${pt(...start)}L${pt(x - ux * 0.5, y - uy * 0.5)}`);
				start = ink ? [x + ux, y + uy] : null;
				length = 0;
				limit = 12 + rand() * 24;
			}
		}
	}
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${OUT}" height="${OUT}"><path d="${segments.join("")}" stroke="#111" stroke-width="1.1" stroke-linecap="round" fill="none"/></svg>`;
const png = await sharp(Buffer.from(svg))
	.png({ palette: true, colors: 8, compressionLevel: 9 })
	.toBuffer();
writeFileSync("assets/portrait.png", png);
console.log(
	`assets/portrait.png ${(png.length / 1024).toFixed(1)}KB, ${segments.length} strokes`,
);
