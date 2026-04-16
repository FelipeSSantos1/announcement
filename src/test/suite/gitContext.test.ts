import * as assert from "assert";
import { parseRemoteUrl } from "../../gitContext";

suite("parseRemoteUrl", () => {
	test("parses https URL with .git suffix", () => {
		assert.deepStrictEqual(
			parseRemoteUrl("https://github.com/our-org/phoenix.git"),
			{ owner: "our-org", repo: "phoenix" },
		);
	});
	test("parses https URL without .git suffix", () => {
		assert.deepStrictEqual(
			parseRemoteUrl("https://github.com/our-org/phoenix"),
			{ owner: "our-org", repo: "phoenix" },
		);
	});
	test("parses ssh URL", () => {
		assert.deepStrictEqual(
			parseRemoteUrl("git@github.com:our-org/phoenix.git"),
			{ owner: "our-org", repo: "phoenix" },
		);
	});
	test("parses ssh URL without .git suffix", () => {
		assert.deepStrictEqual(parseRemoteUrl("git@github.com:our-org/phoenix"), {
			owner: "our-org",
			repo: "phoenix",
		});
	});
	test("returns null for non-github URL", () => {
		assert.strictEqual(parseRemoteUrl("https://gitlab.com/foo/bar.git"), null);
	});
	test("returns null for empty string", () => {
		assert.strictEqual(parseRemoteUrl(""), null);
	});
});
