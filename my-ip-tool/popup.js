const ipEl = document.getElementById("ip");
const reloadBtn = document.getElementById("reload");
async function loadIP() {
	let loadingTimer;
	let loadingShown = false;
	loadingTimer = setTimeout(() => {
		loadingShown = true;
		ipEl.textContent = "Loading…"
	}, 100);
	try {
		const res = await fetch("https://my-ip.lyuwenhan.workers.dev/", {
			cache: "no-store"
		});
		let ip = (await res.text()).trim();
		if (ip.length > 16) {
			const mid = Math.ceil(ip.length / 2);
			ip = ip.slice(0, mid) + "\n" + ip.slice(mid)
		}
		console.log(ip);
		clearTimeout(loadingTimer);
		ipEl.textContent = ip
	} catch (e) {
		clearTimeout(loadingTimer);
		if (loadingShown) {
			ipEl.textContent = "Error"
		}
	}
}
reloadBtn.addEventListener("click", loadIP);
loadIP();
