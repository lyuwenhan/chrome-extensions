const fs = require("fs");
const path = require("path");
const {
	execSync
} = require("child_process");
const root = process.cwd();
const excluded = [".git", ".github", "docs", "node_modules", "scripts"];
const dataDir = path.join(root, "docs");
if (!fs.existsSync(dataDir)) {
	fs.mkdirSync(dataDir, {
		recursive: true
	})
}
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
const dirs = fs.readdirSync(root).filter(d => !excluded.includes(d) && fs.existsSync(path.join(root, d, "manifest.json")));
let hasError = false;
for (const dir of dirs) {
	try {
		console.log(`Processing ${dir}...`);
		const extensionsDir = path.join(dataDir, dir);
		const extPath = path.join(root, dir);
		const statusPath = path.join(extPath, "status.json");
		let status = {};
		try {
			status = JSON.parse(fs.readFileSync(statusPath, "utf8"))
		} catch {
			console.warn(`${dir}: invalid or missing status.json, using default.`)
		}
		if (status?.needsUpdate) {
			fs.rmSync(extensionsDir, {
				recursive: true,
				force: true
			});
			fs.mkdirSync(extensionsDir, {
				recursive: true
			});
			const manifestPath = path.join(extPath, "manifest.json");
			let hasIcon = false;
			const icon128Path = path.join(extPath, "icons", "icon128.png");
			if (fs.existsSync(icon128Path)) {
				const targetPath = path.join(extensionsDir, "icon.png");
				fs.copyFileSync(icon128Path, targetPath);
				console.log(`Icon copied: ${icon128Path} -> ${targetPath}`);
				hasIcon = true
			} else {
				console.warn(`icon128.png not found for ${dir}`)
			}
			const readmePath = path.join(extPath, "README.md");
			if (fs.existsSync(readmePath)) {
				const targetPath = path.join(extensionsDir, "README.md");
				fs.copyFileSync(readmePath, targetPath);
				console.log(`Icon copied: ${readmePath} -> ${targetPath}`);
				hasIcon = true
			} else {
				console.warn(`README.md not found for ${dir}`)
			}
			const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
			const version = manifest.version;
			const displayName = manifest.name;
			const description = manifest.description || "";
			const isNew = !versions[dir];
			if (isNew) {
				console.log(`New extension detected: ${dir}`);
				versions[dir] = {
					version,
					hasIcon,
					href: "",
					displayName,
					description
				}
			} else {
				versions[dir].version = version;
				versions[dir].hasIcon = hasIcon;
				versions[dir].displayName = displayName;
				versions[dir].description = description
			}
			const outFile = path.join(extensionsDir, `${dir}.zip`);
			console.log(`Packing ${dir} -> ${outFile}`);
			execSync(`zip -r "${outFile}" . -x "*.git*"`, {
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
		console.error(`Failed processing ${dir}: ${err.message}`)
	}
}
fs.writeFileSync(versionsPath, JSON.stringify(versions) + "\n", "utf8");
if (hasError) {
	process.exit(1)
}
