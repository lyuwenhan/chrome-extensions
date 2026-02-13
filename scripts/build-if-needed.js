const fs = require("fs");
const path = require("path");
const {
	execSync
} = require("child_process");
const root = process.cwd();
const excluded = [".git", ".github", "extensions", "node_modules", "scripts"];
const versionsPath = path.join(root, "versions.json");
let versions = {};
if (fs.existsSync(versionsPath)) {
	try {
		versions = JSON.parse(fs.readFileSync(versionsPath, "utf8"))
	} catch (e) {
		console.error("Invalid versions.json, resetting.")
	}
}
const dirs = fs.readdirSync(root).filter(d => !excluded.includes(d) && fs.existsSync(path.join(root, d, "manifest.json")));
const extensionsDir = path.join(root, "extensions");
if (!fs.existsSync(extensionsDir)) {
	fs.mkdirSync(extensionsDir, {
		recursive: true
	})
}
let hasError = false;
for (const dir of dirs) {
	try {
		console.log(`Processing ${dir}...`);
		const extPath = path.join(root, dir);
		const manifestPath = path.join(extPath, "manifest.json");
		const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
		const version = manifest.version;
		const displayName = manifest.name;
		const description = manifest.description || "";
		const isNew = !versions[dir];
		if (isNew) {
			console.log(`New extension detected: ${dir}`);
			versions[dir] = {
				version,
				versions,
				href: "",
				displayName,
				description
			}
		} else {
			versions[dir].version = version;
			if (!versions[dir].versions) {
				versions[dir].versions = []
			}
			if (versions[dir].versions.at(-1) !== version) {
				versions[dir].versions.push(version)
			}
			versions[dir].displayName = displayName;
			versions[dir].description = description
		}
		const outFile = path.join(extensionsDir, `${dir}-${version}.zip`);
		console.log(`Packing ${dir} -> ${outFile}`);
		execSync(`zip -r "${outFile}" . -x "*.git*"`, {
			cwd: extPath,
			stdio: "inherit"
		});
		console.log(`${dir} built successfully.`)
	} catch (err) {
		hasError = true;
		console.error(`Failed processing ${dir}: ${err.message}`)
	}
}
fs.writeFileSync(versionsPath, JSON.stringify(versions) + "\n", "utf8");
if (hasError) {
	process.exit(1)
}
