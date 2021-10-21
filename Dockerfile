#
# COMMON
#
FROM node:14.18.1-alpine3.14 AS stage_common

RUN mkdir -p /app
WORKDIR /app


#
# BUILD
#
FROM stage_common AS stage_build

COPY package.json package-lock.json ./
RUN npm install

COPY src ./src
COPY tsconfig.json ./tsconfig.json
RUN npm run build


#
# RUN
#
FROM stage_common AS stage_run

COPY package.json package-lock.json ./
RUN npm install --production

COPY --from=stage_build /app/build ./build

ENTRYPOINT ["node", "build/index.js"]
