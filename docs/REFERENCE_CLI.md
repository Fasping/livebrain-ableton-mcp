# Reference CLI

The CLI and MCP tools use the same `ReferenceService`.

```bash
livebrain reference-add --audio PATH --title TITLE --groups afterhours_2019,weird_minimal
livebrain reference-analyze --id UUID
livebrain reference-tag --id UUID --tags dry,alien --groups machine_funk
livebrain reference-rate --id UUID --ratings '{"groove":0.95,"darkness":0.8}' --notes "Strong long-cycle groove"
livebrain reference-get --id UUID
livebrain reference-list --group afterhours_2019
livebrain reference-build-profile --group afterhours_2019
```

Use `--data-dir PATH` to override `LIVEBRAIN_DATA_DIR`. The local path index must remain private and uncommitted.
