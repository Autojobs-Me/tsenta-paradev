import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolveBundledCliPath } from "main/lib/bundled-cli";
import { z } from "zod";
import { publicProcedure, router } from "../..";
import { getProcessEnvWithShellPath } from "../workspaces/utils/shell-env";
import { createBoxesLister } from "./list-boxes";

export type {
	BoxesListOptions,
	BoxesListResult,
	BoxStatus,
} from "./list-boxes";

const execFileAsync = promisify(execFile);

/**
 * Paradev Boxes (fork-owned). Provider state for boxes, read with this app's
 * bundled CLI and the provider keys on this machine, so it needs no Paradev
 * sign-in. The login-shell PATH lets the CLI find `bl` for a Blaxel login
 * when the app was opened from the Dock or Finder.
 */
const listBoxes = createBoxesLister({
	resolveCliPath: () => resolveBundledCliPath(),
	getEnv: () => getProcessEnvWithShellPath(process.env),
	run: (file, args, options) =>
		execFileAsync(file, [...args], { ...options, encoding: "utf8" }),
});

export const createBoxesRouter = () => {
	return router({
		// No input reads through the 15 s cache; { fresh: true } waits for a
		// run that started after the call (after a wake or stop finished).
		list: publicProcedure
			.input(z.object({ fresh: z.boolean().optional() }).optional())
			.query(({ input }) => listBoxes({ fresh: input?.fresh })),
	});
};

export type BoxesRouter = ReturnType<typeof createBoxesRouter>;
