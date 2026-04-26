# Changelog

## [2.1.2](https://github.com/pavelpikta/lampa-torrents-tracks/compare/v2.1.1...v2.1.2) (2026-04-26)

### CI/CD

* **deps:** bump actions/setup-node from 6.3.0 to 6.4.0 ([#41](https://github.com/pavelpikta/lampa-torrents-tracks/issues/41)) ([7aba200](https://github.com/pavelpikta/lampa-torrents-tracks/commit/7aba2009cc989e01536590d172cd117fdc438cc5))

## [2.1.1](https://github.com/pavelpikta/lampa-torrents-tracks/compare/v2.1.0...v2.1.1) (2026-04-14)

### Bug Fixes

* **ci:** update clean-caches workflow to use correct command ([#37](https://github.com/pavelpikta/lampa-torrents-tracks/issues/37)) ([9f3ebdd](https://github.com/pavelpikta/lampa-torrents-tracks/commit/9f3ebddd7a20384a5b112e7b80f4cc7854ba84e2))

### CI/CD

* **deps:** bump actions/upload-artifact from 7.0.0 to 7.0.1 ([#32](https://github.com/pavelpikta/lampa-torrents-tracks/issues/32)) ([63203e1](https://github.com/pavelpikta/lampa-torrents-tracks/commit/63203e141100af7145dfb56c9b4265f331414b00))
* **deps:** bump docker/build-push-action from 7.0.0 to 7.1.0 ([#33](https://github.com/pavelpikta/lampa-torrents-tracks/issues/33)) ([11554da](https://github.com/pavelpikta/lampa-torrents-tracks/commit/11554daa9dd3f63eb51a70c06bbfa90595ec3a22))

### Refactor

* **ci:** use gh cache delete directly ([#38](https://github.com/pavelpikta/lampa-torrents-tracks/issues/38)) ([4e1f74c](https://github.com/pavelpikta/lampa-torrents-tracks/commit/4e1f74cb95d4f41841e168bca3169dfca7a41d19))

## [2.1.0](https://github.com/pavelpikta/lampa-torrents-tracks/compare/v2.0.5...v2.1.0) (2026-04-06)

### Bug Fixes

* **ci:** correct extension name in clean-caches workflow ([bb7e55c](https://github.com/pavelpikta/lampa-torrents-tracks/commit/bb7e55c1855b6da05666012bef12ba6e9e9f6e58))

### Features

* **ci:** add workflows for cleaning and deleting caches ([#31](https://github.com/pavelpikta/lampa-torrents-tracks/issues/31)) ([dd7882d](https://github.com/pavelpikta/lampa-torrents-tracks/commit/dd7882d5bd998131a62409dcb883e956247d7237))

## [2.0.5](https://github.com/pavelpikta/lampa-torrents-tracks/compare/v2.0.4...v2.0.5) (2026-04-03)

### CI/CD

* **deps:** bump docker/login-action from 4.0.0 to 4.1.0 ([#26](https://github.com/pavelpikta/lampa-torrents-tracks/issues/26)) ([598a181](https://github.com/pavelpikta/lampa-torrents-tracks/commit/598a181c86c2e9baf051e01fe5ace343c9c8b770))

## [2.0.4](https://github.com/pavelpikta/lampa-torrents-tracks/compare/v2.0.3...v2.0.4) (2026-03-22)

### CI/CD

* **deps:** bump anchore/sbom-action from 0.23.1 to 0.24.0 ([#24](https://github.com/pavelpikta/lampa-torrents-tracks/issues/24)) ([e387cdd](https://github.com/pavelpikta/lampa-torrents-tracks/commit/e387cdd22dc89da47977459193e35b08b2288737))

## [2.0.3](https://github.com/pavelpikta/lampa-torrents-tracks/compare/v2.0.2...v2.0.3) (2026-03-16)

### Bug Fixes

* cache LRU eviction and use nullish coalescing operator ([#22](https://github.com/pavelpikta/lampa-torrents-tracks/issues/22)) ([973e4b8](https://github.com/pavelpikta/lampa-torrents-tracks/commit/973e4b80786a209b50924980c14b8171f8491722))

## [2.0.2](https://github.com/pavelpikta/lampa-torrents-tracks/compare/v2.0.1...v2.0.2) (2026-03-11)

### CI/CD

* **deps:** bump anchore/sbom-action from 0.23.0 to 0.23.1 ([#21](https://github.com/pavelpikta/lampa-torrents-tracks/issues/21)) ([c2dd469](https://github.com/pavelpikta/lampa-torrents-tracks/commit/c2dd46914fd5e8bec765e7165ddd8bbc60ff82ef))

## [2.0.1](https://github.com/pavelpikta/lampa-torrents-tracks/compare/v2.0.0...v2.0.1) (2026-03-06)

### CI/CD

* **deps:** bump docker/build-push-action from 6.19.2 to 7.0.0 ([#19](https://github.com/pavelpikta/lampa-torrents-tracks/issues/19)) ([7e85806](https://github.com/pavelpikta/lampa-torrents-tracks/commit/7e858069bd993ee44fcedb6be1af5081a539888a))
* **deps:** bump docker/login-action from 3.7.0 to 4.0.0 ([#16](https://github.com/pavelpikta/lampa-torrents-tracks/issues/16)) ([435fa76](https://github.com/pavelpikta/lampa-torrents-tracks/commit/435fa76c1d3ef2f4801cf6822a94b91138cbd8d5))
* **deps:** bump docker/metadata-action from 5.10.0 to 6.0.0 ([#18](https://github.com/pavelpikta/lampa-torrents-tracks/issues/18)) ([7791c90](https://github.com/pavelpikta/lampa-torrents-tracks/commit/7791c90352e8257b4d31ee1a5b092e9a6eb58626))
* **deps:** bump docker/setup-buildx-action from 3.12.0 to 4.0.0 ([#15](https://github.com/pavelpikta/lampa-torrents-tracks/issues/15)) ([90bbac6](https://github.com/pavelpikta/lampa-torrents-tracks/commit/90bbac6218488ec8f15be2e7e47264b63bf545ac))
* **deps:** bump docker/setup-qemu-action from 3.7.0 to 4.0.0 ([#17](https://github.com/pavelpikta/lampa-torrents-tracks/issues/17)) ([2fd4d34](https://github.com/pavelpikta/lampa-torrents-tracks/commit/2fd4d34c684e75322fd94c847446446f37bcc479))

## [2.0.0](https://github.com/pavelpikta/lampa-torrents-tracks/compare/v1.0.2...v2.0.0) (2026-03-04)

### ⚠ BREAKING CHANGES

* enhance caching and rate limiting features (#14)
* enhance caching and rate limiting features

### Bug Fixes

* correct rate limiting logic to return false when request limit is reached ([6001cee](https://github.com/pavelpikta/lampa-torrents-tracks/commit/6001cee8dd3715c748e1b48a694ce3bcdc09e1e7))
* enhance error handling by including additional context in error creation ([e6d5180](https://github.com/pavelpikta/lampa-torrents-tracks/commit/e6d5180bf87ab5102f5935e1da76dbc84698674b))
* enhance error handling in media analysis and torrent addition processes ([c304a64](https://github.com/pavelpikta/lampa-torrents-tracks/commit/c304a64e5862bb18c193ce1a52a85ea1aa9bec83))
* improve error handling in request deduplication ([27518b9](https://github.com/pavelpikta/lampa-torrents-tracks/commit/27518b92918082987a2a53cdb41f251093cfc722))
* improve error message display in the UI ([5d2410b](https://github.com/pavelpikta/lampa-torrents-tracks/commit/5d2410b947e23d099cca965e592739d7197398f4))
* improve validation error handling for hash and index parameters ([800cc78](https://github.com/pavelpikta/lampa-torrents-tracks/commit/800cc786f64da3c1b497deed4b151f6cd14239ca))
* modify health check to use environment variable for HTTP port ([c8b3d5d](https://github.com/pavelpikta/lampa-torrents-tracks/commit/c8b3d5d38a79109541fa72810b444a138a32594e))
* update Cache-Control header to use dynamic max-age based on CACHE_TTL_MS ([0b2c305](https://github.com/pavelpikta/lampa-torrents-tracks/commit/0b2c3057da06ebc35382073da89963cb2cdbbebc))
* update error handling to use predefined error messages for consistency ([3126cb2](https://github.com/pavelpikta/lampa-torrents-tracks/commit/3126cb2054eb1df1a73e7314bbe71a7ac2862cb4))
* update health check to use dynamic HTTP port ([1ae0ad8](https://github.com/pavelpikta/lampa-torrents-tracks/commit/1ae0ad834e9f72db04ff80126d366fd773f24930))

### Docs

* add AI documentation section ([52262ce](https://github.com/pavelpikta/lampa-torrents-tracks/commit/52262ce68e76cf43f0e87bcc40ae0239b0ed1e16))
* update README to include TRUSTED_PROXY_IPS variable and clarify hash parameter formats in API documentation ([fbfe8f0](https://github.com/pavelpikta/lampa-torrents-tracks/commit/fbfe8f076daec588732993332bc807624d13caef))

### Features

* add `SERVICE_SHUTTING_DOWN` error code ([b604415](https://github.com/pavelpikta/lampa-torrents-tracks/commit/b604415f90ffdb481ffcb7e69fa64a47f01a255b))
* add parseEnvPositiveInt function for positive integer validation ([66304b3](https://github.com/pavelpikta/lampa-torrents-tracks/commit/66304b3e70cf0ab032d857e6fe723c3102309bf5))
* add safeStringify function for improved logging context serialization ([ce3c916](https://github.com/pavelpikta/lampa-torrents-tracks/commit/ce3c916bed03acdc211e17990c6fac495d993d86))
* add support for trusted proxy IPs and improve client IP derivation logic ([df63cd3](https://github.com/pavelpikta/lampa-torrents-tracks/commit/df63cd32abaf83beb157f6db1c32af549d0dcef5))
* enhance hash extraction logic to support base32 format and improve error handling ([d7b516d](https://github.com/pavelpikta/lampa-torrents-tracks/commit/d7b516d2be76e75558d9dacb31d1796f6bf0bcf8))
* implement base32 to hex conversion for torrent hash extraction ([2ee5ce1](https://github.com/pavelpikta/lampa-torrents-tracks/commit/2ee5ce1a7a8bdc81221dda2e112dcb55c3e890c9))
* implement graceful shutdown logic with timeout handling for HTTP server ([a63016e](https://github.com/pavelpikta/lampa-torrents-tracks/commit/a63016e555b187be1e296d4d7684d45339053b13))
* enhance caching and rate limiting features ([2b3c925](https://github.com/pavelpikta/lampa-torrents-tracks/commit/2b3c925c9ff4f2c1be2a22b71592f80a5defd351))
* enhance caching and rate limiting features ([#14](https://github.com/pavelpikta/lampa-torrents-tracks/issues/14)) ([cf9a819](https://github.com/pavelpikta/lampa-torrents-tracks/commit/cf9a81910a56a1185f9ba3a33f1ce0c501154848))

### Refactor

* formatting and restructuring callback invocations ([e1ff381](https://github.com/pavelpikta/lampa-torrents-tracks/commit/e1ff381071f260b07cd0d8d1263abf7fbcbfd90f))
* simplify callback invocation syntax in createTorrServerClient function ([0caf419](https://github.com/pavelpikta/lampa-torrents-tracks/commit/0caf41902ba1761654d5839a26342b08440edb90))

## [1.0.2](https://github.com/pavelpikta/lampa-torrents-tracks/compare/v1.0.1...v1.0.2) (2026-03-04)

### CI/CD

* **deps:** bump actions/attest-build-provenance from 3.2.0 to 4.1.0 ([#9](https://github.com/pavelpikta/lampa-torrents-tracks/issues/9)) ([b7f2a69](https://github.com/pavelpikta/lampa-torrents-tracks/commit/b7f2a69ac7ffa04851604d7abc90739f6d231db1))
* **deps:** bump actions/setup-node from 6.2.0 to 6.3.0 ([#12](https://github.com/pavelpikta/lampa-torrents-tracks/issues/12)) ([6e52662](https://github.com/pavelpikta/lampa-torrents-tracks/commit/6e526624abddfc967d555ebb64023a1111dc4a87))
* **deps:** bump actions/upload-artifact from 6.0.0 to 7.0.0 ([#10](https://github.com/pavelpikta/lampa-torrents-tracks/issues/10)) ([ae4f590](https://github.com/pavelpikta/lampa-torrents-tracks/commit/ae4f590de751b1be46d666baa2237a03467d0b24))
* **deps:** bump anchore/sbom-action from 0.22.2 to 0.23.0 ([#11](https://github.com/pavelpikta/lampa-torrents-tracks/issues/11)) ([68ee49a](https://github.com/pavelpikta/lampa-torrents-tracks/commit/68ee49a1e1e294705586de44199e38183e728f27))

## [1.0.1](https://github.com/pavelpikta/lampa-torrents-tracks/compare/v1.0.0...v1.0.1) (2026-02-13)

### CI/CD

* **deps:** bump docker/build-push-action from 6.18.0 to 6.19.2 ([#3](https://github.com/pavelpikta/lampa-torrents-tracks/issues/3)) ([fb68164](https://github.com/pavelpikta/lampa-torrents-tracks/commit/fb68164af0a501351f7dcfdbafe757397d0f947c))

### Other

* add `CHANGELOG.md` to Prettier ignore list ([2a78e85](https://github.com/pavelpikta/lampa-torrents-tracks/commit/2a78e855ed206befb5c182412d84175eeb05a4cc))

## [1.0.0](https://github.com/pavelpikta/lampa-torrents-tracks/compare/...v1.0.0) (2026-02-09)

### Bug Fixes

* improve path normalization ([7f232b8](https://github.com/pavelpikta/lampa-torrents-tracks/commit/7f232b85fd47b82de4b19e69b19edad63af52241))

### CI/CD

* add CI/CD workflows and semantic release configuration ([bc7ca3f](https://github.com/pavelpikta/lampa-torrents-tracks/commit/bc7ca3f2b8851499130f8a3f20fa3e798c842d35))
* update Docker build workflow to use 'main' tag for main branch ([a85ab37](https://github.com/pavelpikta/lampa-torrents-tracks/commit/a85ab37506a7dfeb3e90840c68bfbf0d461d9de0))

### Features

* add tracks.js  lampa plugin for audio and subtitle management ([1d512ae](https://github.com/pavelpikta/lampa-torrents-tracks/commit/1d512aecd728e3fc44104859fbc718e59f6afd3a))

### Other

* add .releaserc.yaml to Prettier ignore list ([f354487](https://github.com/pavelpikta/lampa-torrents-tracks/commit/f35448792fe5e2852d84085a9f9ca70143644417))
* initial commit ([8ef1a7c](https://github.com/pavelpikta/lampa-torrents-tracks/commit/8ef1a7cd25d71d6343bb17f2e6bfa6966e52d6c4))
* remove Babel parser and related dependencies from ESLint configuration ([4ca0f5b](https://github.com/pavelpikta/lampa-torrents-tracks/commit/4ca0f5b9d66a6ca24ece3ea408c1d5e34e813563))

### Refactor

* clean up formatting ([dcb07bc](https://github.com/pavelpikta/lampa-torrents-tracks/commit/dcb07bc3dba5222a57a5072b8e9e6b97ae05e828))
* streamline channel layout formatting in app.js ([c1e5df3](https://github.com/pavelpikta/lampa-torrents-tracks/commit/c1e5df3c5b491747e283ae406fea91b2065adb98))
