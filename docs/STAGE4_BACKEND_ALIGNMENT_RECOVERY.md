# Stage 4 alignment — DB + specialist photo recovery

Status: local procedure documented and photo bytes roundtrip tested. No production backup, restore, bucket provisioning, secret configuration or infrastructure changes performed in this work.

## Scope and access

A PostgreSQL logical dump is NOT a backup of Storage bytes. A usable recovery set contains the previously approved DB logical backup (application public/private objects, Auth accounts/identities, history, roles/permissions manifest) AND every final WebP in the private specialist-profile-photos bucket. Do not back up original uploads; the application does not retain them.

Use the existing D: recovery-private area outside Git, with the previously verified owner-only DACL method. Use a new timestamped directory; do not overwrite older recovery sets. Credentials are supplied through local protected input/environment, never argv, stdout, chat or reports. Storage service credential is separate from the DB credential. Do not add service keys to the manifest. Production execution needs separate approval.

## Consistent capture

1. Agree a maintenance window and prevent new photo PUT/DELETE writes for the capture interval. All privileged/manual Storage writers must also stop. There is no new freeze flag or backup service in this implementation. Do not invent an infrastructure workaround: if an authorized operational write freeze cannot be arranged, STOP and mark the recovery set NOT CONSISTENT. Double listing without a write freeze does not exclude an ABA replacement.
2. Record capture start/end, the write-freeze evidence, PostgreSQL snapshot timestamp, migration list and application commit. Use the approved read-only pg_dump 17.6 / TLS / consistent snapshot workflow and preserve original role provenance separately.
3. List the dedicated bucket through the authenticated Storage API, with pagination. Download each final object via the Storage API to D:. Do not copy storage.objects rows as a substitute for bytes.
4. Accept only UUID/profile.webp paths. For each object record owner UUID, relative path, SHA-256, byte count, image/webp, width/height and capture time. Decode and verify single-frame WebP, <=512 px edge and <=250 KiB. Verify each owner belongs to auth.users and specialist_profiles in the DB backup snapshot. Unknown owners/paths, decode errors, missing objects or mismatches BLOCK the set.
5. Save the sorted object manifest, dump archive hash, migration/object scope and protected permissions manifest beside the files. Record zero photos explicitly when the bucket is empty. No email addresses, license values or credentials in the public report.
6. Re-list and validate hashes/counts while photo writes remain frozen. Compare durable Auth/account/profile/organization/job state against the DB snapshot. Durable changes require a new consistent capture; session/refresh-token rotation alone does not. Only after PASS release the freeze.
7. Mark the directory COMPLETE only after archive readability, hashes, counts and owner mapping PASS. A partial directory is not a recovery point.

## Isolated restore verification

1. Use a dedicated isolated PostgreSQL 17 + compatible Supabase Storage target. Never mix production data into the shared synthetic local QA stack. Reuse only a separately approved recovery environment; if a new environment is needed, STOP for authorization.
2. Restore the DB through the reviewed bootstrap/roles -> schema -> data -> history -> grants/RLS/functions/triggers procedure. Verify durable counts/IDs and effective permissions. Preserve and report grantor-provenance differences rather than claiming identical historical GRANT provenance.
3. Configure the private bucket through the Storage API: public=false, allowedMimeTypes=[image/webp], fileSizeLimit=256000 bytes. The exact application limit is 250 * 1024 = 256000. Install the reviewed Storage policies via the approved migration chain. If its platform Storage catalog was restored, reconcile it through supported Storage APIs; do not assume catalog rows mean bytes exist.
4. For each manifest entry verify its owner in restored Auth/specialist rows, then upload the saved final bytes using a privileged local recovery client and the exact original path. Do not reprocess images: that would change hashes. Never grant end users mutation access to simplify restore.
5. Download every restored object, verify SHA-256, size, MIME, dimensions, count and paths. Verify owner/admin read; foreign employer/anon read denial; direct API mutation denial; revoked-session denial. Verify deterministic metadata/version response. No extra objects/originals may remain.
6. Verify DB application invariants, history, RLS, grants, functions, triggers and writer restrictions using the established recovery matrix. Only the joint DB + bytes verification permits RECOVERY PASS.
7. Any production restore remains a separate, explicitly authorized incident operation.

## RPO and limits

- RPO is the age of the latest COMPLETE, jointly verified DB + photo recovery set. Without recurring backup infrastructure there is no guaranteed fixed RPO.
- After a set at T, later profile/identity changes, uploads, replacements and deletions can be lost or rolled back to T.
- A DB-only snapshot does not protect newer photo bytes and cannot claim full specialist-photo recovery.
- Consistency is guaranteed only for the documented write-frozen capture interval and validated durable state.
- Local QA tested one synthetic photo download -> manifest/hash -> delete -> upload -> download/hash roundtrip through the real Storage API. It is not a claim that a production joint backup or full photo-bearing production restore has occurred.
- Capture/restore duration depends on object count/size; measure it at the approved production preparation checkpoint instead of inventing an estimate.

## Next authorized checkpoint

CEO reviews local changes and this procedure. Before any production rollout, separately authorize fresh DB recovery preparation, Storage bucket provisioning, server-only Storage credential configuration and DB migrations/deployment. No such production operation is authorized by the local implementation prompt.
