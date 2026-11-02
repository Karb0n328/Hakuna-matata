import { supabase } from './supabase-client.js';
import { canonicalJson, sha256Hex, countLegacyCollections, verifySnapshotIntegrity } from './legacy-reader.js';

function sameCounts(a = {}, b = {}) {
  return ['blocks','tasks','debts','exams','questions'].every((key) => Number(a[key] || 0) === Number(b[key] || 0));
}

async function markRun(runId, patch) {
  const { error } = await supabase.from('migration_runs').update(patch).eq('id', runId);
  if (error) throw error;
}

async function getOrCreateImmutableSnapshot(userId, snapshot) {
  const { data: existing, error: findError } = await supabase
    .from('legacy_snapshots')
    .select('id, snapshot, snapshot_hash, counts')
    .eq('snapshot_hash', snapshot.hash)
    .maybeSingle();
  if (findError) throw findError;
  if (existing) return existing;

  const { data, error } = await supabase
    .from('legacy_snapshots')
    .insert({
      user_id: userId,
      snapshot: snapshot.state,
      snapshot_hash: snapshot.hash,
      counts: snapshot.counts,
      source_db: snapshot.source.db,
      source_store: snapshot.source.store,
      source_key: snapshot.source.key
    })
    .select('id, snapshot, snapshot_hash, counts')
    .single();
  if (error) throw error;
  return data;
}

async function createInitialAppState(userId, snapshot) {
  const { data: existing, error: readError } = await supabase
    .from('app_state')
    .select('user_id, state, state_hash, revision, migrated_from_legacy')
    .eq('user_id', userId)
    .maybeSingle();
  if (readError) throw readError;

  if (existing) {
    if (existing.state_hash !== snapshot.hash) {
      throw new Error('Bulutta bu hesap için farklı bir Hakuna state zaten var. Güvenlik için eski state bunun üzerine yazılmadı.');
    }
    return existing;
  }

  const { data, error } = await supabase
    .from('app_state')
    .insert({
      user_id: userId,
      state: snapshot.state,
      state_hash: snapshot.hash,
      revision: 1,
      migrated_from_legacy: true
    })
    .select('user_id, state, state_hash, revision, migrated_from_legacy')
    .single();
  if (error) throw error;
  return data;
}

export async function migrateLegacySnapshot(user, snapshot) {
  if (!user?.id) throw new Error('Migration için giriş yapmalısın.');

  const localVerification = await verifySnapshotIntegrity(snapshot);
  if (!localVerification.ok) throw new Error('Yerel snapshot bütünlük kontrolünden geçmedi.');

  const { data: run, error: runError } = await supabase
    .from('migration_runs')
    .insert({
      user_id: user.id,
      local_hash: snapshot.hash,
      local_counts: snapshot.counts,
      status: 'started'
    })
    .select('id')
    .single();
  if (runError) throw runError;

  try {
    const cloudSnapshot = await getOrCreateImmutableSnapshot(user.id, snapshot);
    const cloudState = await createInitialAppState(user.id, snapshot);

    await markRun(run.id, {
      snapshot_id: cloudSnapshot.id,
      cloud_snapshot_hash: cloudSnapshot.snapshot_hash,
      cloud_state_hash: cloudState.state_hash,
      cloud_counts: countLegacyCollections(cloudState.state),
      status: 'uploaded'
    });

    const [{ data: snapshotReadback, error: snapshotReadError }, { data: stateReadback, error: stateReadError }] = await Promise.all([
      supabase.from('legacy_snapshots').select('id, snapshot, snapshot_hash, counts').eq('id', cloudSnapshot.id).single(),
      supabase.from('app_state').select('state, state_hash').eq('user_id', user.id).single()
    ]);
    if (snapshotReadError) throw snapshotReadError;
    if (stateReadError) throw stateReadError;

    const readbackSnapshotHash = await sha256Hex(canonicalJson(snapshotReadback.snapshot));
    const readbackStateHash = await sha256Hex(canonicalJson(stateReadback.state));
    const readbackCounts = countLegacyCollections(stateReadback.state);

    const hashesMatch =
      snapshot.hash === snapshotReadback.snapshot_hash &&
      snapshot.hash === stateReadback.state_hash &&
      snapshot.hash === readbackSnapshotHash &&
      snapshot.hash === readbackStateHash;

    const countsMatch =
      sameCounts(snapshot.counts, snapshotReadback.counts) &&
      sameCounts(snapshot.counts, readbackCounts);

    if (!hashesMatch || !countsMatch) {
      throw new Error('Bulut geri-okuma doğrulaması eşleşmedi. Eski IndexedDB değişmeden bırakıldı.');
    }

    await markRun(run.id, {
      cloud_snapshot_hash: readbackSnapshotHash,
      cloud_state_hash: readbackStateHash,
      cloud_counts: readbackCounts,
      status: 'verified',
      verified_at: new Date().toISOString(),
      error_message: null
    });

    return {
      ok: true,
      runId: run.id,
      snapshotId: cloudSnapshot.id,
      hash: snapshot.hash,
      counts: readbackCounts
    };
  } catch (error) {
    try {
      await markRun(run.id, {
        status: 'failed',
        error_message: String(error?.message || error).slice(0, 1000)
      });
    } catch (_) {}
    throw error;
  }
}
