import { readFileSync, writeFileSync } from "node:fs";
import opentype from "opentype.js";

const LOGIN = "Tarunchintakunta";
const W = 840;
const PAD = 40;

export const LINKS = [
	{
		id: "website",
		kicker: "WEB",
		label: "tarunchintakunta.com",
		href: "https://tarunchintakunta.com",
	},
	{
		id: "linkedin",
		kicker: "IN",
		label: "linkedin.com/in/tarun-chintakunta",
		href: "https://www.linkedin.com/in/tarun-chintakunta",
	},
	{
		id: "email",
		kicker: "MAIL",
		label: "tarunchintakunta@gmail.com",
		href: "mailto:tarunchintakunta@gmail.com",
	},
];

const IGNORED_LANGUAGES = new Set(["Jupyter Notebook", "TeX"]);
const BLUE = ["#E8EEFC", "#C3D2F8", "#93ADF3", "#5F84EE", "#2F5BEA"];

const THEMES = {
	light: {
		bg: "#FAFAF7",
		border: "#E3E3DC",
		ink: "#111111",
		muted: "#6B6B66",
		heat: BLUE,
		tile: "#EEF2FD",
		tileInk: BLUE[4],
		portrait: "",
	},
	dark: {
		bg: "#0D1117",
		border: "#30363D",
		ink: "#E6EDF3",
		muted: "#8B949E",
		heat: ["#161E2E", "#1F3373", "#2747B0", BLUE[4], BLUE[2]],
		tile: "#121A2C",
		tileInk: BLUE[2],
		portrait: ' filter="url(#ink)"',
	},
};
type Theme = (typeof THEMES)[keyof typeof THEMES];

const font = (pkg: string, file: string) => {
	const b = readFileSync(`node_modules/@fontsource/${pkg}/files/${file}.woff`);
	return opentype.parse(
		b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
	);
};
const SERIF = font("instrument-serif", "instrument-serif-latin-400-normal");
const ITALIC = font("instrument-serif", "instrument-serif-latin-400-italic");
const SANS = font("inter", "inter-latin-400-normal");
const MONO = font("jetbrains-mono", "jetbrains-mono-latin-400-normal");
const MONO_MEDIUM = font("jetbrains-mono", "jetbrains-mono-latin-500-normal");

type Font = typeof SERIF;
type TextOptions = { anchor?: "start" | "end"; tracking?: number };

const measure = (f: Font, s: string, size: number, tracking = 0) =>
	f.getAdvanceWidth(s, size) + tracking * size * ([...s].length - 1);

function text(
	f: Font,
	s: string,
	x: number,
	y: number,
	size: number,
	fill: string,
	{ anchor = "start", tracking = 0 }: TextOptions = {},
) {
	let cx = anchor === "end" ? x - measure(f, s, size, tracking) : x;
	if (!tracking)
		return `<path fill="${fill}" d="${f.getPath(s, cx, y, size).toPathData(2)}"/>`;
	let d = "";
	for (const ch of s) {
		d += f.getPath(ch, cx, y, size).toPathData(2);
		cx += f.getAdvanceWidth(ch, size) + tracking * size;
	}
	return `<path fill="${fill}" d="${d}"/>`;
}

const escapeXml = (s: string) =>
	s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");

const card = (h: number, label: string, t: Theme, body: string, defs = "") =>
	`<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 ${W} ${h}" role="img" aria-label="${escapeXml(label)}"><title>${escapeXml(label)}</title>${defs}<rect x="0.5" y="0.5" width="${W - 1}" height="${h - 1}" rx="18" fill="${t.bg}" stroke="${t.border}"/>${body}</svg>\n`;

const kicker = (
	s: string,
	x: number,
	y: number,
	t: Theme,
	anchor: "start" | "end" = "start",
) => text(MONO, s, x, y, 14, t.muted, { anchor, tracking: 0.12 });

function hero(t: Theme, portrait: string) {
	const size = 96;
	const bio =
		"I build AI products, ship SaaS, and teach people to do the same.";
	const bioSize = Math.min(19, (19 * 500) / measure(SANS, bio, 19));
	const defs = `<defs><filter id="ink"><feColorMatrix type="matrix" values="0 0 0 0 0.9 0 0 0 0 0.93 0 0 0 0 0.95 0 0 0 1 0"/></filter><clipPath id="frame"><rect x="574" y="40" width="226" height="260" rx="12"/></clipPath></defs>`;
	const body = [
		kicker("FULLSTACK ENGINEER · AI PRODUCTS", PAD, 64, t),
		text(SERIF, "Tarun", PAD - 3, 160, size, t.ink),
		text(ITALIC, "Chintakunta", PAD - 3, 246, size, t.ink),
		text(SANS, bio, PAD, 292, bioSize, t.muted),
		`<g clip-path="url(#frame)"><image href="data:image/png;base64,${portrait}" x="567" y="50" width="240" height="240"${t.portrait}/></g>`,
	].join("");
	return card(
		340,
		"Tarun Chintakunta, fullstack engineer building AI products",
		t,
		body,
		defs,
	);
}

export type Day = { date: string; contributionCount: number };

export function streaks(counts: number[]) {
	let longest = 0;
	let run = 0;
	for (const c of counts) {
		run = c > 0 ? run + 1 : 0;
		longest = Math.max(longest, run);
	}
	let i = counts.length - 1;
	if (counts[i] === 0) i--;
	let current = 0;
	while (i >= 0 && counts[i] > 0) {
		current++;
		i--;
	}
	return { longest, current };
}

export function levels(counts: number[]) {
	const nonzero = counts.filter((c) => c > 0).sort((a, b) => a - b);
	const q = [0.25, 0.5, 0.75].map(
		(p) => nonzero[Math.floor(p * (nonzero.length - 1))] ?? 0,
	);
	return counts.map((c) =>
		c === 0 ? 0 : c <= q[0] ? 1 : c <= q[1] ? 2 : c <= q[2] ? 3 : 4,
	);
}

function activity(t: Theme, weeks: Day[][], total: number) {
	const cell = 11;
	const step = 14;
	const top = 148;
	const left = PAD + (W - 2 * PAD - (weeks.length * step - (step - cell))) / 2;
	const lv = levels(weeks.flat().map((d) => d.contributionCount));
	const fill = (l: number) => t.heat[l];
	let k = 0;
	const cells = weeks
		.map((week, wi) =>
			week
				.map((d) => {
					const row = new Date(`${d.date}T00:00:00Z`).getUTCDay();
					return `<rect x="${left + wi * step}" y="${top + row * step}" width="${cell}" height="${cell}" rx="2.5" fill="${fill(lv[k++])}"/>`;
				})
				.join(""),
		)
		.join("");
	let last = -3;
	let prev = "";
	const months = weeks
		.map((week, wi) => {
			const m = new Date(`${week[0].date}T00:00:00Z`)
				.toLocaleString("en-US", { month: "short", timeZone: "UTC" })
				.toUpperCase();
			if (m === prev) return "";
			prev = m;
			if (wi - last < 3 || wi > weeks.length - 3) return "";
			last = wi;
			return text(MONO, m, left + wi * step, top + 7 * step + 20, 13, t.muted, {
				tracking: 0.08,
			});
		})
		.join("");
	const more = measure(MONO, "MORE", 13, 0.08);
	const legendX = W - PAD - more - 8 - 5 * step;
	const legend =
		text(MONO, "LESS", legendX - 8, 126, 13, t.muted, {
			anchor: "end",
			tracking: 0.08,
		}) +
		[0, 1, 2, 3, 4]
			.map(
				(l) =>
					`<rect x="${legendX + l * step}" y="116" width="${cell}" height="${cell}" rx="2.5" fill="${fill(l)}"/>`,
			)
			.join("") +
		text(MONO, "MORE", W - PAD, 126, 13, t.muted, {
			anchor: "end",
			tracking: 0.08,
		});
	const title =
		text(SERIF, "Every day, ", PAD, 96, 44, t.ink) +
		text(
			ITALIC,
			"in blue",
			PAD + measure(SERIF, "Every day, ", 44),
			96,
			44,
			BLUE[4],
		);
	const body = [
		kicker("REFRESHED DAILY", W - PAD, 56, t, "end"),
		kicker("CONTRIBUTIONS", PAD, 56, t),
		title,
		text(
			SANS,
			`${total.toLocaleString("en-US")} contributions in the last 12 months`,
			PAD,
			126,
			18,
			t.muted,
		),
		cells,
		months,
		legend,
	].join("");
	return card(
		300,
		`Contribution heatmap: ${total} contributions in the last 12 months`,
		t,
		body,
	);
}

type Stats = {
	total: number;
	longest: number;
	current: number;
	prs: number;
	repos: number;
	languages: { name: string; share: number }[];
};

function stats(t: Theme, s: Stats) {
	const top = 128;
	const gap = 12;
	const tileW = (W - 2 * PAD - 4 * gap) / 5;
	const tileH = 124;
	const tiles = [
		{
			label: "CONTRIBUTIONS",
			value: s.total.toLocaleString("en-US"),
			unit: "",
		},
		{
			label: "LONGEST STREAK",
			value: String(s.longest),
			unit: s.longest === 1 ? "day" : "days",
		},
		{
			label: "CURRENT STREAK",
			value: String(s.current),
			unit: s.current === 1 ? "day" : "days",
		},
		{ label: "PULL REQUESTS", value: String(s.prs), unit: "" },
		{ label: "REPOS TOUCHED", value: String(s.repos), unit: "" },
	];
	const labelSize = Math.min(
		13,
		...tiles.map(
			(tile) =>
				(13 * (tileW - 36)) / measure(MONO_MEDIUM, tile.label, 13, 0.04),
		),
	);
	const cards = tiles
		.map((tile, i) => {
			const x = PAD + i * (tileW + gap);
			const accent = i === 0;
			const ink = accent ? "#FFFFFF" : t.tileInk;
			const sub = accent ? BLUE[1] : t.muted;
			const number = text(SERIF, tile.value, x + 18, top + 76, 52, ink);
			const unit = tile.unit
				? text(
						SANS,
						tile.unit,
						x + 24 + measure(SERIF, tile.value, 52),
						top + 76,
						14,
						sub,
					)
				: "";
			return `<rect x="${x}" y="${top}" width="${tileW}" height="${tileH}" rx="12" fill="${accent ? BLUE[4] : t.tile}"/>${text(MONO_MEDIUM, tile.label, x + 18, top + 30, labelSize, sub, { tracking: 0.04 })}${number}${unit}`;
		})
		.join("");
	const barY = top + tileH + 54;
	const barW = W - 2 * PAD;
	const shades = [BLUE[4], BLUE[3], BLUE[2], BLUE[1], "#DCE4FA"];
	let bx = PAD;
	const bar = s.languages
		.map((l, i) => {
			const w = barW * l.share;
			const r = `<rect x="${bx.toFixed(1)}" y="${barY}" width="${Math.max(w - 2, 1).toFixed(1)}" height="8" rx="4" fill="${shades[i]}"/>`;
			bx += w;
			return r;
		})
		.join("");
	let lx = PAD;
	const legend = s.languages
		.map((l, i) => {
			const label = `${l.name} ${Math.round(l.share * 100)}%`;
			const out = `<circle cx="${lx + 4}" cy="${barY + 36}" r="4" fill="${shades[i]}"/>${text(MONO, label, lx + 14, barY + 41, 14, t.ink)}`;
			lx += 14 + measure(MONO, label, 14) + 24;
			return out;
		})
		.join("");
	const title =
		text(SERIF, "The last 12 months ", PAD, 96, 44, t.ink) +
		text(
			ITALIC,
			"on GitHub",
			PAD + measure(SERIF, "The last 12 months ", 44),
			96,
			44,
			BLUE[4],
		);
	const body = [
		kicker("BY THE NUMBERS", PAD, 56, t),
		kicker("@TARUNCHINTAKUNTA", W - PAD, 56, t, "end"),
		title,
		cards,
		kicker("TOP LANGUAGES", PAD, barY - 16, t),
		bar,
		legend,
	].join("");
	const alt = `GitHub stats for the last 12 months: ${s.total} contributions, longest streak ${s.longest} days, current streak ${s.current} days, ${s.prs} pull requests, ${s.repos} repositories. Top languages: ${s.languages.map((l) => `${l.name} ${Math.round(l.share * 100)}%`).join(", ")}`;
	return card(barY + 76, alt, t, body);
}

function chip(t: Theme, l: (typeof LINKS)[number]) {
	const k = measure(MONO_MEDIUM, l.kicker, 11, 0.14);
	const w = Math.ceil(20 + k + 12 + measure(MONO, l.label, 13) + 20);
	const body =
		text(MONO_MEDIUM, l.kicker, 20, 27, 11, BLUE[t === THEMES.dark ? 2 : 4], {
			tracking: 0.14,
		}) + text(MONO, l.label, 20 + k + 12, 27, 13, t.ink);
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="44" viewBox="0 0 ${w} 44" role="img" aria-label="${escapeXml(l.label)}"><title>${escapeXml(l.label)}</title><rect x="0.5" y="0.5" width="${w - 1}" height="43" rx="12" fill="${t.bg}" stroke="${t.border}"/>${body}</svg>\n`;
}

const QUERY = `query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } }
      totalPullRequestContributions
      commitContributionsByRepository(maxRepositories: 100) { repository { nameWithOwner } }
      pullRequestContributionsByRepository(maxRepositories: 100) { repository { nameWithOwner } }
      issueContributionsByRepository(maxRepositories: 100) { repository { nameWithOwner } }
      pullRequestReviewContributionsByRepository(maxRepositories: 100) { repository { nameWithOwner } }
    }
    repositories(ownerAffiliations: OWNER, isFork: false, first: 100, orderBy: { field: PUSHED_AT, direction: DESC }) {
      nodes { pushedAt languages(first: 10, orderBy: { field: SIZE, direction: DESC }) { edges { size node { name } } } }
    }
  }
}`;

type RepoRef = { repository: { nameWithOwner: string } };
type Response = {
	data?: {
		user: {
			contributionsCollection: {
				contributionCalendar: {
					totalContributions: number;
					weeks: { contributionDays: Day[] }[];
				};
				totalPullRequestContributions: number;
				commitContributionsByRepository: RepoRef[];
				pullRequestContributionsByRepository: RepoRef[];
				issueContributionsByRepository: RepoRef[];
				pullRequestReviewContributionsByRepository: RepoRef[];
			};
			repositories: {
				nodes: {
					pushedAt: string;
					languages: { edges: { size: number; node: { name: string } }[] };
				}[];
			};
		};
	};
	errors?: { message: string }[];
};

async function fetchStats() {
	const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
	if (!token)
		throw new Error(
			"Set GH_TOKEN (or GITHUB_TOKEN) to a token with read:user scope",
		);
	const res = await fetch("https://api.github.com/graphql", {
		method: "POST",
		headers: {
			Authorization: `bearer ${token}`,
			"Content-Type": "application/json",
			"User-Agent": "profile-readme-build",
		},
		body: JSON.stringify({ query: QUERY, variables: { login: LOGIN } }),
	});
	const json = (await res.json()) as Response;
	if (!res.ok || json.errors || !json.data)
		throw new Error(
			`GitHub API ${res.status}: ${JSON.stringify(json.errors ?? json)}`,
		);
	const c = json.data.user.contributionsCollection;
	const weeks = c.contributionCalendar.weeks.map((w) => w.contributionDays);
	const { longest, current } = streaks(
		weeks.flat().map((d) => d.contributionCount),
	);
	const repos = new Set(
		[
			...c.commitContributionsByRepository,
			...c.pullRequestContributionsByRepository,
			...c.issueContributionsByRepository,
			...c.pullRequestReviewContributionsByRepository,
		].map((r) => r.repository.nameWithOwner),
	);
	const since = Date.now() - 365 * 864e5;
	const bytes = new Map<string, number>();
	for (const repo of json.data.user.repositories.nodes) {
		if (Date.parse(repo.pushedAt) < since) continue;
		for (const e of repo.languages.edges)
			if (!IGNORED_LANGUAGES.has(e.node.name))
				bytes.set(e.node.name, (bytes.get(e.node.name) ?? 0) + e.size);
	}
	const sum = [...bytes.values()].reduce((a, b) => a + b, 0) || 1;
	const languages = [...bytes]
		.sort((a, b) => b[1] - a[1])
		.slice(0, 5)
		.map(([name, size]) => ({ name, share: size / sum }));
	const shown = languages.reduce((a, l) => a + l.share, 0) || 1;
	for (const l of languages) l.share /= shown;
	const stats: Stats = {
		total: c.contributionCalendar.totalContributions,
		longest,
		current,
		prs: c.totalPullRequestContributions,
		repos: repos.size,
		languages,
	};
	return { weeks, stats };
}

if (import.meta.main) {
	const { weeks, stats: s } = await fetchStats();
	const portrait = readFileSync("assets/portrait.png").toString("base64");
	for (const [name, t] of Object.entries(THEMES)) {
		writeFileSync(`assets/hero-${name}.svg`, hero(t, portrait));
		writeFileSync(`assets/activity-${name}.svg`, activity(t, weeks, s.total));
		writeFileSync(`assets/stats-${name}.svg`, stats(t, s));
		for (const l of LINKS)
			writeFileSync(`assets/link-${l.id}-${name}.svg`, chip(t, l));
	}
	console.log(JSON.stringify(s));
}
