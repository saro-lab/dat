## Create manifest
## Push "ARM64" by Mac Machine
``` shell
podman login docker.io

# manifast create
podman manifest rm sarolab-dat-cms-manifest || true
podman manifest create sarolab-dat-cms-manifest

# build --platform linux/arm64
podman build --memory=10g --memory-swap=-1 \
    --manifest sarolab-dat-cms-manifest -t sarolab/dat-cms:latest .

# push (publish)
podman manifest push sarolab-dat-cms-manifest docker.io/sarolab/dat-cms:latest
```
## Integrate manifest
## Push "AMD64" by Linux Machine
## Versioning
```
podman login docker.io

# manifast create / integrate
podman manifest rm sarolab-dat-cms-manifest || true
podman manifest create sarolab-dat-cms-manifest
podman manifest add --all sarolab-dat-cms-manifest docker://docker.io/sarolab/dat-cms:latest

# build --platform linux/amd64
podman build --memory=32g --memory-swap=-1 \
    --manifest sarolab-dat-cms-manifest -t sarolab/dat-cms:latest .

# push (publish)
podman manifest push sarolab-dat-cms-manifest docker.io/sarolab/dat-cms:latest
podman manifest push sarolab-dat-cms-manifest docker.io/sarolab/dat-cms:4.0.2
```


## Configuration
### Mac
```
# 맥은 podman이 리눅스 가상머신에서 돌아가기 때문에
# --memory 명령을 주기위해선 podman 자체의 메모리를 늘려야한다.
podman machine stop
podman machine set --memory 8000
podman machine start
```
