#!/usr/bin/env node
import { parseArgs } from "node:util";
import { loadConfig } from "./config.js";
import type { HumanRatings } from "./reference/models.js";
import { createReferenceService } from "./reference/create-reference-service.js";

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    "data-dir": { type: "string" }, audio: { type: "string" }, id: { type: "string" }, title: { type: "string" },
    artist: { type: "string" }, release: { type: "string" }, label: { type: "string" }, year: { type: "string" },
    groups: { type: "string" }, tags: { type: "string" }, ratings: { type: "string" }, notes: { type: "string" }, group: { type: "string" },
  },
});
const command = positionals[0];
const service = createReferenceService(values["data-dir"] ?? loadConfig().dataDir);
const required = (name: keyof typeof values) => { const value = values[name]; if (!value) throw new Error(`--${name} is required`); return value; };
const list = (value?: string) => value?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];

let result: unknown;
switch (command) {
  case "reference-add":
    result = await service.add(required("audio"), {
      title: required("title"), artist: values.artist, release: values.release, label: values.label,
      year: values.year ? Number(values.year) : undefined, groups: list(values.groups), tags: list(values.tags),
    });
    break;
  case "reference-analyze": result = await service.analyze(required("id")); break;
  case "reference-tag": result = await service.tag(required("id"), list(values.tags), list(values.groups)); break;
  case "reference-rate": result = await service.rate(required("id"), JSON.parse(required("ratings")) as HumanRatings, values.notes); break;
  case "reference-get": result = await service.get(required("id")); break;
  case "reference-list": result = await service.list(values.group); break;
  case "reference-build-profile": result = await service.buildProfile(required("group")); break;
  default:
    throw new Error("Commands: reference-add, reference-analyze, reference-tag, reference-rate, reference-get, reference-list, reference-build-profile");
}
process.stdout.write(JSON.stringify(result, null, 2) + "\n");
