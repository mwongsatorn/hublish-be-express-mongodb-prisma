# HUBLISH Backend (Typescript + Express.js + Prisma + MongoDB)

## Descriptions 📋

This is a sub repository for [Hublish](https://github.com/mwongsatorn/hublish). The backend of hublish built using

- TypeScript
- Express.js
- Prisma
- MongoDB
- Docker

## Requirements 🛠

- Nodejs (version 18.17.1 +)
- PNPM
- Docker

## Get Started 🏃

1. Clone this repository to your local machine

```bash
git clone https://github.com/mwongsatorn/hublish-be-express-mongodb-prisma
```

2. Go to the project directory
3. Run this command to install this project's packages

```bash
pnpm install
```

4. Run this command to start docker containers

```bash
docker compose up -d
```

5. Run this command to populate data inside the database (You can skip this step if you are not running the project first time or you don't want to )

```bash
pnpm seed
```

6. Run this command to start the server

```bash
pnpm dev
```
