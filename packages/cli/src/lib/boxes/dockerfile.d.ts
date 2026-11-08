// box.Dockerfile is imported as text (Bun `with { type: "text" }`).
declare module "*.Dockerfile" {
	const content: string;
	export default content;
}
