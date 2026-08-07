# Feedback Engine

Every drum or bass generation receives a UUID, profile/version, seed, structured parameters and generated feature summary.

`feedback_generation` stores ratings, tags and a note locally. `feedback_get_preferences` reports tag frequencies and mean ratings. This is statistical preference memory, not neural-network retraining.

Current persistence is local JSON under `data/feedback`. Future personal profiles such as `natural-goofy@0.1` will use accepted/rejected generation statistics without inventing initial values.
