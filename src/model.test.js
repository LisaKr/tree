import test from 'node:test';
import assert from 'node:assert/strict';
import { validateData, applyConfirmedParentage, applyConfirmedNoteCorrections, relatives, years, familyHighlight, branchColors, visitPerson, stepHistory, searchPeople, relationshipsTo } from './model.js';
import { initialData } from './seed.js';
import { applyArchiveUpdates } from './updates.js';
import { localizeData, localizePerson, localizeRelationship, savePersonInLanguage } from './localization.js';
import { layoutTree, CARD_WIDTH, CARD_HEIGHT, FAMILY_GAP, BRANCH_GAP } from './layout.js';

const person = (id) => ({ id, firstName: id, lastName: '' });

test('Roman and Lisa have two sons with Ukrainian names and no invented dates or surnames', () => {
  const family = initialData.unions['f65dd4db-7b32-47c3-af5b-377648c99cb1'];
  assert.deepEqual(family.childIds.map((id) => initialData.persons[id].firstName), ['Alexander', 'Max']);
  assert.deepEqual(family.childIds.map((id) => localizePerson(initialData.persons[id], 'uk').firstName), ['Олександр', 'Макс']);
  family.childIds.forEach((id) => {
    const child = initialData.persons[id];
    assert.equal(child.gender, 'male');
    assert.equal(child.birthDate, '');
    assert.equal(child.lastName, '');
    assert.deepEqual(relatives(initialData, id).parents.map((parent) => parent.id), family.partnerIds);
  });
});

test('older archives receive Roman and Lisa\'s sons without losing edits or adding duplicates', () => {
  const saved = structuredClone(initialData);
  const familyId = 'f65dd4db-7b32-47c3-af5b-377648c99cb1';
  const [alexander, max] = saved.unions[familyId].childIds;
  delete saved.persons[max];
  saved.unions[familyId].childIds = [alexander];
  saved.persons[alexander].note = 'An existing memory.';
  saved.persons[alexander].translations = { uk: { note: 'Збережений спогад.' } };
  const updated = validateData(applyArchiveUpdates(saved));
  assert.equal(updated.persons[alexander], saved.persons[alexander]);
  assert.deepEqual(updated.unions[familyId].childIds, [alexander, max]);
  assert.equal(applyArchiveUpdates(updated), updated);
  const unrelated = { ...saved, unions: { ...saved.unions, [familyId]: { ...saved.unions[familyId], partnerIds: [saved.unions[familyId].partnerIds[0]] } } };
  assert.equal(applyArchiveUpdates(unrelated).persons[max], undefined);
});

test('the removed zapis annotation stays absent in both languages and old saved notes', () => {
  const id = 'd9d2595b-c73c-436a-b361-662d4fc08362';
  assert.doesNotMatch(initialData.persons[id].note, /zapis 50/i);
  assert.doesNotMatch(localizePerson(initialData.persons[id], 'uk').note, /Запис 50/i);
  const saved = structuredClone(initialData);
  saved.persons[id].note = 'were evacuated there. zapis 50. back to kharkiv in 1945. A saved memory.';
  saved.persons[id].translations = { uk: { note: 'Були евакуйовані туди. Запис 50. Повернулися до Харкова. Спогад.' } };
  const corrected = applyConfirmedNoteCorrections(saved);
  assert.equal(corrected.persons[id].note, 'were evacuated there. back to kharkiv in 1945. A saved memory.');
  assert.equal(corrected.persons[id].translations.uk.note, 'Були евакуйовані туди. Повернулися до Харкова. Спогад.');
  assert.equal(corrected.unions, saved.unions);
  assert.equal(applyConfirmedNoteCorrections(corrected), corrected);
  assert.match(saved.persons[id].note, /zapis 50/);
});

test('all supplied names, places, birth names, and notes have Ukrainian translations without changing originals', () => {
  const original = JSON.stringify(initialData);
  const ukrainian = localizeData(initialData, 'uk');
  Object.values(initialData.persons).forEach((person) => {
    const translated = ukrainian.persons[person.id];
    for (const field of ['firstName', 'lastName', 'birthName', 'birthPlace', 'note']) {
      assert.equal(/[A-Za-z]/.test(translated[field] || ''), false, `${person.firstName}: ${field}`);
      if (person[field]) assert.ok(translated[field]);
    }
  });
  assert.equal(JSON.stringify(initialData), original);
  assert.equal(localizeData(initialData, 'en'), initialData);
});

test('Ukrainian edits preserve English and shared dates; unknown notes are never silently replaced', () => {
  const original = initialData.persons['7bc73a4b-3f6c-447c-b9d6-35abbf2f6a4a'];
  const draft = { ...localizePerson(original, 'uk'), note: 'Родинний спогад.', firstName: 'Леонід', birthDate: '1940' };
  const saved = savePersonInLanguage(original, draft, 'uk');
  assert.equal(saved.note, original.note);
  assert.equal(saved.firstName, original.firstName);
  assert.equal(saved.birthDate, '1940');
  assert.equal(localizePerson(saved, 'uk').note, draft.note);
  assert.equal(localizePerson(saved, 'en').note, original.note);
  assert.equal(localizePerson({ ...original, note: 'A new memory.' }, 'uk').note, 'A new memory.');
});

test('all supplied relationship labels translate to specific Ukrainian kinship terms', () => {
  const labels = relationshipsTo(initialData, '360555b9-354a-4416-a1ff-1b9ea4c8a13c');
  Object.entries(labels).forEach(([id, label]) => assert.equal(/[A-Za-z]|партнер/i.test(localizeRelationship(label, initialData.persons[id], 'uk')), false, label));
  assert.equal(localizeRelationship('Great-grandmother', {}, 'uk'), 'Прабабуся');
  assert.equal(localizeRelationship('Great-grandparent', {}, 'uk'), 'Прадідусь або прабабуся');
  assert.equal(localizeRelationship('Great-grandson', {}, 'uk'), 'Правнук');
  assert.equal(localizeRelationship("Father's first cousin", { gender: 'female' }, 'uk'), 'Двоюрідна сестра батька');
  assert.equal(localizeRelationship('Mother', {}, 'en'), 'Mother');
  assert.equal(localizeRelationship("Uncle's partner", { gender: 'female' }, 'uk'), 'Тітка');
  assert.equal(localizeRelationship("Uncle's partner", { gender: 'female' }, 'en'), "Uncle's partner");
});

test('Ukrainian partners take the matching family role throughout kinship paths', () => {
  for (const [label, gender, expected] of [
    ["Grandfather's partner", 'female', 'Бабуся'],
    ["Grandmother's partner", 'male', 'Дідусь'],
    ["Great-grandfather's partner", 'female', 'Прабабуся'],
    ["Great-great-grandfather's partner", 'female', 'Прапрабабуся'],
    ["Aunt's partner", 'male', 'Дядько'],
    ["Father's partner", 'female', 'Мати'],
    ["Mother's partner", 'male', 'Батько'],
    ["Brother's wife", 'female', 'Сестра'],
    ["Son's wife", 'female', 'Донька'],
    ["First cousin's partner", 'female', 'Двоюрідна сестра'],
    ["Father's first cousin's partner", 'male', 'Двоюрідний брат батька'],
    ["Grandfather's first cousin's partner's father", 'male', 'Батько двоюрідного родича дідуся'],
    ["Grandfather's partner", 'male', 'Дідусь'],
    ["Grandfather's partner", '', 'Бабуся'],
    ["Grandparent's partner", '', 'Дідусь або бабуся'],
    ["Uncle's former wife", 'female', 'Колишня тітка'],
    ['Partner', 'female', 'Дружина'],
    ['Partner', 'male', 'Чоловік'],
  ]) {
    assert.equal(localizeRelationship(label, { gender }, 'uk'), expected, label);
    assert.equal(localizeRelationship(label, { gender }, 'en'), label);
  }
});
const data = { version: 1, persons: Object.fromEntries(['a', 'b', 'c', 'd'].map((id) => [id, person(id)])), unions: {
  one: { id: 'one', partnerIds: ['a'], childIds: ['c'] },
  two: { id: 'two', partnerIds: ['a', 'b'], childIds: ['d'], status: 'divorced' },
} };
test('preserves explicit single-parent records without inferring a second parent', () => {
  assert.equal(validateData(data), data);
  assert.deepEqual(relatives(data, 'c').parents.map((entry) => entry.id), ['a']);
  assert.deepEqual(relatives(data, 'd').parents.map((entry) => entry.id), ['a', 'b']);
});
test('rejects missing references, malformed fields, and ancestry cycles', () => {
  assert.throws(() => validateData({ ...data, persons: {} }));
  assert.throws(() => validateData({ ...data, persons: { ...data.persons, a: { ...person('a'), note: {} } } }));
  assert.throws(() => validateData({ ...data, unions: { ...data.unions, cycle: { id: 'cycle', partnerIds: ['c'], childIds: ['a'] } } }));
});
test('retains partial dates without inventing a day', () => {
  assert.equal(years({ birthDate: '1886', deathDate: '1962-05-28' }), '1886 - 1962');
});

test('missing dates display nothing and known dates have no unknown placeholders', () => {
  assert.equal(years({}), '');
  assert.equal(years({ birthDate: '', deathDate: '' }), '');
  assert.equal(years({ birthDate: '1886' }), '1886');
  assert.equal(years({ deathDate: '1941' }), 'd. 1941');
});

test('the supplied archive has Musya, not Moisey, as Irma\'s child', () => {
  validateData(initialData);
  const irma = 'bb36199a-d7d1-4abb-981e-4d0dae1b8d3f';
  const musya = '597c8a86-65b4-4470-82b0-53f142f30460';
  const moisey = 'bb7daee8-fa3d-4f93-a1cf-122b85bcda79';
  assert.ok(relatives(initialData, musya).parents.some((entry) => entry.id === irma));
  assert.ok(!relatives(initialData, moisey).parents.some((entry) => entry.id === irma));
  assert.ok(relatives(initialData, moisey).partners.some((entry) => entry.id === musya));
  assert.equal(Object.keys(initialData.persons).length, 102);
  assert.equal(Object.keys(initialData.unions).length, 43);
});

test('the entire archive forms one connected tree without omitted people or overlapping cards', () => {
  const { nodes, edges } = layoutTree(initialData);
  const people = nodes.filter((node) => node.type === 'person');
  assert.equal(people.length, 102);
  assert.equal(new Set(people.map((node) => node.id)).size, 102);
  const neighbors = new Map(nodes.map((node) => [node.id, []]));
  edges.forEach(({ source, target }) => { neighbors.get(source).push(target); neighbors.get(target).push(source); });
  const reached = new Set();
  const queue = [nodes[0].id];
  while (queue.length) {
    const id = queue.pop();
    if (reached.has(id)) continue;
    reached.add(id);
    queue.push(...neighbors.get(id));
  }
  assert.equal(reached.size, nodes.length);
  for (const [index, first] of people.entries()) {
    for (const second of people.slice(index + 1)) {
      const overlapX = first.position.x < second.position.x + second.width && first.position.x + first.width > second.position.x;
      const overlapY = first.position.y < second.position.y + second.height && first.position.y + first.height > second.position.y;
      assert.ok(!(overlapX && overlapY), `Overlapping cards: ${first.id}, ${second.id}`);
    }
  }
});

test('partners share a generation and recorded children are on the next generation', () => {
  const { nodes, edges } = layoutTree(initialData);
  const byId = new Map(nodes.map((node) => [node.id, node]));
  Object.values(initialData.unions).forEach((union) => {
    const parent = byId.get(union.partnerIds[0]);
    union.partnerIds.forEach((id) => assert.equal(byId.get(id).position.y, parent.position.y));
    union.childIds.forEach((id) => assert.equal(byId.get(id).data.generation, parent.data.generation + 1));
    assert.deepEqual(edges.filter((edge) => edge.target === `union-${union.id}`).map((edge) => edge.source), union.partnerIds);
    assert.deepEqual(edges.filter((edge) => edge.source === `union-${union.id}`).map((edge) => edge.target), union.childIds);
  });
});

test('siblings with recorded birth dates are ordered oldest to youngest', () => {
  const { nodes } = layoutTree(initialData);
  const byId = new Map(nodes.map((node) => [node.id, node]));
  Object.values(initialData.unions).forEach((union) => {
    const children = union.childIds.map((id) => initialData.persons[id]).filter((child) => child.birthDate).sort((first, second) => first.birthDate.localeCompare(second.birthDate));
    for (let index = 1; index < children.length; index++) {
      assert.ok(byId.get(children[index - 1].id).position.x < byId.get(children[index].id).position.x);
    }
  });
});

test('highlighting follows only the selected person\'s explicit unions', () => {
  const highlight = familyHighlight(data, 'c');
  assert.deepEqual([...highlight.personIds].sort(), ['a', 'c']);
  assert.deepEqual([...highlight.unionIds], ['one']);
  const other = familyHighlight(data, 'd');
  assert.deepEqual([...other.personIds].sort(), ['a', 'b', 'd']);
  assert.deepEqual([...other.unionIds], ['two']);
});

test('person history supports back, forward, bounds, and branching without duplicate visits', () => {
  const home = { entries: ['home'], cursor: 0 };
  const first = visitPerson(home, 'parent');
  const second = visitPerson(first, 'grandparent');
  assert.equal(visitPerson(second, 'grandparent'), second);
  const back = stepHistory(second, -1);
  assert.equal(back.entries[back.cursor], 'parent');
  assert.equal(stepHistory(back, 1).entries[2], 'grandparent');
  assert.deepEqual(visitPerson(back, 'cousin'), { entries: ['home', 'parent', 'cousin'], cursor: 2 });
  assert.equal(stepHistory(home, -1).cursor, 0);
  assert.equal(stepHistory(second, 1).cursor, 2);
});

test('search distinguishes repeated names using recorded parents and dates', () => {
  const tamaras = searchPeople(initialData, 'Tamara Kramarenko');
  assert.equal(tamaras.length, 2);
  assert.equal(searchPeople(initialData, 'Tamara Petro')[0].id, '21ecf460-6166-4155-8c41-cdf2098b80c0');
  assert.equal(searchPeople(initialData, 'Tamara Pavlo')[0].id, '629328e7-e9a2-4a5b-81ba-579cfc7911d3');
  assert.equal(searchPeople(initialData, 'Yelyzaveta 1991')[0].id, '360555b9-354a-4416-a1ff-1b9ea4c8a13c');
});

test('relationship labels use recorded ancestry and distinguish partnership connections', () => {
  const entries = ['me', 'dad', 'grandfather', 'grandmother', 'aunt', 'cousin', 'greatgrandfather', 'greataunt', 'oldercousin', 'spouse', 'stepparent', 'stranger'];
  const family = { version: 1, persons: Object.fromEntries(entries.map((id) => [id, { ...person(id), gender: id === 'me' ? 'female' : id === 'grandfather' || id === 'dad' ? 'male' : '' }])), unions: {} };
  const addUnion = (id, partnerIds, childIds, status = '') => { family.unions[id] = { id, partnerIds, childIds, status }; };
  addUnion('birth', ['dad'], ['me']);
  addUnion('grandparents', ['grandfather', 'grandmother'], ['dad', 'aunt']);
  addUnion('cousins', ['aunt'], ['cousin']);
  addUnion('older', ['greatgrandfather'], ['grandfather', 'greataunt']);
  addUnion('oldercousin', ['greataunt'], ['oldercousin']);
  addUnion('wedding', ['me', 'spouse'], [], 'married');
  addUnion('step', ['dad', 'stepparent'], []);
  validateData(family);
  const labels = relationshipsTo(family, 'me');
  assert.equal(labels.me, 'You');
  assert.equal(labels.dad, 'Father');
  assert.equal(labels.grandfather, 'Grandfather');
  assert.equal(labels.grandmother, 'Grandparent');
  assert.equal(labels.cousin, 'First cousin');
  assert.equal(labels.oldercousin, "Father's first cousin");
  assert.equal(labels.spouse, 'Spouse');
  assert.equal(labels.stepparent, "Father's partner");
  assert.equal(labels.stranger, 'No recorded relationship');
  assert.equal(relationshipsTo(family, 'grandfather').me, 'Granddaughter');
  assert.deepEqual(relationshipsTo(family, 'missing'), {});
});

test('confirmed parentage makes Musya a great-grandmother and Irma a great-great-grandfather', () => {
  const labels = relationshipsTo(initialData, '360555b9-354a-4416-a1ff-1b9ea4c8a13c');
  assert.equal(labels['7bc73a4b-3f6c-447c-b9d6-35abbf2f6a4a'], 'Grandfather');
  assert.equal(labels['bb7daee8-fa3d-4f93-a1cf-122b85bcda79'], 'Great-grandfather');
  assert.equal(labels['597c8a86-65b4-4470-82b0-53f142f30460'], 'Great-grandmother');
  assert.equal(labels['bb36199a-d7d1-4abb-981e-4d0dae1b8d3f'], 'Great-great-grandfather');
  assert.deepEqual(relatives(initialData, '7bc73a4b-3f6c-447c-b9d6-35abbf2f6a4a').parents.map((person) => person.id).sort(), ['bb7daee8-fa3d-4f93-a1cf-122b85bcda79', '597c8a86-65b4-4470-82b0-53f142f30460'].sort());
});

test('confirmed parentage updates old saved data without losing personal edits or duplicate children', () => {
  const saved = structuredClone(initialData);
  const oldId = '6f736820-f6a0-46f2-9b5b-7c184f07e621';
  const familyId = '83985816-ada0-4f68-b354-f00681b7188a';
  const leonid = '7bc73a4b-3f6c-447c-b9d6-35abbf2f6a4a';
  saved.unions[oldId] = { id: oldId, partnerIds: ['bb7daee8-fa3d-4f93-a1cf-122b85bcda79'], childIds: [leonid] };
  saved.unions[familyId].childIds = saved.unions[familyId].childIds.filter((id) => id !== leonid);
  saved.persons[leonid].note = 'A personal edit to keep.';
  const corrected = validateData(applyConfirmedParentage(saved));
  assert.equal(corrected.persons[leonid].note, 'A personal edit to keep.');
  assert.equal(corrected.persons, saved.persons);
  assert.equal(corrected.unions[oldId], undefined);
  assert.equal(corrected.unions[familyId].childIds.filter((id) => id === leonid).length, 1);
  assert.equal(applyConfirmedParentage(corrected), corrected);
  assert.ok(saved.unions[oldId]);
  assert.equal(applyConfirmedParentage(data), data);
});

test('Irma\'s two families keep the confirmed children with the correct wife', () => {
  const irma = 'bb36199a-d7d1-4abb-981e-4d0dae1b8d3f';
  const sonya = 'f6336ba1-7b9e-4bdc-b226-4ae921e3b234';
  const rebecca = '06ff06d6-59d6-4e12-ad45-f36ed0cf059f';
  for (const id of ['597c8a86-65b4-4470-82b0-53f142f30460', '94658361-3041-499c-8e27-6f2b2480368c']) {
    assert.deepEqual(relatives(initialData, id).parents.map((person) => person.id).sort(), [irma, sonya].sort());
  }
  assert.deepEqual(relatives(initialData, 'd4ffe576-4458-4b5f-adbe-d1b3106f24e9').parents.map((person) => person.id).sort(), [irma, rebecca].sort());
  const labels = relationshipsTo(initialData, '360555b9-354a-4416-a1ff-1b9ea4c8a13c');
  assert.equal(labels[sonya], 'Great-great-grandmother');
});

test('old saved Irma records migrate Musya to Sonya without changing Rebecca\'s children', () => {
  const saved = structuredClone(initialData);
  const musya = '597c8a86-65b4-4470-82b0-53f142f30460';
  const sourceId = '977a885f-85f2-4a49-a354-1c1f0d592351';
  const targetId = '6ce1de1d-0815-4b96-9619-c59933bf470d';
  saved.unions[sourceId] = { id: sourceId, partnerIds: ['bb36199a-d7d1-4abb-981e-4d0dae1b8d3f'], childIds: [musya] };
  saved.unions[targetId].childIds = saved.unions[targetId].childIds.filter((id) => id !== musya);
  const corrected = validateData(applyConfirmedParentage(saved));
  assert.deepEqual(corrected.unions['d9585b24-fa6e-45fd-b5bd-0ff7d07af39b'], saved.unions['d9585b24-fa6e-45fd-b5bd-0ff7d07af39b']);
  assert.ok(corrected.unions[targetId].childIds.includes(musya));
  assert.equal(corrected.unions[sourceId], undefined);
});

test('partnership relatives get specific labels, including spouse parents and former spouses', () => {
  const names = ['me', 'spouse', 'fatherInLaw', 'cousin', 'cousinSpouse', 'formerSpouse', 'parent', 'uncle', 'grandparent'];
  const family = { version: 1, persons: Object.fromEntries(names.map((id) => [id, { ...person(id), gender: id === 'fatherInLaw' ? 'male' : id === 'cousinSpouse' || id === 'formerSpouse' ? 'female' : '' }])), unions: {} };
  const addUnion = (id, partnerIds, childIds, status = '') => { family.unions[id] = { id, partnerIds, childIds, status }; };
  addUnion('wedding', ['me', 'spouse'], [], 'married');
  addUnion('inlaws', ['fatherInLaw'], ['spouse']);
  addUnion('birth', ['parent'], ['me']);
  addUnion('siblings', ['grandparent'], ['parent', 'uncle']);
  addUnion('cousinbirth', ['uncle'], ['cousin']);
  addUnion('cousinwedding', ['cousin', 'cousinSpouse'], [], 'married');
  addUnion('divorce', ['me', 'formerSpouse'], [], 'divorced');
  const labels = relationshipsTo(validateData(family), 'me');
  assert.equal(labels.fatherInLaw, "Spouse's father");
  assert.equal(labels.cousinSpouse, "First cousin's wife");
  assert.equal(labels.formerSpouse, 'Former wife');
  assert.ok(Object.values(labels).every((label) => !['Related through a partnership', 'Connected through family', 'No recorded relationship'].includes(label)));
});

test('every connected person in the supplied archive has a specific relationship', () => {
  const labels = relationshipsTo(initialData, '360555b9-354a-4416-a1ff-1b9ea4c8a13c');
  assert.equal(Object.keys(labels).length, 102);
  assert.ok(Object.values(labels).every((label) => label && !['Related through a partnership', 'Connected through family', 'No recorded relationship'].includes(label)));
});

test('Yevhen and Yevheniya connect only to Oleh and Dmytro, near their child group', () => {
  const { nodes, edges } = layoutTree(initialData);
  const id = 'union-f86e85be-7b86-40d5-b551-1040c3f6aa07';
  const children = ['a1e84d28-8f34-4c79-b1e5-a52dd19c4966', '59948d12-7cf0-43e3-b7c6-d846dfeb2223'];
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  assert.deepEqual(edges.filter((edge) => edge.source === id).map((edge) => edge.target), children);
  const centers = children.map((child) => nodeById.get(child).position.x + CARD_WIDTH / 2);
  const parentCenter = nodeById.get(id).position.x + 10;
  assert.ok(parentCenter >= Math.min(...centers) - CARD_WIDTH && parentCenter <= Math.max(...centers) + CARD_WIDTH, 'Parents must be above their own children, not an unrelated family');
});

test('children of every recorded couple descend from the midpoint between spouses', () => {
  const { nodes, edges } = layoutTree(initialData);
  const byId = new Map(nodes.map((node) => [node.id, node]));
  Object.values(initialData.unions).filter((union) => union.partnerIds.length === 2).forEach((union) => {
    const id = `union-${union.id}`;
    const junction = byId.get(id).position;
    const parents = union.partnerIds.map((parent) => byId.get(parent).position);
    assert.ok(Math.abs(junction.x + 10 - (parents[0].x + parents[1].x + CARD_WIDTH) / 2) < 0.01);
    assert.equal(junction.y + 10, parents[0].y + CARD_HEIGHT / 2);
    assert.ok(edges.filter((edge) => edge.target === id).every((edge) => edge.data.straight));
    union.childIds.forEach((child) => assert.ok(edges.some((edge) => edge.source === id && edge.target === child && edge.sourceHandle === 'children')));
  });
});

test('unrelated families never merge overlapping horizontal child connectors', () => {
  const { edges, nodes } = layoutTree(initialData);
  const positions = new Map(nodes.map((node) => [node.id, node.position]));
  const levels = new Map();
  edges.filter((edge) => edge.className === 'descent').forEach((edge) => {
    assert.equal(edge.sourceHandle, 'children');
    assert.equal(edge.targetHandle, 'parent');
    const source = positions.get(edge.source).x + 10;
    const target = positions.get(edge.target).x + CARD_WIDTH / 2;
    const interval = { left: Math.min(source, target), right: Math.max(source, target), unionId: edge.data.unionId };
    const previous = levels.get(edge.data.busY) || [];
    previous.filter((other) => other.unionId !== interval.unionId).forEach((other) => {
      assert.ok(interval.right + 39 < other.left || interval.left > other.right + 39, 'Distinct family bars must have a visible gap');
    });
    previous.push(interval);
    levels.set(edge.data.busY, previous);
  });
});

test('separate ancestral branches get more breathing room than siblings', () => {
  const family = { version: 1, persons: Object.fromEntries(['parent', 'older', 'younger', 'otherParent', 'otherChild'].map((id) => [id, person(id)])), unions: {
    first: { id: 'first', partnerIds: ['parent'], childIds: ['older', 'younger'] },
    second: { id: 'second', partnerIds: ['otherParent'], childIds: ['otherChild'] },
  } };
  const byId = new Map(layoutTree(family).nodes.map((node) => [node.id, node]));
  const parentGap = Math.abs(byId.get('parent').position.x - byId.get('otherParent').position.x) - CARD_WIDTH;
  assert.ok(parentGap >= BRANCH_GAP - 0.01);
  const siblingGap = Math.abs(byId.get('older').position.x - byId.get('younger').position.x) - CARD_WIDTH;
  assert.ok(Math.abs(siblingGap - FAMILY_GAP) < 0.01);
  assert.ok(parentGap > siblingGap);
});

test('the creator\'s parents stay close above her rather than across distant branches', () => {
  const { nodes } = layoutTree(initialData);
  const positions = new Map(nodes.map((node) => [node.id, node.position]));
  const creator = positions.get('360555b9-354a-4416-a1ff-1b9ea4c8a13c');
  const mother = positions.get('ae4999a7-b58b-4830-9851-10db2c6d8993');
  const father = positions.get('a1e84d28-8f34-4c79-b1e5-a52dd19c4966');
  const parentCenter = (mother.x + father.x + CARD_WIDTH) / 2;
  assert.ok(Math.abs(parentCenter - creator.x - CARD_WIDTH / 2) < CARD_WIDTH / 2, 'Parents must be centered near their child');
  assert.ok(creator.y - mother.y < 400, 'Immediate generations should not inherit the busiest row\'s spacing');
});

test('Alina and Stefan stay together beneath Alina\'s parents', () => {
  const { nodes } = layoutTree(initialData);
  const positions = new Map(nodes.map((node) => [node.id, node.position]));
  const alina = positions.get('bea2c3ab-9eb6-4f7d-a158-dd74dc3dea95');
  const stefan = positions.get('0934b386-772f-43ba-b98e-a1f1b1ed6c8a');
  const parents = relatives(initialData, 'bea2c3ab-9eb6-4f7d-a158-dd74dc3dea95').parents.map((parent) => positions.get(parent.id));
  const parentCenter = parents.reduce((sum, position) => sum + position.x + CARD_WIDTH / 2, 0) / parents.length;
  assert.ok(Math.abs(alina.x + CARD_WIDTH / 2 - parentCenter) < CARD_WIDTH, 'Alina must not drift into a distant branch');
  assert.equal(alina.y, stefan.y);
  assert.equal(Math.abs(alina.x - stefan.x), CARD_WIDTH + 36);
  assert.ok(alina.y > parents[0].y && alina.y - parents[0].y < 400);
});

test('branch colors distinguish maternal and paternal families without guessing unknown sides', () => {
  const colors = branchColors(initialData, '360555b9-354a-4416-a1ff-1b9ea4c8a13c');
  assert.equal(colors['ee2279c7-ba9e-45a0-8efc-a17573131aaf'], 'maternal');
  assert.equal(colors['f86e85be-7b86-40d5-b551-1040c3f6aa07'], 'paternal');
  assert.equal(colors['8033ffa8-2d78-4fda-b170-650c1a422a9f'], 'paternal');
  assert.equal(colors['f6a97aba-331c-4d58-80fb-c184e730b39c'], 'neutral');
  assert.equal(colors['032983ca-7f10-4853-8143-5c1c3819f9ac'], 'neutral');
  assert.ok(Object.values(branchColors(initialData, 'missing')).every((color) => color === 'neutral'));
  assert.ok(Object.values(branchColors(data, 'c')).every((color) => color === 'neutral'));
});

test('a family connected to both parental branches stays neutral', () => {
  const family = structuredClone(initialData);
  family.unions.bridge = { id: 'bridge', partnerIds: ['bb4bb084-1dfa-46ac-a486-8b5f7bc4d017', '79eb0e09-f363-45c4-a8ca-6583f5cdb548'], childIds: [] };
  assert.equal(branchColors(family, '360555b9-354a-4416-a1ff-1b9ea4c8a13c').bridge, 'neutral');
});