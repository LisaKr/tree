import dagre from '@dagrejs/dagre';

export const CARD_WIDTH = 260;
export const CARD_HEIGHT = 160;
export const READING_ZOOM = 1;
export const OVERVIEW_THRESHOLD = 0.6;
export const FAMILY_GAP = 84;
export const BRANCH_GAP = 240;

function layoutIndividuals(data) {
  const graph = new dagre.graphlib.Graph();
  graph.setGraph({ rankdir: 'TB', ranker: 'network-simplex', nodesep: 30, ranksep: 55, edgesep: 18, marginx: 60, marginy: 60 });
  graph.setDefaultEdgeLabel(() => ({}));
  const nodes = Object.values(data.persons).map((person) => ({
    id: person.id, type: 'person', position: { x: 0, y: 0 },
    data: { person }, width: CARD_WIDTH, height: CARD_HEIGHT,
  }));
  nodes.forEach((node) => graph.setNode(node.id, { width: CARD_WIDTH, height: CARD_HEIGHT }));
  const edges = [];
  Object.values(data.unions).forEach((union) => {
    const id = `union-${union.id}`;
    graph.setNode(id, { width: 20, height: 20 });
    nodes.push({ id, type: 'union', position: { x: 0, y: 0 }, data: { union }, width: 20, height: 20 });
    union.partnerIds.forEach((parentId) => {
      graph.setEdge(parentId, id, { weight: 3 });
      edges.push({ id: `${parentId}-${id}`, source: parentId, target: id, sourceHandle: 'children', targetHandle: 'parent', type: 'smoothstep', className: union.status === 'divorced' ? 'relationship divorced' : 'relationship', data: { unionId: union.id } });
    });
    union.childIds.forEach((childId) => {
      graph.setEdge(id, childId, { weight: 2 });
      edges.push({ id: `${id}-${childId}`, source: id, target: childId, sourceHandle: 'children', targetHandle: 'parent', type: 'smoothstep', className: 'descent', data: { unionId: union.id } });
    });
  });
  dagre.layout(graph);
  return {
    nodes: nodes.map((node) => {
      const position = graph.node(node.id);
      return { ...node, position: { x: position.x - node.width / 2, y: position.y - node.height / 2 } };
    }),
    edges,
  };
}

export function layoutTree(data) {
  const people = Object.values(data.persons);
  const unions = Object.values(data.unions);
  const roots = new Map(people.map((person) => [person.id, person.id]));
  function root(id) {
    if (roots.get(id) !== id) roots.set(id, root(roots.get(id)));
    return roots.get(id);
  }
  const partners = new Map(people.map((person) => [person.id, new Set()]));
  unions.forEach((union) => {
    union.partnerIds.forEach((id) => {
      roots.set(root(id), root(union.partnerIds[0]));
      union.partnerIds.filter((partner) => partner !== id).forEach((partner) => partners.get(id).add(partner));
    });
  });
  const groups = new Map();
  people.forEach((person) => {
    const id = root(person.id);
    if (!groups.has(id)) groups.set(id, { id, members: [], generation: null });
    groups.get(id).members.push(person.id);
  });
  const cardGap = 36;
  groups.forEach((group) => {
    const remaining = new Set(group.members);
    const ordered = [];
    let current = [...remaining].sort((first, second) => partners.get(first).size - partners.get(second).size)[0];
    while (remaining.size) {
      ordered.push(current);
      remaining.delete(current);
      current = [...partners.get(current)].find((id) => remaining.has(id)) || remaining.values().next().value;
    }
    group.members = ordered;
    group.width = ordered.length * CARD_WIDTH + (ordered.length - 1) * cardGap;
  });

  const graph = new dagre.graphlib.Graph();
  graph.setGraph({ rankdir: 'TB', ranker: 'network-simplex', nodesep: FAMILY_GAP, ranksep: 180, edgesep: 24, marginx: 60, marginy: 60 });
  graph.setDefaultEdgeLabel(() => ({}));
  const neighbors = new Map([...groups.keys()].map((id) => [id, []]));
  groups.forEach((group) => graph.setNode(group.id, { width: group.width, height: CARD_HEIGHT }));
  unions.forEach((union) => union.childIds.forEach((child) => {
    const parentGroup = root(union.partnerIds[0]);
    const childGroup = root(child);
    graph.setEdge(parentGroup, childGroup);
    neighbors.get(parentGroup).push({ id: childGroup, offset: 1 });
    neighbors.get(childGroup).push({ id: parentGroup, offset: -1 });
  }));
  if (!dagre.graphlib.alg.isAcyclic(graph)) return layoutIndividuals(data);
  dagre.layout(graph);

  const branchOrigins = new Map();
  function origins(id) {
    if (branchOrigins.has(id)) return branchOrigins.get(id);
    const parents = graph.predecessors(id);
    const ancestors = new Set(parents.length ? parents.flatMap((parent) => [...origins(parent)]) : [id]);
    branchOrigins.set(id, ancestors);
    return ancestors;
  }
  function gapBetween(first, second) {
    if (!second) return 0;
    return [...origins(first.id)].some((id) => origins(second.id).has(id)) ? FAMILY_GAP : BRANCH_GAP;
  }

  const creator = people.find((person) => person.isCreator);
  const ancestorDepths = new Map(creator ? [[creator.id, 0]] : []);
  const ancestorQueue = creator ? [creator.id] : [];
  while (ancestorQueue.length) {
    const child = ancestorQueue.shift();
    unions.filter((union) => union.childIds.includes(child)).forEach((union) => union.partnerIds.forEach((parent) => {
      if (ancestorDepths.has(parent)) return;
      ancestorDepths.set(parent, ancestorDepths.get(child) + 1);
      ancestorQueue.push(parent);
    }));
  }

  let consistent = true;
  groups.forEach((group) => {
    if (group.generation !== null) return;
    group.generation = 0;
    const queue = [group.id];
    while (queue.length) {
      const current = groups.get(queue.shift());
      neighbors.get(current.id).forEach(({ id, offset }) => {
        const next = groups.get(id);
        if (next.generation === null) {
          next.generation = current.generation + offset;
          queue.push(id);
        } else if (next.generation !== current.generation + offset) consistent = false;
      });
    }
  });
  if (!consistent) {
    groups.forEach((group) => { group.generation = 0; });
    dagre.graphlib.alg.topsort(graph).forEach((id) => {
      graph.successors(id).forEach((child) => {
        groups.get(child).generation = Math.max(groups.get(child).generation, groups.get(id).generation + 1);
      });
    });
  }
  const minGeneration = Math.min(...[...groups.values()].map((group) => group.generation));
  const rows = new Map();
  groups.forEach((group) => {
    group.generation -= minGeneration;
    if (!rows.has(group.generation)) rows.set(group.generation, []);
    rows.get(group.generation).push(group);
  });
  function orderSiblings(row, center, prioritizeAncestors = true) {
    row.sort((first, second) => center(first) - center(second));
    const siblingOrder = new dagre.graphlib.Graph();
    row.forEach((group) => siblingOrder.setNode(group.id));
    unions.forEach((union) => {
      const children = [...new Set(union.childIds.map(root))].filter((id) => row.some((group) => group.id === id));
      if (children.length < 2) return;
      const childBirth = (id) => union.childIds.filter((child) => root(child) === id).map((child) => data.persons[child].birthDate).filter(Boolean).sort()[0] || '9999';
      children.sort((first, second) => childBirth(first).localeCompare(childBirth(second)));
      children.slice(1).forEach((id, index) => siblingOrder.setEdge(children[index], id));
    });
    if (dagre.graphlib.alg.isAcyclic(siblingOrder)) {
      const priority = new Map(row.map((group) => [group.id, center(group)]));
      const ancestral = new Map(row.map((group) => [group.id, prioritizeAncestors && group.members.some((id) => ancestorDepths.has(id))]));
      dagre.graphlib.alg.topsort(siblingOrder).reverse().forEach((id) => {
        siblingOrder.successors(id).filter((next) => ancestral.get(next)).forEach((next) => {
          priority.set(id, ancestral.get(id) ? Math.min(priority.get(id), priority.get(next)) : priority.get(next));
          ancestral.set(id, true);
        });
      });
      row.sort((first, second) => Number(ancestral.get(second.id)) - Number(ancestral.get(first.id)) || priority.get(first.id) - priority.get(second.id));
      const remaining = new Set(row.map((group) => group.id));
      const ordered = [];
      while (remaining.size) {
        const next = row.find((group) => remaining.has(group.id) && siblingOrder.predecessors(group.id).every((id) => !remaining.has(id)));
        ordered.push(next);
        remaining.delete(next.id);
      }
      row.splice(0, row.length, ...ordered);
    }
  }
  rows.forEach((row) => {
    orderSiblings(row, (group) => graph.node(group.id).x);
    const width = row.reduce((sum, group, index) => sum + group.width + gapBetween(group, row[index + 1]), 0);
    const center = row.reduce((sum, group) => sum + graph.node(group.id).x * group.width, 0) / row.reduce((sum, group) => sum + group.width, 0);
    let left = center - width / 2;
    row.forEach((group, index) => {
      group.x = left;
      left += group.width + gapBetween(group, row[index + 1]);
    });
  });

  function alignRow(generation, towardParents = false) {
    const row = rows.get(generation);
    const desired = new Map();
    row.forEach((group) => {
      if (towardParents && graph.successors(group.id).length && group.members.some((id) => ancestorDepths.has(id))) {
        desired.set(group.id, { left: group.x, weight: 2048 });
        return;
      }
      const offsets = towardParents ? unions.flatMap((union) => union.childIds.filter((id) => root(id) === group.id).map((id) => {
        const parentGroup = groups.get(root(union.partnerIds[0]));
        const parentCenter = union.partnerIds.reduce((sum, parent) => sum + parentGroup.x + parentGroup.members.indexOf(parent) * (CARD_WIDTH + cardGap) + CARD_WIDTH / 2, 0) / union.partnerIds.length;
        return { left: parentCenter - group.members.indexOf(id) * (CARD_WIDTH + cardGap) - CARD_WIDTH / 2, weight: ancestorDepths.has(id) ? 100 : 1 };
      })) : unions.filter((union) => root(union.partnerIds[0]) === group.id).flatMap((union) => {
        const sourceOffset = union.partnerIds.reduce((sum, id) => sum + group.members.indexOf(id) * (CARD_WIDTH + cardGap) + CARD_WIDTH / 2, 0) / union.partnerIds.length;
        return union.childIds.map((id) => {
          const childGroup = groups.get(root(id));
          return { left: childGroup.x + childGroup.members.indexOf(id) * (CARD_WIDTH + cardGap) + CARD_WIDTH / 2 - sourceOffset, weight: ancestorDepths.has(id) ? 100 : 1 };
        });
      });
      const depth = Math.min(...group.members.map((id) => ancestorDepths.get(id) ?? Infinity));
      const weight = offsets.length && Number.isFinite(depth) ? 2048 / Math.max(1, depth * depth) : offsets.length ? 4 : 1;
      desired.set(group.id, { left: offsets.length ? offsets.reduce((sum, value) => sum + value.left * value.weight, 0) / offsets.reduce((sum, value) => sum + value.weight, 0) : group.x, weight });
    });
    orderSiblings(row, (group) => desired.get(group.id).left + group.width / 2, !towardParents);
    const blocks = [];
    let prefix = 0;
    row.forEach((group, index) => {
      const target = desired.get(group.id);
      group.prefix = prefix;
      blocks.push({ first: index, last: index, mean: target.left - prefix, weight: target.weight });
      while (blocks.length > 1 && blocks.at(-2).mean > blocks.at(-1).mean) {
        const right = blocks.pop();
        const left = blocks.pop();
        const weight = left.weight + right.weight;
        blocks.push({ first: left.first, last: right.last, mean: (left.mean * left.weight + right.mean * right.weight) / weight, weight });
      }
      prefix += group.width + gapBetween(group, row[index + 1]);
    });
    blocks.forEach((block) => row.slice(block.first, block.last + 1).forEach((group) => { group.x = group.prefix + block.mean; }));
  }
  [...rows.keys()].sort((first, second) => second - first).forEach((generation) => alignRow(generation));
  [...rows.keys()].sort((first, second) => first - second).forEach((generation) => {
    if (rows.get(generation).some((group) => graph.predecessors(group.id).length)) alignRow(generation, true);
  });

  const routeLanes = new Map();
  const generationLanes = new Map();
  const personCenter = (id) => {
    const group = groups.get(root(id));
    return group.x + group.members.indexOf(id) * (CARD_WIDTH + cardGap) + CARD_WIDTH / 2;
  };
  unions.filter((union) => union.childIds.length).forEach((union) => {
    const generation = groups.get(root(union.partnerIds[0])).generation;
    const source = union.partnerIds.reduce((sum, id) => sum + personCenter(id), 0) / union.partnerIds.length;
    const centers = [source, ...union.childIds.map(personCenter)];
    const interval = { left: Math.min(...centers), right: Math.max(...centers) };
    if (!generationLanes.has(generation)) generationLanes.set(generation, []);
    const lanes = generationLanes.get(generation);
    let lane = lanes.findIndex((intervals) => intervals.every((other) => interval.right + 40 < other.left || interval.left > other.right + 40));
    if (lane < 0) { lane = lanes.length; lanes.push([]); }
    lanes[lane].push(interval);
    routeLanes.set(union.id, lane);
  });
  const adjacentPartners = (union) => union.partnerIds.length === 2 && Math.abs(groups.get(root(union.partnerIds[0])).members.indexOf(union.partnerIds[0]) - groups.get(root(union.partnerIds[0])).members.indexOf(union.partnerIds[1])) === 1;
  const busOffsets = new Map();
  let top = 60;
  [...rows.keys()].sort((first, second) => first - second).forEach((generation) => {
    rows.get(generation).forEach((group) => { group.y = top; });
    const clearance = Math.max(50, ...rows.get(generation).flatMap((group) => unions.filter((union) => root(union.partnerIds[0]) === group.id).map((union, track) => adjacentPartners(union) ? 0 : 56 + track * 14)));
    busOffsets.set(generation, clearance);
    top += CARD_HEIGHT + clearance + Math.max(0, (generationLanes.get(generation)?.length || 0) - 1) * 18 + 50;
  });

  const nodes = people.map((person) => {
    const group = groups.get(root(person.id));
    return { id: person.id, type: 'person', position: { x: group.x + group.members.indexOf(person.id) * (CARD_WIDTH + cardGap), y: group.y }, data: { person, generation: group.generation }, width: CARD_WIDTH, height: CARD_HEIGHT };
  });
  const positions = new Map(nodes.map((node) => [node.id, node.position]));
  const edges = [];
  const unionTracks = new Map();
  unions.forEach((union) => {
    const group = groups.get(root(union.partnerIds[0]));
    const track = unionTracks.get(group.id) || 0;
    unionTracks.set(group.id, track + 1);
    const parentPositions = union.partnerIds.map((id) => positions.get(id)).sort((first, second) => first.x - second.x);
    const adjacent = adjacentPartners(union);
    const center = (parentPositions[0].x + parentPositions.at(-1).x + CARD_WIDTH) / 2;
    const position = { x: center - 10, y: adjacent ? group.y + CARD_HEIGHT / 2 - 10 : group.y + CARD_HEIGHT + 24 + track * 14 };
    const id = `union-${union.id}`;
    nodes.push({ id, type: 'union', position, data: { union }, width: 20, height: 20 });
    union.partnerIds.forEach((parentId) => {
      const left = positions.get(parentId).x < position.x;
      edges.push({ id: `${parentId}-${id}`, source: parentId, target: id, sourceHandle: adjacent ? (left ? 'partner-right' : 'partner-left') : 'children', targetHandle: adjacent ? (left ? 'partner-left' : 'partner-right') : 'parent', type: 'family', className: union.status === 'divorced' ? 'relationship divorced' : 'relationship', data: { unionId: union.id, straight: adjacent, busY: position.y - 8 } });
    });
    const descentTrack = routeLanes.get(union.id) || 0;
    union.childIds.forEach((childId) => {
      edges.push({ id: `${id}-${childId}`, source: id, target: childId, sourceHandle: 'children', targetHandle: 'parent', type: 'family', className: 'descent', data: { unionId: union.id, busY: group.y + CARD_HEIGHT + busOffsets.get(group.generation) + descentTrack * 18 } });
    });
  });
  const minX = Math.min(...nodes.map((node) => node.position.x));
  nodes.forEach((node) => { node.position.x += 60 - minX; });
  return { nodes, edges };
}