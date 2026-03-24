# Hugging Face Spaces: create a Space with SDK = Docker, point it at this repo.
# In Space Settings → Variables and secrets, add (at least for runtime; prefer also at build for NEXT_PUBLIC_*):
#   NEXT_PUBLIC_SUPABASE_URL
#   NEXT_PUBLIC_SUPABASE_ANON_KEY
#
# HF expects port 7860 by default (see https://huggingface.co/docs/hub/spaces-config-reference).

FROM node:20-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG NEXT_PUBLIC_SUPABASE_URL=
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

RUN npm run build && npm prune --omit=dev

ENV NODE_ENV=production
ENV PORT=7860

EXPOSE 7860

CMD ["./node_modules/.bin/next", "start"]
