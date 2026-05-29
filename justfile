CLUSTER_SCRIPT := "docker/dev/entrypoint.sh"

up:
    bash {{CLUSTER_SCRIPT}}

down:
    docker compose down
