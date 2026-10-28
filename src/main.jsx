import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import { ReactFlow, ReactFlowProvider, Background, MiniMap, Handle, Position, BaseEdge, useReactFlow, useStore } from '@xyflow/react';
import { TreeDeciduous, Search, Upload, Download, X, ArrowUpRight, ArrowLeft, ArrowRight, Copy, MapPin, CalendarDays, NotebookPen, Heart, Focus, Plus, Minus, Maximize, ChevronRight, PanelLeftClose, PanelLeft, Pencil, Check, ShieldCheck, Users, GitBranch, FileText, BookOpen, LocateFixed } from 'lucide-react';
import '@xyflow/react/dist/style.css';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/newsreader/400.css';
import '@fontsource/newsreader/500.css';
import { initialData } from './seed.js';
import { fullName, relatives, validateData, applyConfirmedParentage, applyConfirmedNoteCorrections, familyHighlight, branchColors, visitPerson, stepHistory, searchPeople, relationshipsTo } from './model.js';
import { layoutTree, CARD_HEIGHT, CARD_WIDTH, READING_ZOOM, OVERVIEW_THRESHOLD } from './layout.js';
import { localizeData, localizeRelationship, localizedYears, savePersonInLanguage, translate } from './localization.js';
import './style.css';

const STORAGE_KEY = 'family-archive-v1';
const LANGUAGE_KEY = 'family-archive-language';
const LanguageContext = React.createContext('en');
function useTranslation() {
  const language = React.useContext(LanguageContext);
  return { language, t: (text) => translate(text, language), years: (person) => localizedYears(person, language) };
}
const homePerson = (data) => Object.values(data.persons).find((person) => person.isCreator)?.id || Object.keys(data.persons)[0];
const dateLabel = (value, language) => {
  if (!value) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleDateString(language === 'uk' ? 'uk-UA' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
};

function Avatar({ person, large = false }) {
  const initials = [person.firstName?.trim()[0], person.lastName?.trim()[0]].filter(Boolean).join('') || '?';
  const palette = [...fullName(person)].reduce((total, character) => total + character.charCodeAt(0), 0) % 4;
  const safePhoto = typeof person.photo === 'string' && /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(person.photo);
  return <span className={`avatar palette-${palette} ${large ? 'large' : ''}`}>{safePhoto ? <img src={person.photo} alt="" /> : initials}</span>;
}

function IconButton({ label, children, ...props }) {
  const { t } = useTranslation();
  return <button className="icon-button" type="button" title={t(label)} aria-label={t(label)} {...props}>{children}</button>;
}

function PersonNode({ data, selected }) {
  const { language, t, years } = useTranslation();
  const { person, relationship, onPick, onNote, onHideNote, onOpenNote } = data;
  const overview = useStore((state) => state.transform[2] < OVERVIEW_THRESHOLD);
  return <div className={`person-node ${overview ? 'overview-card' : 'reading-card'} ${selected ? 'is-selected' : ''} ${person.isCreator ? 'is-home' : ''}`}>
    <Handle id="parent" type="target" position={Position.Top} isConnectable={false} />
    <Handle id="partner-left" type="source" position={Position.Left} isConnectable={false} />
    <Handle id="partner-right" type="source" position={Position.Right} isConnectable={false} />
    <button className="person-select" onClick={() => onPick(person.id)} onMouseEnter={(event) => onNote(person, event.currentTarget)} onMouseLeave={onHideNote} onFocus={(event) => onNote(person, event.currentTarget)} onBlur={onHideNote} onKeyDown={(event) => { if (event.key === 'Escape') onHideNote(); }} aria-label={language === 'uk' ? `Переглянути: ${fullName(person)}${person.note ? ', є нотатки' : ''}` : `View ${fullName(person)}${person.note ? ', has notes' : ''}`}>
      <span className="node-name">{person.firstName.trim()}</span>
      {person.lastName.trim() && <span className="node-surname">{person.lastName.trim()}</span>}
      {!overview && years(person) && <span className="node-years">{years(person)}</span>}
      {!overview && relationship && <span className="node-relation" title={relationship}>{relationship}</span>}
    </button>
    {!overview && person.note && <button className="node-note nodrag nopan" aria-label={language === 'uk' ? `Читати нотатки: ${fullName(person)}` : `Read notes for ${fullName(person)}`} title={t('Read full note')} onClick={(event) => { event.stopPropagation(); onOpenNote(person.id); }}><NotebookPen size={17} /></button>}
    <Handle id="children" type="source" position={Position.Bottom} isConnectable={false} />
  </div>;
}

function UnionNode({ data }) {
  const { t } = useTranslation();
  const { union } = data;
  const label = `${t(union.status || 'Family union')}${union.startYear ? `, ${union.startYear}` : ''}${union.endYear ? ` - ${union.endYear}` : ''}`;
  return <div className={`union-node ${union.status === 'divorced' ? 'divorced' : ''}`} title={label} aria-label={label}>
    <Handle id="parent" type="target" position={Position.Top} isConnectable={false} />
    <Handle id="partner-left" type="target" position={Position.Left} isConnectable={false} />
    <Handle id="partner-right" type="target" position={Position.Right} isConnectable={false} />
    {union.partnerIds.length > 1 ? <Heart size={10} /> : <span className="union-dot" />}
    <Handle id="children" type="source" position={Position.Bottom} isConnectable={false} />
  </div>;
}

const nodeTypes = { person: PersonNode, union: UnionNode };

function FamilyEdge({ id, sourceX, sourceY, targetX, targetY, data, style, markerEnd }) {
  const path = data.straight
    ? `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`
    : `M ${sourceX} ${sourceY} V ${data.busY} H ${targetX} V ${targetY}`;
  return <><path d={path} className="family-edge-clearance" /><BaseEdge id={id} path={path} style={style} markerEnd={markerEnd} interactionWidth={12} /></>;
}

const edgeTypes = { family: FamilyEdge };

function DirectoryPerson({ data, person, selected, onPick }) {
  const { t, years } = useTranslation();
  const parents = relatives(data, person.id).parents;
  return <button className={`directory-person ${selected ? 'active' : ''}`} onClick={() => onPick(person.id)}>
    <Avatar person={person} />
    <span className="directory-name"><strong>{fullName(person)}</strong>{years(person) && <small>{years(person)}</small>}{parents.length > 0 && <span className="directory-parents"><span>{t('Parents:')}</span> {parents.map(fullName).join(' & ')}</span>}</span>
    {person.note && <NotebookPen size={13} className="note-mark" />}
  </button>;
}

function NoteReader({ person, onClose, onEdit }) {
  const { t } = useTranslation();
  const dialog = useRef(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');
  useEffect(() => { if (!dialog.current.open) dialog.current.showModal(); }, []);
  async function copyNote() {
    try { await navigator.clipboard.writeText(person.note); setCopied(true); setCopyError(''); }
    catch { setCopyError(t('Clipboard unavailable')); }
  }
  return <dialog ref={dialog} onCancel={onClose} className="edit-dialog note-dialog" aria-labelledby="note-heading" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="dialog-heading"><div><span className="eyebrow">{t('NOTES & MEMORIES')}</span><h2 id="note-heading">{fullName(person)}</h2></div><IconButton label="Close note" onClick={onClose}><X size={20} /></IconButton></div>
    <article className="full-note-text" tabIndex={0} aria-label={t('Full note')}><p>{person.note}</p></article>
    <div className="dialog-actions"><span role="status" className="copy-status">{copyError}</span><button className="button" onClick={copyNote}>{copied ? <Check size={16} /> : <Copy size={16} />}{t(copied ? 'Copied' : 'Copy note')}</button><button className="button primary" onClick={onEdit}><Pencil size={15} />{t('Edit note')}</button></div>
  </dialog>;
}

function EditPerson({ person, onClose, onSave }) {
  const { t } = useTranslation();
  const dialog = useRef(null);
  const [draft, setDraft] = useState({ ...person });
  useEffect(() => { if (!dialog.current.open) dialog.current.showModal(); }, []);
  const field = (key) => ({ value: draft[key] || '', onChange: (event) => setDraft({ ...draft, [key]: event.target.value }) });
  return <dialog ref={dialog} onCancel={onClose} className="edit-dialog" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <form onSubmit={(event) => { event.preventDefault(); onSave(draft); }}>
      <div className="dialog-heading"><div><span className="eyebrow">{t('PERSON RECORD')}</span><h2>{t('Edit details')}</h2></div><IconButton label="Close editor" onClick={onClose}><X size={20} /></IconButton></div>
      <div className="form-grid"><label>{t('First name')}<input required {...field('firstName')} /></label><label>{t('Last name')}<input {...field('lastName')} /></label></div>
      <label>{t('Birth name')}<input {...field('birthName')} /></label>
      <div className="form-grid"><label>{t('Birth date')}<input placeholder={t('YYYY or YYYY-MM-DD')} pattern="[0-9]{4}(-[0-9]{2}(-[0-9]{2})?)?" {...field('birthDate')} /></label><label>{t('Death date')}<input placeholder={t('YYYY or YYYY-MM-DD')} pattern="[0-9]{4}(-[0-9]{2}(-[0-9]{2})?)?" {...field('deathDate')} /></label></div>
      <label>{t('Birthplace')}<input {...field('birthPlace')} /></label>
      <label>{t('Notes')}<textarea rows={7} {...field('note')} /></label>
      <div className="dialog-actions"><button className="button" type="button" onClick={onClose}>{t('Cancel')}</button><button className="button primary" type="submit"><Check size={16} />{t('Save changes')}</button></div>
    </form>
  </dialog>;
}

function Details({ data, person, relationship, onPick, onClose, onEdit, onLocate, onOpenNote }) {
  const { language, t, years } = useTranslation();
  const family = relatives(data, person.id);
  const groups = [['Parents', family.parents], ['Partners', family.partners], ['Children', family.children], ['Siblings', family.siblings]];
  const contacts = Object.entries(person.contacts || {}).filter(([, value]) => typeof value === 'string' && value.trim());
  return <aside className="details" aria-label={t('Person details')}>
    <div className="details-top"><span className="eyebrow">{t('PERSON DETAILS')}</span><IconButton label="Close person details" onClick={onClose}><X size={18} /></IconButton></div>
    <div className="profile"><Avatar person={person} large /><h2>{person.firstName.trim()}<br />{person.lastName.trim()}</h2>{years(person) && <p>{years(person)}</p>}{relationship && <span className="profile-relation">{relationship}</span>}{person.isCreator && <span className="profile-home"><LocateFixed size={12} /> {t('Home person')}</span>}</div>
    <div className="profile-actions"><button className="button" onClick={onEdit}><Pencil size={14} />{t('Edit details')}</button><IconButton label="Locate in tree" onClick={() => onLocate(person.id)}><Focus size={17} /></IconButton></div>
    <section className="detail-section"><h3>{t('Life details')}</h3>{person.birthDate && <div className="fact"><CalendarDays size={16} /><div><span>{t('Born')}</span><strong>{dateLabel(person.birthDate, language)}</strong></div></div>}{person.deathDate && <div className="fact"><CalendarDays size={16} /><div><span>{t('Died')}</span><strong>{dateLabel(person.deathDate, language)}</strong></div></div>}<div className="fact"><MapPin size={16} /><div><span>{t('Birthplace')}</span><strong>{person.birthPlace || t('Not recorded')}</strong></div></div>{person.birthName && <div className="fact"><Users size={16} /><div><span>{t('Birth name')}</span><strong>{person.birthName}</strong></div></div>}</section>
    <section className="detail-section"><div className="section-title"><h3>{t('Notes & memories')}</h3><NotebookPen size={15} /></div>{person.note ? <><p className="person-note">{person.note}</p><button className="text-button read-note" onClick={() => onOpenNote(person.id)}><BookOpen size={14} />{t('Read full note')}</button></> : <button className="add-note" onClick={onEdit}><Plus size={14} /> {t('Add a note')}</button>}</section>
    <section className="detail-section"><h3>{t('Family connections')}</h3>{groups.map(([label, people]) => people.length > 0 && <div className="relative-group" key={label}><h4>{t(label)} <span>{people.length}</span></h4>{people.map((relative) => <button className="relative" key={relative.id} onClick={() => onPick(relative.id)}><Avatar person={relative} /><span><strong>{fullName(relative)}</strong><small>{years(relative)}</small></span><ChevronRight size={14} /></button>)}</div>)}{groups.every(([, people]) => !people.length) && <p className="muted">{t('No recorded connections')}</p>}{family.unions.filter((union) => union.status || union.startYear).map((union) => <div className="union-fact" key={union.id}><Heart size={13} /><span>{t(union.status || 'Partnership')}{union.startYear && ` · ${union.startYear}`}{union.endYear && ` - ${union.endYear}`}</span></div>)}</section>
    {contacts.length > 0 && <section className="detail-section"><h3>{t('Contacts')}</h3>{contacts.map(([key, value]) => <div className="contact" key={key}><span>{t(key)}</span><p>{value}</p></div>)}</section>}
  </aside>;
}

function Archive() {
  const [language, setLanguage] = useState(() => {
    try { return localStorage.getItem(LANGUAGE_KEY) === 'uk' ? 'uk' : 'en'; }
    catch { return 'en'; }
  });
  const t = (text) => translate(text, language);
  const [loadIssue, setLoadIssue] = useState('');
  const [data, setData] = useState(() => {
    try { const saved = localStorage.getItem(STORAGE_KEY); return saved ? validateData(applyConfirmedNoteCorrections(applyConfirmedParentage(JSON.parse(saved)))) : initialData; }
    catch { return initialData; }
  });
  const [selectedId, setSelectedId] = useState(() => homePerson(data));
  const [detailsOpen, setDetailsOpen] = useState(() => window.innerWidth > 1100);
  const [directoryOpen, setDirectoryOpen] = useState(() => window.innerWidth > 760);
  const [search, setSearch] = useState('');
  const [notesOnly, setNotesOnly] = useState(false);
  const [editing, setEditing] = useState(false);
  const [tooltip, setTooltip] = useState(null);
  const [saveStatus, setSaveStatus] = useState('Saved on this device');
  const [layout, setLayout] = useState(() => layoutTree(data));
  const [zoom, setZoom] = useState(100);
  const [highlightId, setHighlightId] = useState(null);
  const [history, setHistory] = useState(() => ({ entries: [homePerson(data)], cursor: 0 }));
  const [notePersonId, setNotePersonId] = useState(null);
  const inputRef = useRef(null);
  const flow = useReactFlow();
  const displayData = localizeData(data, language);
  const persons = Object.values(displayData.persons);
  const selected = displayData.persons[selectedId];
  const matches = new Set([...searchPeople(data, search, notesOnly), ...searchPeople(localizeData(data, 'uk'), search, notesOnly)].map((person) => person.id));
  const results = searchPeople(displayData, '', notesOnly).filter((person) => matches.has(person.id));
  const referenceId = persons.find((person) => person.isCreator)?.id;
  const relationships = Object.fromEntries(Object.entries(relationshipsTo(data, referenceId)).map(([id, label]) => [id, localizeRelationship(label, data.persons[id], language)]));
  const notesCount = persons.filter((person) => person.note?.trim()).length;

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = translate('My Family', language);
    try { localStorage.setItem(LANGUAGE_KEY, language); } catch {}
  }, [language]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); setSaveStatus('Saved on this device'); }
    catch { setSaveStatus('Storage unavailable · export to save'); }
  }, [data]);

  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') { setTooltip(null); if (!editing) setDetailsOpen(false); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editing]);

  function locate(id, duration = 500) {
    const node = layout.nodes.find((entry) => entry.id === id);
    if (node) flow.setCenter(node.position.x + CARD_WIDTH / 2, node.position.y + CARD_HEIGHT / 2, { zoom: READING_ZOOM, duration });
  }

  function fitAll() {
    setHighlightId(null);
    setTooltip(null);
    flow.fitView({ duration: 600, padding: 0.08, minZoom: 0.03, maxZoom: OVERVIEW_THRESHOLD - 0.1 });
  }

  function showPerson(id) {
    setSelectedId(id);
    setHighlightId(id);
    setDetailsOpen(true);
    setTooltip(null);
    if (window.innerWidth <= 760) setDirectoryOpen(false);
    requestAnimationFrame(() => requestAnimationFrame(() => locate(id)));
  }

  function pick(id) {
    setHistory((current) => visitPerson(current, id));
    showPerson(id);
  }

  function browse(delta) {
    const next = stepHistory(history, delta);
    setHistory(next);
    showPerson(next.entries[next.cursor]);
  }

  function openNote(id) {
    setTooltip(null);
    setNotePersonId(id);
  }

  function showNote(person, element) {
    if (!person.note?.trim()) return;
    const rect = element.getBoundingClientRect();
    const width = Math.min(320, window.innerWidth - 24);
    setTooltip({ person, left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)), top: Math.max(12, Math.min(rect.bottom + 10, window.innerHeight - 225)) });
  }

  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'family-tree.json';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function importFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const next = validateData(applyConfirmedNoteCorrections(applyConfirmedParentage(JSON.parse(await file.text()))));
      const nextLayout = layoutTree(next);
      setData(next);
      setLayout(nextLayout);
      setSelectedId(homePerson(next));
      setHistory({ entries: [homePerson(next)], cursor: 0 });
      setNotePersonId(null);
      setHighlightId(null);
      setSearch('');
      setTooltip(null);
      setLoadIssue('');
      requestAnimationFrame(() => flow.fitView({ duration: 700, padding: 0.08, minZoom: 0.03, maxZoom: OVERVIEW_THRESHOLD - 0.1 }));
    } catch (error) { setLoadIssue(error instanceof SyntaxError ? 'This file is not valid JSON. Your current tree is unchanged.' : error.message); }
    event.target.value = '';
  }

  function savePerson(person) {
    const saved = savePersonInLanguage(data.persons[person.id], person, language);
    const next = { ...data, persons: { ...data.persons, [person.id]: saved } };
    setData(next);
    setLayout(layoutTree(next));
    setEditing(false);
  }

  const highlight = highlightId ? familyHighlight(data, highlightId) : null;
  const nodes = layout.nodes.map((node) => {
    const related = highlight && (node.type === 'person' ? highlight.personIds.has(node.id) : highlight.unionIds.has(node.data.union.id));
    return { ...node, selected: node.id === selectedId, draggable: false, zIndex: related ? 3 : 2, className: highlight ? (related ? 'is-family' : 'is-dimmed') : '', ...(node.type === 'person' ? { data: { ...node.data, person: displayData.persons[node.id], relationship: relationships[node.id], onPick: pick, onNote: showNote, onHideNote: () => setTooltip(null), onOpenNote: openNote } } : {}) };
  });
  const colors = branchColors(data, referenceId);
  const edges = layout.edges.map((edge) => ({ ...edge, zIndex: highlight?.unionIds.has(edge.data.unionId) ? 1 : 0, className: `${edge.className} branch-${colors[edge.data.unionId] || 'neutral'}${highlight ? (highlight.unionIds.has(edge.data.unionId) ? ' is-family' : ' is-dimmed') : ''}` }));

  return <LanguageContext.Provider value={language}><div className="app-shell">
    <header className="app-header"><a className="brand" href="#" onClick={(event) => { event.preventDefault(); locate(homePerson(data)); }}><span className="brand-mark"><TreeDeciduous size={24} strokeWidth={1.6} /></span><span>kinfolk<span className="brand-dot">.</span></span></a><span className="header-divider" /><span className="archive-label">{t('The family archive')}</span><div className="header-actions"><span className="privacy"><ShieldCheck size={14} />{t('Private & local')}</span><div className="language-switch" role="group" aria-label={t('Language')}>{[['en', 'English', 'EN'], ['uk', 'Українська', 'УК']].map(([value, label, short]) => <button key={value} type="button" lang={value} aria-label={label} aria-pressed={language === value} onClick={() => { setLanguage(value); setTooltip(null); }}><span className="language-full">{label}</span><span className="language-short" aria-hidden="true">{short}</span></button>)}</div><button className="button import-button" aria-label={t('Import JSON')} onClick={() => inputRef.current.click()}><Upload size={15} /><span>{t('Import JSON')}</span></button><button className="button primary" aria-label={t('Export JSON')} onClick={download}><Download size={15} /><span>{t('Export JSON')}</span></button><input ref={inputRef} type="file" accept=".json,application/json" onChange={importFile} hidden aria-label={t('Import family JSON')} /></div></header>
    <div className="app-body">
      {directoryOpen && <aside className="directory" aria-label={t('Family directory')}>
        <div className="directory-header"><span className="eyebrow">{t('YOUR FAMILY')}</span><IconButton label="Close family directory" onClick={() => setDirectoryOpen(false)}><PanelLeftClose size={17} /></IconButton></div>
        <h2>{t('Every person.')}<br /><span>{t('One story.')}</span></h2>
        <label className="search-box"><Search size={16} /><input placeholder={t('Find a person...')} aria-label={t('Search family')} value={search} onChange={(event) => setSearch(event.target.value)} />{search && <button aria-label={t('Clear search')} onClick={() => setSearch('')}><X size={14} /></button>}</label>
        <div className="directory-tabs"><button className={!notesOnly ? 'active' : ''} onClick={() => setNotesOnly(false)}>{t('Everyone')} <span>{persons.length}</span></button><button className={notesOnly ? 'active' : ''} onClick={() => setNotesOnly(true)}>{t('With notes')} <span>{notesCount}</span></button></div>
        <div className="person-list">{results.map((person) => <DirectoryPerson data={displayData} person={person} selected={person.id === selectedId} onPick={pick} key={person.id} />)}{!results.length && <div className="empty-results"><Search size={22} /><p>{t('No matching people')}</p><button className="text-button" onClick={() => { setSearch(''); setNotesOnly(false); }}>{t('Clear filters')}</button></div>}</div>
        <div className="directory-footer"><span className="status-dot" /><span>{t(saveStatus)}</span></div>
      </aside>}
      <main className="workspace">
        <div className="workspace-heading"><div className="workspace-title">{!directoryOpen && <IconButton label="Open family directory" onClick={() => setDirectoryOpen(true)}><PanelLeft size={20} /></IconButton>}<div><div className="breadcrumb">{t('Family archive')} <ChevronRight size={12} /><span>{t('Family tree')}</span></div><h1>{t('My Family')}</h1></div></div><div className="navigation-actions"><IconButton label="Back" disabled={history.cursor === 0} onClick={() => browse(-1)}><ArrowLeft size={17} /></IconButton><IconButton label="Forward" disabled={history.cursor === history.entries.length - 1} onClick={() => browse(1)}><ArrowRight size={17} /></IconButton><button className="button home-button" aria-label={t(referenceId ? 'Return to me' : 'Home person')} onClick={() => pick(homePerson(data))}><LocateFixed size={15} /><span>{t(referenceId ? 'Return to me' : 'Home person')}</span></button></div></div>
        <div className="tree-toolbar"><span className="tree-tab"><GitBranch size={16} />{t('Family tree')}</span><span className="tree-count">{language === 'uk' ? `${persons.length} осіб, усі пов’язані` : `${persons.length} people, all connected`}</span><div className="view-actions"><button className="text-button" onClick={fitAll}><Maximize size={14} />{t('Fit all')}</button></div></div>
        {loadIssue && <div className="error-banner" role="alert"><span>{t(loadIssue)}</span><IconButton label="Dismiss import error" onClick={() => setLoadIssue('')}><X size={16} /></IconButton></div>}
        <div className="tree-canvas" aria-label={t('Complete family tree')}>
          <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} nodesDraggable={false} nodesConnectable={false} edgesFocusable={false} minZoom={0.03} maxZoom={1.8} onMove={(_, viewport) => { setZoom(Math.round(viewport.zoom * 100)); setTooltip(null); }} onInit={(instance) => { const node = layout.nodes.find((entry) => entry.id === homePerson(data)); if (node) instance.setCenter(node.position.x + CARD_WIDTH / 2, node.position.y + CARD_HEIGHT / 2 - 100, { zoom: READING_ZOOM }); }} onPaneClick={() => { setTooltip(null); setHighlightId(null); }} proOptions={{ hideAttribution: false }}>
            <Background color="#d2dcd8" gap={22} size={1} />
            <MiniMap nodeColor={(node) => node.type === 'union' ? '#b7c9c1' : node.id === selectedId ? '#176d64' : '#aac5b6'} nodeStrokeWidth={0} maskColor="#e5eee7a0" maskStrokeColor="#176d64" maskStrokeWidth={3} pannable zoomable position="bottom-right" ariaLabel={t('Whole family overview')} />
          </ReactFlow>
          <div className="canvas-tools"><IconButton label="Zoom out" onClick={() => flow.zoomOut({ duration: 200 })}><Minus size={17} /></IconButton><button className="zoom-value" title={t('Reset to reading zoom')} aria-label={t('Reset to reading zoom')} onClick={() => locate(selectedId)}>{zoom}%</button><IconButton label="Zoom in" onClick={() => flow.zoomIn({ duration: 200 })}><Plus size={17} /></IconButton><span className="tool-divider" /><IconButton label="Fit entire tree" onClick={fitAll}><Maximize size={17} /></IconButton><IconButton label="Center selected person" onClick={() => locate(selectedId)}><Focus size={17} /></IconButton></div>
          <span className="overview-caption">{t('Overview')}</span>
          {!detailsOpen && <button className="selected-pill" onClick={() => setDetailsOpen(true)}><Avatar person={selected} /><span>{fullName(selected)}</span><ArrowUpRight size={16} /></button>}
        </div>
        <footer className="workspace-footer"><div><span className="legend-line maternal" />{t("Mother's side")}<span className="legend-line paternal" />{t("Father's side")}<span className="legend-line neutral" />{t('Other')}<span className="legend-line dashed" />{t('Divorced')}</div><span className="footer-note"><FileText size={13} />{language === 'uk' ? `Родинні нотатки: ${notesCount}` : `${notesCount} family notes`}</span></footer>
      </main>
      {detailsOpen && <Details data={displayData} person={selected} relationship={relationships[selectedId]} onPick={pick} onClose={() => setDetailsOpen(false)} onEdit={() => setEditing(true)} onLocate={locate} onOpenNote={openNote} />}
    </div>
    {editing && <EditPerson key={`${selectedId}-${language}`} person={selected} onClose={() => setEditing(false)} onSave={savePerson} />}
    {notePersonId && <NoteReader key={`${notePersonId}-${language}`} person={displayData.persons[notePersonId]} onClose={() => setNotePersonId(null)} onEdit={() => { pick(notePersonId); setNotePersonId(null); setEditing(true); }} />}
    {tooltip && createPortal(<div role="tooltip" className="note-tooltip" style={{ left: tooltip.left, top: tooltip.top }}><div><NotebookPen size={16} /><strong>{fullName(tooltip.person)}</strong></div><p>{tooltip.person.note}</p></div>, document.body)}
  </div></LanguageContext.Provider>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><ReactFlowProvider><Archive /></ReactFlowProvider></React.StrictMode>);