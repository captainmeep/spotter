#!/usr/bin/env bash
# Deploys Spotter to Google Cloud: builds the images, applies database
# migrations with a Cloud Run job, then updates the Cloud Run service.
#
#   bash scripts/deploy-gcp.sh            # build, migrate and deploy
#   SKIP_BUILD=1 bash scripts/deploy-gcp.sh   # reuse the latest images
#
# Needs gcloud signed in to the project with deploy rights.
set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT=spotter-513202
PROJECT_NUMBER=914653613692
REGION=us-west1
INSTANCE="$PROJECT:$REGION:spotter-db"
REPO="$REGION-docker.pkg.dev/$PROJECT/spotter"
URL="https://spotter-$PROJECT_NUMBER.$REGION.run.app"

ENV_VARS="DB_HOST=/cloudsql/$INSTANCE,DB_NAME=spotter,DB_USER=spotter,BETTER_AUTH_URL=$URL"
SECRETS="DB_PASSWORD=db-app-password:latest,BETTER_AUTH_SECRET=better-auth-secret:latest"

gc() { gcloud --project "$PROJECT" --quiet "$@"; }

if [ -z "${SKIP_BUILD:-}" ]; then
  echo "Building images..."
  gc builds submit --region "$REGION" --config cloudbuild.yaml \
    --substitutions "_TAG=$(git rev-parse --short HEAD)-$(date +%s)" .
fi

echo "Applying database migrations..."
gc run jobs deploy spotter-tools --region "$REGION" --image "$REPO/tools:latest" \
  --set-cloudsql-instances "$INSTANCE" --set-env-vars "$ENV_VARS" --set-secrets "$SECRETS" \
  --max-retries 0 --task-timeout 600 --memory 1Gi
gc run jobs execute spotter-tools --region "$REGION" --wait

echo "Deploying the app..."
gc run deploy spotter --region "$REGION" --image "$REPO/app:latest" \
  --allow-unauthenticated --add-cloudsql-instances "$INSTANCE" \
  --set-env-vars "$ENV_VARS" --set-secrets "$SECRETS" \
  --memory 512Mi --min-instances 0 --max-instances 3

echo "Live at $URL"
