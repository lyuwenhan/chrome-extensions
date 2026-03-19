const fs = require("fs");
const path = require("path");
const {
	spawnSync
} = require("child_process");
const root = process.cwd();
const dataDir = path.join(root, "data");
const distDir = path.join(dataDir, "dist");
const assetsDir = path.join(dataDir, "assets");
fs.mkdirSync(distDir, {
	recursive: true
});
fs.mkdirSync(assetsDir, {
	recursive: true
});
const versionsPath = path.join(dataDir, "versions.json");
let versions = {};
if (fs.existsSync(versionsPath)) {
	try {
		versions = JSON.parse(fs.readFileSync(versionsPath, "utf8"))
	} catch (e) {
		console.error("Invalid versions.json, resetting.")
	}
}
const defaultStatus = {
	needsUpdate: false
};
const excluded = [".git", ".github", "data", "node_modules", "scripts"];
const dirs = fs.readdirSync(root).filter(d => !excluded.includes(d) && fs.existsSync(path.join(root, d, "manifest.json")));
let hasError = false;
for (const dir of dirs) {
	try {
		console.log(`Processing ${dir}...`);
		const extensionsDir = path.join(assetsDir, dir);
		const extPath = path.join(root, dir);
		const statusPath = path.join(extPath, "status.json");
		let status = {};
		try {
			status = JSON.parse(fs.readFileSync(statusPath, "utf8"))
		} catch {
			console.warn(`${dir}: invalid or missing status.json, using default.`)
		}
		if (status.needsUpdate) {
			fs.mkdirSync(extensionsDir, {
				recursive: true
			});
			let hasIcon = false;
			const iconPath = path.join(extPath, "icons", "icon128.png");
			if (fs.existsSync(iconPath)) {
				const targetPath = path.join(extensionsDir, "icon.png");
				fs.copyFileSync(iconPath, targetPath);
				console.log(`Icon copied: ${iconPath} -> ${targetPath}`);
				hasIcon = true
			} else {
				console.warn(`Icon not found for ${dir}`)
			}
			const files = fs.readdirSync(extPath);
			const readmeFiles = files.filter(name => /^README.*\.md$/.test(name));
			if (readmeFiles.length > 0) {
				const readmeDir = path.join(extensionsDir, "README");
				fs.rmSync(readmeDir, { recursive: true, force: true });
				fs.mkdirSync(readmeDir, {
					recursive: true
				});
				for (const file of readmeFiles) {
					const sourcePath = path.join(extPath, file);
					const targetPath = path.join(readmeDir, file);
					fs.copyFileSync(sourcePath, targetPath);
					console.log(`README copied: ${sourcePath} -> ${targetPath}`);
				}
			} else {
				console.warn(`README*.md not found for ${dir}`);
			}
			const manifestPath = path.join(extPath, "manifest.json");
			const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
			const version = manifest.version;
			const displayName = manifest.name;
			const description = manifest.description || "";
			if (!versions[dir]) {
				console.log(`New extension detected: ${dir}`);
				versions[dir] = {
					version,
					hasIcon,
					displayName,
					description,
					link: {}
				}
			} else {
				versions[dir] = {
					version: version ?? versions[dir].version,
					hasIcon: hasIcon ?? versions[dir].hasIcon,
					displayName: displayName ?? versions[dir].displayName,
					description: description ?? versions[dir].description,
					link: versions[dir].link ?? {}
				}
			}
			const outFile = path.join(distDir, `${dir}.zip`);
			console.log(`Packing ${dir} -> ${outFile}`);
			spawnSync("zip", ["-r", outFile, "."], {
				cwd: extPath,
				stdio: "inherit"
			});
			console.log(`${dir} built successfully.`)
		} else {
			console.log(`Skip ${dir}: no new content`)
		}
		fs.writeFileSync(statusPath, JSON.stringify(defaultStatus, null, "\t") + "\n", "utf8")
	} catch (err) {
		hasError = true;
		console.error(`Failed processing ${dir}: ${err.message}`);
		console.error(err.stack)
	}
}
fs.writeFileSync(versionsPath, JSON.stringify(versions, null, "\t") + "\n", "utf8");
if (hasError) {
	process.exit(1)
}
