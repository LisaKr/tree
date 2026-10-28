import { initialData } from './seed.js';
import { applyConfirmedNoteCorrections, applyConfirmedParentage } from './model.js';

export function applyArchiveUpdates(data) {
  const updated = applyConfirmedNoteCorrections(applyConfirmedParentage(data));
  const familyId = 'f65dd4db-7b32-47c3-af5b-377648c99cb1';
  const family = updated.unions[familyId];
  const confirmed = initialData.unions[familyId];
  if (!family || family.partnerIds.length !== confirmed.partnerIds.length || !confirmed.partnerIds.every((id) => family.partnerIds.includes(id))) return updated;
  const missingPeople = confirmed.childIds.filter((id) => !updated.persons[id]);
  const missingChildren = confirmed.childIds.filter((id) => !family.childIds.includes(id));
  if (!missingPeople.length && !missingChildren.length) return updated;
  return {
    ...updated,
    persons: { ...updated.persons, ...Object.fromEntries(missingPeople.map((id) => [id, initialData.persons[id]])) },
    unions: { ...updated.unions, [familyId]: { ...family, childIds: [...family.childIds, ...missingChildren] } },
  };
}