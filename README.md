Cache Proxy

```
npm install
npm run build
npm run start
npm run test
npm run format

docker build -t hiogawa/cache-proxy:$(git rev-parse --short HEAD) .
docker push hiogawa/cache-proxy:$(git rev-parse --short HEAD)
```
