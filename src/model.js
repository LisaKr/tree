export const fullName = (person) => [person.firstName, person.lastName].filter(Boolean).join(' ').trim();
export const years = (person) => {
  const birth = person.birthDate?.slice(0, 4);
  const death = person.deathDate?.slice(0, 4);
  if (!birth) return death ? `d. ${death}` : '';
  return [birth, death].filter(Boolean).join(' - ');
};

export function validateData(data) {
  if (!data || data.version !== 1 || !data.persons || !data.unions || Array.isArray(data.persons) || Array.isArray(data.unions)) throw new Error('Choose a version 1 family-tree JSON with persons and unions.');
  if (!Object.keys(data.persons).length) throw new Error('The tree must contain at least one person.');
  for (const [id, person] of Object.entries(data.persons)) {
    if (!person || person.id !== id || typeof person.firstName !== 'string' || typeof person.lastName !== 'string') throw new Error('A person has an invalid ID or name.');
    for (const key of ['birthDate', 'deathDate', 'birthPlace', 'note', 'birthName', 'gender']) {
      if (person[key] != null && typeof person[key] !== 'string') throw new Error(`Invalid ${key} for ${fullName(person)}.`);
    }
  }
  for (const [id, union] of Object.entries(data.unions)) {
    if (!union || union.id !== id || !Array.isArray(union.partnerIds) || !Array.isArray(union.childIds) || !union.partnerIds.length) throw new Error('A family union has an invalid format.');
    if ([...union.partnerIds, ...union.childIds].some((personId) => !data.persons[personId])) throw new Error('A relationship refers to a person missing from this file.');
    if (union.partnerIds.some((personId) => union.childIds.includes(personId))) throw new Error('A person cannot be their own parent.');
  }
  const visiting = new Set();
  const visited = new Set();
  const children = new Map(Object.keys(data.persons).map((id) => [id, []]));
  Object.values(data.unions).forEach((union) => union.partnerIds.forEach((id) => children.get(id).push(...union.childIds)));
  function visit(id) {
    if (visiting.has(id)) throw new Error('The parent-child relationships contain a cycle.');
    if (visited.has(id)) return;
    visiting.add(id);
    children.get(id).forEach(visit);
    visiting.delete(id);
    visited.add(id);
  }
  Object.keys(data.persons).forEach(visit);
  return data;
}

export function applyConfirmedParentage(data) {
  validateData(data);
  if (!data.persons['360555b9-354a-4416-a1ff-1b9ea4c8a13c']) return data;
  const unions = { ...data.unions };
  let changed = false;
  Object.values(data.unions).filter((union) => union.partnerIds.length === 1 && union.childIds.length).forEach((source) => {
    let candidates = Object.values(unions).filter((union) => union.partnerIds.length === 2 && union.partnerIds.includes(source.partnerIds[0]));
    if (source.id === '977a885f-85f2-4a49-a354-1c1f0d592351' && source.partnerIds[0] === 'bb36199a-d7d1-4abb-981e-4d0dae1b8d3f') candidates = candidates.filter((union) => union.id === '6ce1de1d-0815-4b96-9619-c59933bf470d' && union.partnerIds.includes('f6336ba1-7b9e-4bdc-b226-4ae921e3b234'));
    if (candidates.length !== 1) return;
    const target = candidates[0];
    unions[target.id] = { ...target, childIds: [...new Set([...target.childIds, ...source.childIds])] };
    delete unions[source.id];
    changed = true;
  });
  return changed ? { ...data, unions } : data;
}

export function applyConfirmedNoteCorrections(data) {
  const id = 'd9d2595b-c73c-436a-b361-662d4fc08362';
  const person = data.persons?.[id];
  if (!person) return data;
  const clean = (text) => typeof text === 'string' ? text.replace(/(?:\bzapis 50|Запис 50)\.\s*/giu, '') : text;
  const note = clean(person.note);
  const ukrainianNote = clean(person.translations?.uk?.note);
  if (note === person.note && ukrainianNote === person.translations?.uk?.note) return data;
  const updated = { ...person, note };
  if (ukrainianNote !== person.translations?.uk?.note) updated.translations = { ...person.translations, uk: { ...person.translations.uk, note: ukrainianNote } };
  return { ...data, persons: { ...data.persons, [id]: updated } };
}

export function relatives(data, id) {
  const unions = Object.values(data.unions);
  const parentUnions = unions.filter((union) => union.childIds.includes(id));
  const ownUnions = unions.filter((union) => union.partnerIds.includes(id));
  const unique = (ids) => [...new Set(ids)].filter((personId) => personId !== id).map((personId) => data.persons[personId]);
  return {
    parents: unique(parentUnions.flatMap((union) => union.partnerIds)),
    siblings: unique(parentUnions.flatMap((union) => union.childIds)),
    partners: unique(ownUnions.flatMap((union) => union.partnerIds)),
    children: unique(ownUnions.flatMap((union) => union.childIds)),
    unions: ownUnions,
  };
}

export function familyHighlight(data, id) {
  const personIds = new Set([id]);
  const unionIds = new Set();
  Object.values(data.unions).forEach((union) => {
    if (!union.partnerIds.includes(id) && !union.childIds.includes(id)) return;
    unionIds.add(union.id);
    [...union.partnerIds, ...union.childIds].forEach((personId) => personIds.add(personId));
  });
  return { personIds, unionIds };
}

export function branchColors(data, referenceId) {
  const unions = Object.values(data.unions);
  const colors = Object.fromEntries(unions.map((union) => [union.id, 'neutral']));
  if (!data.persons[referenceId]) return colors;
  const connections = new Map(Object.keys(data.persons).map((id) => [id, []]));
  const familyById = new Map(unions.map((union) => [union.id, union]));
  unions.forEach((union) => {
    const members = [...union.partnerIds, ...union.childIds];
    if (members.includes(referenceId)) return;
    members.forEach((id) => connections.get(id).push(union.id));
  });
  const sides = new Map(unions.map((union) => [union.id, new Set()]));
  relatives(data, referenceId).parents.forEach((parent) => {
    const side = parent.gender === 'female' ? 'maternal' : parent.gender === 'male' ? 'paternal' : null;
    if (!side) return;
    const visited = new Set();
    const queue = [parent.id];
    while (queue.length) {
      const id = queue.pop();
      if (visited.has(id)) continue;
      visited.add(id);
      connections.get(id).forEach((unionId) => {
        sides.get(unionId).add(side);
        const union = familyById.get(unionId);
        queue.push(...union.partnerIds, ...union.childIds);
      });
    }
  });
  sides.forEach((branches, id) => {
    if (branches.size === 1) colors[id] = [...branches][0];
  });
  return colors;
}

export function visitPerson(history, id) {
  if (history.entries[history.cursor] === id) return history;
  const entries = [...history.entries.slice(0, history.cursor + 1), id];
  return { entries, cursor: entries.length - 1 };
}

export function stepHistory(history, delta) {
  return { ...history, cursor: Math.max(0, Math.min(history.entries.length - 1, history.cursor + delta)) };
}

export function searchPeople(data, query, notesOnly = false) {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return Object.values(data.persons).filter((person) => {
    if (notesOnly && !person.note?.trim()) return false;
    const parents = relatives(data, person.id).parents.map(fullName).join(' ');
    const text = `${fullName(person)} ${person.birthName || ''} ${person.birthDate || ''} ${person.deathDate || ''} ${person.birthPlace || ''} ${parents}`.toLowerCase();
    return terms.every((term) => text.includes(term));
  }).sort((first, second) => fullName(first).localeCompare(fullName(second)));
}

export function relationshipsTo(data, referenceId) {
  if (!data.persons[referenceId]) return {};
  const people = Object.values(data.persons);
  const unions = Object.values(data.unions);
  const parents = new Map(people.map((person) => [person.id, new Set()]));
  const connections = new Map(people.map((person) => [person.id, []]));
  unions.forEach((union) => {
    union.partnerIds.forEach((parent) => {
      union.childIds.forEach((child) => {
        parents.get(child).add(parent);
        connections.get(child).push({ id: parent, type: 'parent' });
        connections.get(parent).push({ id: child, type: 'child' });
      });
      union.partnerIds.filter((id) => id !== parent).forEach((id) => connections.get(parent).push({ id, type: 'partner', status: union.status }));
    });
  });
  function ancestry(id) {
    const paths = new Map([[id, []]]);
    const queue = [id];
    while (queue.length) {
      const current = queue.shift();
      parents.get(current).forEach((parent) => {
        if (paths.has(parent)) return;
        paths.set(parent, [...paths.get(current), parent]);
        queue.push(parent);
      });
    }
    return paths;
  }
  const gendered = (person, male, female, neutral) => person.gender === 'male' ? male : person.gender === 'female' ? female : neutral;
  const great = (term, count) => count === 0 ? term : `Great-${'great-'.repeat(count - 1)}${term.toLowerCase()}`;
  function ancestorTerm(person, distance) {
    if (distance === 1) return gendered(person, 'Father', 'Mother', 'Parent');
    return great(gendered(person, 'Grandfather', 'Grandmother', 'Grandparent'), distance - 2);
  }
  function descendantTerm(person, distance) {
    if (distance === 1) return gendered(person, 'Son', 'Daughter', 'Child');
    return great(gendered(person, 'Grandson', 'Granddaughter', 'Grandchild'), distance - 2);
  }
  function partnerTerm(person, status) {
    if (status === 'divorced') return gendered(person, 'Former husband', 'Former wife', 'Former spouse');
    if (status === 'married') return gendered(person, 'Husband', 'Wife', 'Spouse');
    return 'Partner';
  }
  const ordinal = (degree) => ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth'][degree - 1] || `${degree}th`;
  const referencePaths = ancestry(referenceId);
  const connectionPaths = new Map([[referenceId, []]]);
  const queue = [referenceId];
  while (queue.length) {
    const current = queue.shift();
    connections.get(current).forEach((step) => {
      if (connectionPaths.has(step.id)) return;
      connectionPaths.set(step.id, [...connectionPaths.get(current), step]);
      queue.push(step.id);
    });
  }
  const labels = Object.fromEntries(people.map((person) => {
    if (person.id === referenceId) return [person.id, 'You'];
    const partnership = unions.find((union) => union.partnerIds.includes(referenceId) && union.partnerIds.includes(person.id));
    if (partnership) return [person.id, partnerTerm(person, partnership.status)];
    const targetPaths = ancestry(person.id);
    const common = [...referencePaths.keys()].filter((id) => targetPaths.has(id)).sort((first, second) => {
      const firstDistance = referencePaths.get(first).length + targetPaths.get(first).length;
      const secondDistance = referencePaths.get(second).length + targetPaths.get(second).length;
      return firstDistance - secondDistance;
    })[0];
    let label;
    if (common !== undefined) {
      const referencePath = referencePaths.get(common);
      const up = referencePath.length;
      const down = targetPaths.get(common).length;
      if (down === 0) label = ancestorTerm(person, up);
      else if (up === 0) label = descendantTerm(person, down);
      else if (up === 1 && down === 1) label = gendered(person, 'Brother', 'Sister', 'Sibling');
      else if (down === 1) label = great(gendered(person, 'Uncle', 'Aunt', "Parent's sibling"), up - 2);
      else if (up === 1) label = great(gendered(person, 'Nephew', 'Niece', "Sibling's child"), down - 2);
      else {
        const cousin = `${ordinal(Math.min(up, down) - 1)} cousin`;
        const removal = Math.abs(up - down);
        if (up > down) label = `${ancestorTerm(data.persons[referencePath[removal - 1]], removal)}'s ${cousin.toLowerCase()}`;
        else label = `${cousin}${removal ? ` ${removal === 1 ? 'once' : removal === 2 ? 'twice' : `${removal} times`} removed` : ''}`;
      }
    }
    return [person.id, label];
  }));
  return Object.fromEntries(people.map((person) => {
    if (labels[person.id]) return [person.id, labels[person.id]];
    const path = connectionPaths.get(person.id);
    if (!path) return [person.id, 'No recorded relationship'];
    const firstPartner = path.findIndex((step) => step.type === 'partner');
    const start = firstPartner > 0 ? firstPartner : 0;
    let label = start ? labels[path[start - 1].id] : 'You';
    if (!label) label = 'You';
    for (let index = label === 'You' ? 0 : start; index < path.length; index++) {
      const step = path[index];
      let end = index;
      if (step.type !== 'partner') {
        while (end + 1 < path.length && path[end + 1].type === step.type) end++;
      }
      const target = data.persons[path[end].id];
      const term = step.type === 'partner' ? partnerTerm(target, step.status) : step.type === 'parent' ? ancestorTerm(target, end - index + 1) : descendantTerm(target, end - index + 1);
      label = label === 'You' ? term : `${label}'s ${term.toLowerCase()}`;
      index = end;
    }
    return [person.id, label];
  }));
}
