import { spawnSync } from 'node:child_process';

const isWindows = process.platform === 'win32';

function run(command, args) {
	const options = { stdio: 'inherit', shell: isWindows };

	const result = spawnSync(command, args, options);
	if (result.error) {
		console.error(result.error.message);
		process.exit(1);
	}
	process.exit(result.status ?? 1);
}

if (isWindows) {
	console.warn(
		'@cloudflare/next-on-pages is validated on Linux/CI. ' +
		'Running next build locally on Windows to catch strict TypeScript and production Next.js build failures.',
	);
	run('npx.cmd', ['next', 'build']);
}

run('npx', ['@cloudflare/next-on-pages']);
