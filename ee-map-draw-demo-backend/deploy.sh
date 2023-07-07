gcloud builds submit \
    --tag gcr.io/ee-map-draw-demo/ee-map-draw-demo-backend

gcloud run deploy \
   --region us-central1 \
   --allow-unauthenticated \
   --image gcr.io/ee-map-draw-demo/ee-map-draw-demo-backend \
   --port 8080 \
   ee-map-draw-demo-backend
