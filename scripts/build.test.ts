import assert from "node:assert/strict";
import { test } from "node:test";
import { levels, streaks } from "./build.ts";

test("streaks count runs and allow an empty today", () => {
	assert.deepEqual(streaks([1, 1, 1, 0, 2, 3, 0]), { longest: 3, current: 2 });
	assert.deepEqual(streaks([0, 4, 0, 0]), { longest: 1, current: 0 });
	assert.deepEqual(streaks([]), { longest: 0, current: 0 });
});

test("levels map zero to 0 and the busiest days to 4", () => {
	assert.deepEqual(levels([0, 1, 2, 3, 4, 100]), [0, 1, 1, 2, 3, 4]);
});
