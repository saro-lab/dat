``` shell
uv cache clean
uv build
uv run pytest
uv publish
```

setup uv
- https://docs.astral.sh/uv/getting-started/installation/



- clear
```
rm -rf .venv uv.lock
uv cache clean
uv venv --python 3.12
uv pip install -e .
uv pip install pytest
```