# Reference CLI

The CLI and MCP tools use the same `ReferenceService`.

```bash
livebrain reference-add --audio PATH --title TITLE --groups afterhours_2019,weird_minimal
livebrain reference-analyze --id UUID
livebrain reference-tag --id UUID --tags dry,alien --groups machine_funk
livebrain reference-rate --id UUID --ratings '{"groove":9.5,"darkness":8}' --notes "Strong long-cycle groove"
livebrain reference-set-influence --id UUID --influence '{"groove":1,"bass":0,"arrangement":0.8}'
livebrain reference-get --id UUID
livebrain reference-list --group afterhours_2019
livebrain reference-build-profile --group afterhours_2019
livebrain reference-explain-profile --profile-id afterhours_2019
livebrain reference-seed-curated-priors
```

Use `--data-dir PATH` to override `LIVEBRAIN_DATA_DIR`. The local path index must remain private and uncommitted.
