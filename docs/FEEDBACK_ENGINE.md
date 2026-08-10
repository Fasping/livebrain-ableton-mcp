# Feedback Engine

Every applied full production receives a UUID, profile/version, seed, style components, the effective StyleProfile and a generated feature summary.

`feedback_generation` stores ratings, directional tags and a note locally. Recognized tags include `bass-too-obvious`, `less-melody`, `more-melody`, `more-space`, `less-space`, `more-weird`, `less-weird`, `more-swing`, `less-swing`, `too-bright`, `too-dark`, `more-raw` and `less-raw`, plus documented Spanish equivalents.

`feedback_compare_generations` stores a winner and loser for selected dimensions such as bass, groove, melody, space or arrangement. Future style resolution moves cautiously toward the winner's parameter behavior on only those dimensions. Comparing two seeds with the same effective profile records the preference but cannot invent a parameter direction; use a directional tag or compare different style blends in that case.

`feedback_get_preferences` reports tag frequencies, mean ratings, comparison count and winning profile frequency. This is transparent local preference adaptation, not neural-network retraining.

Persistence is local JSON under `data/feedback`. The learned adjustment and its evidence count appear in every production plan, so personalization never happens invisibly.
