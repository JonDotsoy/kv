KV_BIN="kv"

build: preparepkg build@esm build@types

preparepkg:
	cat package.json | jq '"export const pkg = \({version:.version}) as const;"' -r > src/pkg.ts

build@esm:
	rm -rf ./lib/esm/
	bunx tsc --project tsconfig.esm.json --outDir ./lib/esm/
	echo '{ "type": "module" }' > ./lib/esm/package.json

build@types:
	rm -rf ./lib/types/
	bunx tsc --project tsconfig.types.json --outDir ./lib/types/
	echo '{ "type": "module" }' > ./lib/types/package.json

compile:
	bun build bin/cli.ts --compile --outfile ${KV_BIN}
