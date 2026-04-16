import Module from "node:module";
import * as path from "node:path";

const STUB_PATH = path.resolve(__dirname, "vscode-stub.js");
const resolver = Module as unknown as {
	_resolveFilename: (
		request: string,
		parent: unknown,
		...rest: unknown[]
	) => string;
};
const original = resolver._resolveFilename;
resolver._resolveFilename = function (
	request: string,
	parent: unknown,
	...rest: unknown[]
): string {
	if (request === "vscode") {
		return STUB_PATH;
	}
	return original.call(this, request, parent, ...rest);
};
