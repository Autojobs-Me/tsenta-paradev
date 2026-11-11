import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure } from "../../../index";

const PER_PAGE = 100;

// tsenta:fork: GitHub filters by name, newest first, so any of a big repo's
// branches can match; the REST list stopped at its first 100 names.
const REFS_QUERY = `query($owner: String!, $repo: String!, $q: String) {
  repository(owner: $owner, name: $repo) {
    refs(refPrefix: "refs/heads/", query: $q, first: ${PER_PAGE}, orderBy: { field: TAG_COMMIT_DATE, direction: DESC }) {
      nodes { name }
    }
  }
}`;

const ghRefsSchema = z.object({
	data: z.object({
		repository: z.object({
			refs: z.object({ nodes: z.array(z.object({ name: z.string() })) }),
		}),
	}),
});

/**
 * Branches for a repo the user may not have checked out, read through `gh`
 * so it uses their own `gh auth login` — the same path issue and PR lookups
 * take. Cloud workspaces need this: the sandbox is the only checkout, so
 * there is no local repo for `searchBranches` to enumerate.
 */
export const searchRemoteBranches = protectedProcedure
	.input(
		z.object({
			owner: z.string().min(1),
			repo: z.string().min(1),
			query: z.string().optional(),
		}),
	)
	.query(async ({ ctx, input }) => {
		let raw: unknown;
		try {
			const query = input.query?.trim();
			raw = await ctx.execGh([
				"api",
				"graphql",
				"-f",
				`query=${REFS_QUERY}`,
				"-f",
				`owner=${input.owner}`,
				"-f",
				`repo=${input.repo}`,
				...(query ? ["-f", `q=${query}`] : []),
			]);
		} catch (error) {
			throw new TRPCError({
				code: "PRECONDITION_FAILED",
				message:
					"Could not list branches from GitHub. Check `gh auth status` on this device.",
				cause: error,
			});
		}

		const parsed = ghRefsSchema.safeParse(raw);
		if (!parsed.success) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Unexpected branch payload from gh",
			});
		}

		const needle = input.query?.trim().toLowerCase();
		const items = parsed.data.data.repository.refs.nodes
			.map((branch) => branch.name)
			.filter((name) => (needle ? name.toLowerCase().includes(needle) : true))
			// An exact match leads; the rest keep GitHub's newest-first order.
			.sort(
				(a, b) =>
					Number(b.toLowerCase() === needle) -
					Number(a.toLowerCase() === needle),
			);

		return { items };
	});
