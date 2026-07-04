import { spawnSync } from 'node:child_process';

const isWindows = process.platform === 'win32';

function hasBash() {
	const result = spawnSync('bash', ['--version'], { stdio: 'ignore' });
	return result.status === 0;
}

function run(command, args) {
	const result = spawnSync(command, args, { stdio: 'inherit', shell: isWindows });
	if (result.error) {
		console.error(result.error.message);
		process.exit(1);
	}
	process.exit(result.status ?? 1);
}

if (isWindows && !hasBash()) {
	console.warn(
		'@cloudflare/next-on-pages requires bash and cannot run in this Windows shell. ' +
		'Running next build locally to catch strict TypeScript and production Next.js build failures. ' +
		'CI/Linux/WSL must still run the full Cloudflare adapter build.',
	);
	run('npx.cmd', ['next', 'build']);
}

run(isWindows ? 'npx.cmd' : 'npx', ['@cloudflare/next-on-pages']);
