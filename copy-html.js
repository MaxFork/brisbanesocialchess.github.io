/* eslint-env node */
import fs from "fs";
import path from "path";
import { globSync } from "glob";
import { minify } from "html-minifier-terser";
import chokidar from "chokidar";

const SRC_FOLDER = path.resolve("./_site");
const DEST_FOLDER = path.resolve("./_deploy");

// -------------------------
// Utility functions
// -------------------------
function ensureDir(filePath) {
	fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function getAllFiles(globPattern) {
	return globSync(globPattern, { nodir: true });
}

async function minifyHtml(content) {
	return minify(content, {
		collapseWhitespace: true,
		minifyCSS: true,
		minifyJS: true,
		removeComments: true,
		removeEmptyAttributes: true,
		removeRedundantAttributes: true,
		useShortDoctype: true,
	});
}

async function copyFile(srcPath) {
	const relativePath = path.relative(SRC_FOLDER, srcPath);
	const destPath = path.join(DEST_FOLDER, relativePath);

	ensureDir(destPath);

	if (srcPath.endsWith(".html")) {
		const content = fs.readFileSync(srcPath, "utf-8");
		const minified = await minifyHtml(content);
		fs.writeFileSync(destPath, minified, "utf-8");
	} else {
		fs.copyFileSync(srcPath, destPath);
	}
}

function removeFile(srcPath) {
	const relativePath = path.relative(SRC_FOLDER, srcPath);
	const destPath = path.join(DEST_FOLDER, relativePath);

	if (fs.existsSync(destPath)) {
		fs.unlinkSync(destPath);
	}
}

function removeDir(srcPath) {
	const relativePath = path.relative(SRC_FOLDER, srcPath);
	const destPath = path.join(DEST_FOLDER, relativePath);

	if (fs.existsSync(destPath)) {
		fs.rmSync(destPath, { recursive: true, force: true });
	}
}

// -------------------------
// Build all
// -------------------------
async function buildAll() {
	const allFiles = getAllFiles(`${SRC_FOLDER}/**/*.*`);

	for (const file of allFiles) {
		await copyFile(file);
	}
}

// -------------------------
// Watcher
// -------------------------
function watchFiles() {
	const watcher = chokidar.watch(SRC_FOLDER, {
		ignored: /(^|[/\\])\../, // ignore dotfiles
		persistent: true,
		ignoreInitial: true,
	});

	watcher
		.on("add", copyFile)
		.on("change", copyFile)
		.on("unlink", removeFile)
		.on("unlinkDir", removeDir);
}

// -------------------------
// Main
// -------------------------
(async function main() {
	const args = process.argv.slice(2);
	const watchMode = args.includes("--watch");

	await buildAll();

	if (watchMode) {
		watchFiles();
	}
})();
