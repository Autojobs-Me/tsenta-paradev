import type { CSSProperties } from "react";

/**
 * Geometry of Conductor's workspace status matrix (its W7a component and the
 * constants beside it, renderApp R:477680 to R:477770), on a 16px canvas: a
 * 4x4 grid of 1.5px cells 3px apart from 2.5px in, and a dense 7x7 grid of
 * touching 1.5px cells for the busier animations.
 */
const OFFSET = 2.5;
const CELL = 1.5;
const PITCH = CELL * 2;
const CANVAS = 16;

export interface MatrixCell {
	index: number;
	column: number;
	row: number;
	x: number;
	y: number;
}

export const GRID_4: MatrixCell[] = Array.from({ length: 16 }, (_, index) => ({
	index,
	column: index % 4,
	row: Math.floor(index / 4),
	x: OFFSET + (index % 4) * PITCH,
	y: OFFSET + Math.floor(index / 4) * PITCH,
}));

export const GRID_7: MatrixCell[] = Array.from({ length: 49 }, (_, index) => ({
	index,
	column: index % 7,
	row: Math.floor(index / 7),
	x: OFFSET + (index % 7) * CELL,
	y: OFFSET + Math.floor(index / 7) * CELL,
}));

export const CELL_SIZE = CELL;

const cellsPath = (cells: readonly MatrixCell[]) =>
	cells.map(({ x, y }) => `M${x} ${y}h${CELL}v${CELL}h-${CELL}Z`).join("");

/** All 16 cells: the matrix's resting base. */
export const BASE_PATH = cellsPath(GRID_4);
/** The outer ring only: an unstarted workspace. */
export const RING_PATH = cellsPath(
	GRID_4.filter(
		({ column, row }) => column === 0 || column === 3 || row === 0 || row === 3,
	),
);
/** A checkerboard of the dense grid: merged. */
export const MERGED_CELLS = GRID_7.filter(
	({ column, row }) => (column + row) % 2 === 0,
);
/** An X across the grid: failed, checks failing. */
export const ERROR_CELLS = GRID_4.filter((_, index) =>
	[0, 3, 5, 6, 9, 10, 12, 15].includes(index),
);

/** Cells lit while paused (or with reduced motion), per animation. */
export const STEADY_HIGHLIGHT = new Set([1, 3, 4, 9, 12, 14]);
export const WORKING_HIGHLIGHT = new Set([2, 8, 13, 17, 24, 31, 35, 40, 46]);
export const CHECKS_HIGHLIGHT = new Set([0, 8, 16, 24, 32, 40, 48]);
export const WAITING_STATIC = new Set([4, 5, 6, 7]);
export const SETUP_RING = new Set([0, 1, 2, 3, 7, 11, 15, 14, 13, 12, 8, 4]);
export const SETUP_CORNERS = new Set([0, 3, 12, 15]);
const SETUP_ORDER = [0, 1, 2, 3, 11, 0, 0, 4, 10, 0, 0, 5, 9, 8, 7, 6];

const percent = (value: number) => `${(value / CANVAS) * 100}%`;
const placeCell = ({ x, y }: MatrixCell, size: number): CSSProperties => ({
	height: percent(size),
	left: percent(x),
	top: percent(y),
	width: percent(size),
});

type CellStyle = CSSProperties & Record<`--${string}`, string>;

/** Per-cell phases for the pulse, setting-up and waiting waves (4x4). */
export const PULSE_STYLES: CellStyle[] = GRID_4.map((cell, index) => {
	const phase = (((index * 47 + 13) % 97) / 97) * Math.PI * 2;
	const speed = 1.25 + ((index * 29 + 7) % 17) / 17;
	const waiting =
		(Math.PI * 2 - Math.floor(index / 4) * (Math.PI / 2)) % (Math.PI * 2);
	const setup =
		(Math.PI * 2 + Math.PI / 2 - (SETUP_ORDER[index] ?? 0) * (Math.PI / 6)) %
		(Math.PI * 2);
	return {
		...placeCell(cell, CELL),
		"--workspace-matrix-pulse-delay": `${-phase / speed}s`,
		"--workspace-matrix-pulse-duration": `${(Math.PI * 2) / speed}s`,
		"--workspace-matrix-setup-delay": `${-setup / 4}s`,
		"--workspace-matrix-waiting-delay": `${-waiting / 3.2}s`,
	};
});

/** Per-cell twinkle for working (7x7). */
export const TWINKLE_STYLES: CellStyle[] = GRID_7.map((cell) => {
	const { index } = cell;
	const offset = ((index * 23 + 11) % 49) / 49;
	const duration = 1.15 + ((index * 17 + 5) % 13) / 13;
	return {
		...placeCell(cell, CELL),
		"--workspace-matrix-twinkle-delay": `${-offset * duration}s`,
		"--workspace-matrix-twinkle-duration": `${duration}s`,
	};
});

/** A diagonal sweep for running checks (7x7). */
export const SWEEP_STYLES: CellStyle[] = GRID_7.map((cell) => ({
	...placeCell(cell, CELL),
	"--workspace-matrix-sweep-delay": `${(cell.row + cell.column) * 0.075 - 1.5}s`,
	"--workspace-matrix-sweep-duration": "1.5s",
}));
