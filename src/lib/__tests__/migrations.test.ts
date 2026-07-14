import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function readMigration(fileName: string) {
  const filePath = path.join(process.cwd(), 'supabase', 'migrations', fileName);
  return fs.readFileSync(filePath, 'utf8');
}

describe('Phase 19 migration: 003_building_and_room_infrastructure.sql', () => {
  const sql = readMigration('003_building_and_room_infrastructure.sql');

  it('creates required inventory tables with IF NOT EXISTS guards', () => {
    expect(sql).toMatch(/create table if not exists buildings\s*\(/i);
    expect(sql).toMatch(/create table if not exists room_types\s*\(/i);
    expect(sql).toMatch(/create table if not exists rooms\s*\(/i);
    expect(sql).toMatch(/create table if not exists cots\s*\(/i);
    expect(sql).toMatch(/create table if not exists hosteler_room_assignments\s*\(/i);
  });

  it('enforces uniqueness constraints required for owner/building/room/cot boundaries', () => {
    expect(sql).toMatch(/constraint\s+buildings_owner_name_unique\s+unique\s*\(owner_id,\s*name\)/i);
    expect(sql).toMatch(/constraint\s+room_types_owner_name_unique\s+unique\s*\(owner_id,\s*name\)/i);
    expect(sql).toMatch(/constraint\s+rooms_building_room_number_unique\s+unique\s*\(building_id,\s*room_number\)/i);
    expect(sql).toMatch(/constraint\s+cots_room_label_unique\s+unique\s*\(room_id,\s*cot_id_label\)/i);
  });

  it('includes cot type and rent/cot_count validation checks', () => {
    expect(sql).toMatch(/cot_type\s+text\s+not null\s+check\s*\(cot_type\s+in\s*\('lower_cot',\s*'upper_cot'\)\)/i);
    expect(sql).toMatch(/constraint\s+room_types_base_rent_positive\s+check\s*\(base_rent\s*>\s*0\)/i);
    expect(sql).toMatch(/constraint\s+room_types_cot_count_positive\s+check\s*\(cot_count\s*>\s*0\s+and\s+cot_count\s*<=\s*10\)/i);
    expect(sql).toMatch(/constraint\s+rooms_current_rent_positive\s+check\s*\(current_rent\s*>\s*0\)/i);
  });

  it('creates expected indexes for owner/hierarchy lookups', () => {
    const expectedIndexes = [
      'idx_buildings_owner_id',
      'idx_room_types_owner_id',
      'idx_rooms_building_id',
      'idx_rooms_room_type_id',
      'idx_cots_room_id',
      'idx_cots_hosteler_id',
      'idx_hosteler_room_assignments_hosteler_id',
      'idx_hosteler_room_assignments_building_id',
      'idx_hosteler_room_assignments_room_id',
      'idx_hostelers_building_id',
      'idx_hostelers_room_id',
      'idx_hostelers_cot_id',
    ];

    for (const indexName of expectedIndexes) {
      const pattern = new RegExp(`create\\s+index\\s+if\\s+not\\s+exists\\s+${indexName}\\b`, 'i');
      expect(sql).toMatch(pattern);
    }
  });

  it('enables RLS with owner-scoped policies on inventory tables', () => {
    expect(sql).toMatch(/alter table\s+buildings\s+enable\s+row\s+level\s+security/i);
    expect(sql).toMatch(/alter table\s+room_types\s+enable\s+row\s+level\s+security/i);
    expect(sql).toMatch(/alter table\s+rooms\s+enable\s+row\s+level\s+security/i);
    expect(sql).toMatch(/alter table\s+cots\s+enable\s+row\s+level\s+security/i);
    expect(sql).toMatch(/alter table\s+hosteler_room_assignments\s+enable\s+row\s+level\s+security/i);

    expect(sql).toMatch(/create policy\s+"buildings_owner_access"/i);
    expect(sql).toMatch(/create policy\s+"room_types_owner_access"/i);
    expect(sql).toMatch(/create policy\s+"rooms_owner_access"/i);
    expect(sql).toMatch(/create policy\s+"cots_owner_access"/i);
    expect(sql).toMatch(/create policy\s+"hosteler_room_assignments_owner_access"/i);
  });

  it('contains idempotency guards for table and column additions', () => {
    expect(sql).toMatch(/alter table\s+hostelers\s+add column if not exists\s+building_id/i);
    expect(sql).toMatch(/alter table\s+hostelers\s+add column if not exists\s+room_id/i);
    expect(sql).toMatch(/alter table\s+hostelers\s+add column if not exists\s+cot_id/i);
  });
});

describe('Phase 19 migration: 004_room_configuration_history.sql', () => {
  const sql = readMigration('004_room_configuration_history.sql');

  it('creates room_configuration_history with required fields and uniqueness', () => {
    expect(sql).toMatch(/create table if not exists room_configuration_history\s*\(/i);
    expect(sql).toMatch(/room_id\s+uuid\s+not null\s+references\s+rooms\(id\)\s+on delete cascade/i);
    expect(sql).toMatch(/new_sharing_capacity\s+int\s+not null\s+check\s*\(new_sharing_capacity\s*>?=\s*1\)/i);
    expect(sql).toMatch(/new_room_class\s+text\s+not null\s+check\s*\(new_room_class\s+in\s*\('ac',\s*'non_ac'\)\)/i);
    expect(sql).toMatch(/new_rent\s+decimal\(10,\s*2\)\s+not null\s+check\s*\(new_rent\s*>\s*0\)/i);
    expect(sql).toMatch(/effective_date\s+date\s+not null/i);
    expect(sql).toMatch(/created_by\s+uuid\s+not null\s+references\s+auth\.users\(id\)/i);
    expect(sql).toMatch(/constraint\s+room_configuration_history_room_effective_unique\s+unique\s*\(room_id,\s*effective_date\)/i);
  });

  it('creates indexes for historical lookups and audit ordering', () => {
    expect(sql).toMatch(/create index if not exists\s+idx_room_configuration_history_room_id/i);
    expect(sql).toMatch(/create index if not exists\s+idx_room_configuration_history_effective_date/i);
    expect(sql).toMatch(/create index if not exists\s+idx_room_configuration_history_created_at/i);
  });

  it('enables select/insert and blocks update/delete via policies', () => {
    expect(sql).toMatch(/alter table\s+room_configuration_history\s+enable\s+row\s+level\s+security/i);
    expect(sql).toMatch(/create policy\s+"room_configuration_history_owner_select"\s+on\s+room_configuration_history\s+for\s+select/i);
    expect(sql).toMatch(/create policy\s+"room_configuration_history_owner_insert"\s+on\s+room_configuration_history\s+for\s+insert/i);
    expect(sql).toMatch(/create policy\s+"room_configuration_history_owner_no_update"\s+on\s+room_configuration_history\s+for\s+update/i);
    expect(sql).toMatch(/create policy\s+"room_configuration_history_owner_no_delete"\s+on\s+room_configuration_history\s+for\s+delete/i);
    expect(sql).toMatch(/for update[\s\S]*?using\s*\(false\)[\s\S]*?with check\s*\(false\)/i);
    expect(sql).toMatch(/for delete[\s\S]*?using\s*\(false\)/i);
  });

  it('uses idempotency guards and limits grants to immutable write model', () => {
    expect(sql).toMatch(/drop policy if exists\s+"room_configuration_history_owner_select"/i);
    expect(sql).toMatch(/drop policy if exists\s+"room_configuration_history_owner_insert"/i);
    expect(sql).toMatch(/drop policy if exists\s+"room_configuration_history_owner_no_update"/i);
    expect(sql).toMatch(/drop policy if exists\s+"room_configuration_history_owner_no_delete"/i);
    expect(sql).toMatch(/grant\s+select,\s*insert\s+on\s+room_configuration_history\s+to\s+authenticated/i);
  });
});

describe('Phase 19 migration: 006_room_type_lifecycle_and_cot_reset.sql', () => {
  const sql = readMigration('006_room_type_lifecycle_and_cot_reset.sql');

  it('adds active lifecycle support for room types with idempotent guards', () => {
    expect(sql).toMatch(/alter table if exists\s+room_types\s+add column if not exists\s+active\s+boolean\s+not null\s+default\s+true/i);
    expect(sql).toMatch(/update\s+room_types\s+set\s+active\s*=\s*true\s+where\s+active\s+is\s+null/i);
  });

  it('adds owner plus active lifecycle lookup index', () => {
    expect(sql).toMatch(/create index if not exists\s+idx_room_types_owner_active\s+on\s+room_types\(owner_id,\s*active\)/i);
  });
});