-- Older complaint-driven access resets put the generated plaintext password in
-- complaints.response, which is returned by the public Staff-ID status lookup.
-- Redact those historical values in storage as well as at the public read boundary.
UPDATE "complaints"
SET "response" = regexp_replace(
  "response",
  'temporary[[:space:]]+password[[:space:]]*:[[:space:]]*[^[:space:].,;]+',
  'Temporary password: [provided separately]',
  'gi'
)
WHERE "response" ~* 'temporary[[:space:]]+password[[:space:]]*:';
