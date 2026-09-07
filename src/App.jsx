import { useEffect, useState } from 'react';
import { allHymns, categories } from './hymns.js';
import { supabase } from './supabase.js';

const EDITOR_EMAIL = 'aylint1307@gmail.com';
const emptyHymn = { title: '', lyrics: '', category: 'adoracion' };
const HIDDEN_SERVICE_STEPS_KEY = 'himnario-hidden-service-steps';

function getHiddenServiceSteps() {
  try {
    return JSON.parse(localStorage.getItem(HIDDEN_SERVICE_STEPS_KEY) || '[]');
  } catch {
    return [];
  }
}

function App() {
  const [categoryId, setCategoryId] = useState(null);
  const [selectedHymn, setSelectedHymn] = useState(null);
  const [query, setQuery] = useState('');
  const [showAdmin, setShowAdmin] = useState(false);
  const [cloudService, setCloudService] = useState([]);
  const [cloudHymns, setCloudHymns] = useState([]);
  const category = categories.find((item) => item.id === categoryId);
  const isServiceProgram = category?.id === 'servicio';

  useEffect(() => {
    if (!supabase) return;
    const today = new Date().toISOString().slice(0, 10);
    supabase.from('hymns').select('*').order('number').then(({ data }) => setCloudHymns(data || []));
    supabase.from('service_program').select('*').eq('service_date', today).order('step_number').then(({ data }) => setCloudService(data || []));
  }, [showAdmin]);

  const availableHymns = supabase ? cloudHymns.filter((hymn) => hymn.category === categoryId) : category?.hymns.map((hymn) => ({ ...hymn, category: categoryId })) || allHymns;
  const visibleHymns = (category ? availableHymns : allHymns).filter((hymn) => (hymn.title || '').toLowerCase().includes(query.toLowerCase()));
  const serviceItems = (cloudService.length ? cloudService : category?.hymns || [])
    .filter((item) => !item.localDefault || !getHiddenServiceSteps().includes(item.id))
    .map((item, index) => ({ ...item, description: item.description || item.title || '', step_number: item.step_number || index + 1 }));
  const orderedItems = isServiceProgram ? serviceItems.filter((item) => (item.description || item.title || '').toLowerCase().includes(query.toLowerCase())) : [...visibleHymns].sort((a, b) => a.title.localeCompare(b.title, 'es'));
  const goHome = () => { setCategoryId(null); setSelectedHymn(null); setQuery(''); };

  if (showAdmin) return <AdminPanel onClose={() => setShowAdmin(false)} />;
  if (selectedHymn) {
    const lyrics = selectedHymn.lyrics || (selectedHymn.source ? new DOMParser().parseFromString(selectedHymn.source, 'text/html').querySelector('.letra')?.textContent.trim() : '');
    return <main className="app-shell lyric-page"><button className="back-button" onClick={() => setSelectedHymn(null)}>← Volver al índice</button><h1>{selectedHymn.title}</h1><article className={`lyrics lyrics-${selectedHymn.category || 'adoracion'}`}>{lyrics || 'Esta letra todavía no tiene contenido.'}</article></main>;
  }

  return <main className="app-shell"><header className="hero"><div className="hero-topline"><button className="brand" onClick={goHome}>PUERTA DEL CIELO</button><button className="admin-link" onClick={() => setShowAdmin(true)}>Panel administrativo</button></div><div className="hero-intro"><p className="eyebrow">HIMNARIO DIGITAL</p></div></header><section className="catalog"><div className="section-heading"><div><p className="eyebrow dark">CATÁLOGO</p><h2>{category ? category.name : 'Selecciona una sección'}</h2></div>{category && <button className="text-button" onClick={goHome}>Volver al inicio</button>}</div>{!category ? <div className="category-grid">{categories.map((item, index) => <button className="category-card" key={item.id} onClick={() => setCategoryId(item.id)}><span className="category-number">0{index + 1}</span><strong>{item.name}</strong><span>{item.description}</span><small>{item.id === 'servicio' ? `${cloudService.length || item.hymns.length} pasos programados` : `${cloudHymns.length ? cloudHymns.filter((hymn) => hymn.category === item.id).length : item.hymns.length} alabanzas`} <span aria-hidden="true">→</span></small></button>)}</div> : <><input className="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={isServiceProgram ? 'Buscar un paso...' : 'Buscar una alabanza...'} aria-label="Buscar" />{orderedItems.length ? <div className={isServiceProgram ? 'service-list' : 'hymn-list'}>{orderedItems.map((hymn, index) => <button className={isServiceProgram ? 'service-row' : 'hymn-row'} key={hymn.id} onClick={() => !isServiceProgram && setSelectedHymn({ ...hymn, category: hymn.category || categoryId })}><span>{String(index + 1).padStart(2, '0')}</span><strong>{isServiceProgram ? hymn.description : hymn.title}</strong>{!isServiceProgram && <b>→</b>}</button>)}</div> : <div className="empty-state">Aún no hay alabanzas cargadas en esta sección.</div>}</>}</section></main>;
}

export default App;

function AdminPanel({ onClose }) {
  const [session, setSession] = useState(null);
  const [login, setLogin] = useState({ email: '', password: '' });
  const [loginMessage, setLoginMessage] = useState('');
  const [hymn, setHymn] = useState(emptyHymn);
  const [editingHymn, setEditingHymn] = useState(null);
  const [hymnMessage, setHymnMessage] = useState('');
  const [hymns, setHymns] = useState([]);
  const [showCatalog, setShowCatalog] = useState(false);
  const [step, setStep] = useState('');
  const [steps, setSteps] = useState([]);
  const [programMessage, setProgramMessage] = useState('');
  const isEditor = session?.user?.email?.toLowerCase() === EDITOR_EMAIL;

  useEffect(() => {
    if (!supabase) return;
    const today = new Date().toISOString().slice(0, 10);
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setShowCatalog(data.session?.user?.email?.toLowerCase() === EDITOR_EMAIL); });
    supabase.from('hymns').select('*').order('title').then(({ data }) => setHymns(data || []));
    supabase.from('service_program').select('*').eq('service_date', today).order('step_number').then(({ data }) => setSteps(data?.length ? data : (categories.find((item) => item.id === 'servicio')?.hymns || []).filter((item) => !getHiddenServiceSteps().includes(item.id)).map((item, index) => ({ ...item, description: item.description || item.title, step_number: index + 1, localDefault: true }))));
  }, []);

  if (!supabase) return <main className="admin-page"><button className="back-button" onClick={onClose}>← Volver</button><h1>Panel administrativo</h1><p>Agrega las credenciales de Supabase en `.env.local` para activarlo.</p></main>;
  const signIn = async (event) => { event.preventDefault(); const { data, error } = await supabase.auth.signInWithPassword(login); setSession(data.session); setShowCatalog(data.session?.user?.email?.toLowerCase() === EDITOR_EMAIL); setLoginMessage(error?.message || 'Sesión iniciada.'); };
  const resetEditor = () => { setEditingHymn(null); setHymn(emptyHymn); };
  const editHymn = (item) => { setEditingHymn(item); setHymn({ title: item.title, lyrics: item.lyrics || '', category: item.category }); setShowCatalog(true); };
  const saveHymn = async (event) => { event.preventDefault(); const title = hymn.title.trim(); if (hymns.some((item) => item.id !== editingHymn?.id && item.title.trim().toLocaleLowerCase('es') === title.toLocaleLowerCase('es'))) return setHymnMessage('Alabanza repetida. Usa otro nombre.'); let result; if (editingHymn) result = await supabase.from('hymns').update({ ...hymn, title }).eq('id', editingHymn.id).select().single(); else { const { data: last } = await supabase.from('hymns').select('number').order('number', { ascending: false }).limit(1).maybeSingle(); result = await supabase.from('hymns').insert({ ...hymn, title, number: (last?.number || 0) + 1 }).select().single(); } const { data, error } = result; setHymnMessage(error?.code === '23505' ? 'Alabanza repetida. Usa otro nombre.' : error?.message || (editingHymn ? 'Alabanza actualizada.' : 'Alabanza guardada correctamente.')); if (!error) { resetEditor(); setHymns((current) => (editingHymn ? current.map((item) => item.id === data.id ? data : item) : [...current, data]).sort((a, b) => a.title.localeCompare(b.title, 'es'))); } };
  const deleteHymn = async (item) => { if (!window.confirm(`¿Borrar "${item.title}"?`)) return; const { error } = await supabase.from('hymns').delete().eq('id', item.id); if (!error) setHymns((current) => current.filter((saved) => saved.id !== item.id)); setHymnMessage(error?.message || 'Alabanza borrada.'); };
  const saveStep = async (event) => { event.preventDefault(); const date = new Date().toISOString().slice(0, 10); const { data: last } = await supabase.from('service_program').select('step_number').eq('service_date', date).order('step_number', { ascending: false }).limit(1).maybeSingle(); const { data, error } = await supabase.from('service_program').insert({ service_date: date, step_number: (last?.step_number || 0) + 1, description: step }).select().single(); setProgramMessage(error?.message || (data ? `Paso guardado: ${data.description}` : 'No se pudo guardar el paso.')); if (!error) { setStep(''); setSteps((current) => [...current.filter((item) => !item.localDefault), data]); } };
  const deleteStep = async (item) => { if (item.localDefault) { const hiddenSteps = [...getHiddenServiceSteps(), item.id]; localStorage.setItem(HIDDEN_SERVICE_STEPS_KEY, JSON.stringify([...new Set(hiddenSteps)])); setSteps((current) => current.filter((saved) => saved.id !== item.id)); setProgramMessage('Paso predeterminado borrado.'); return; } const { error } = await supabase.from('service_program').delete().eq('id', item.id); if (!error) setSteps((current) => current.filter((saved) => saved.id !== item.id)); setProgramMessage(error?.message || 'Paso borrado.'); };
  if (!session) return <main className="admin-page"><button className="back-button" onClick={onClose}>← Volver</button><p className="eyebrow dark">ACCESO PRIVADO</p><h1>Panel administrativo</h1><form className="admin-form" onSubmit={signIn}><input type="email" placeholder="Correo" value={login.email} onChange={(event) => setLogin({ ...login, email: event.target.value })} required /><input type="password" placeholder="Contraseña" value={login.password} onChange={(event) => setLogin({ ...login, password: event.target.value })} required /><button>Ingresar</button>{loginMessage && <span className="form-message error">{loginMessage}</span>}</form></main>;
  return <main className="admin-page"><button className="back-button" onClick={onClose}>← Ver página</button><p className="eyebrow dark">{isEditor ? 'ACCESO DE EDITOR' : 'ACCESO ADMINISTRATIVO'}</p><h1>{isEditor ? 'Editor de alabanzas' : 'Panel administrativo'}</h1><div className="admin-tabs"><button onClick={() => setShowCatalog(!showCatalog)}>{showCatalog ? 'Ocultar catálogo' : 'Editar catálogo'}</button><button onClick={() => supabase.auth.signOut()}>Cerrar sesión</button></div>{!isEditor && <><h2>Nueva alabanza</h2><HymnForm hymn={hymn} setHymn={setHymn} saveHymn={saveHymn} message={hymnMessage} editing={editingHymn} cancel={resetEditor} /></>}{showCatalog && <><h2>Catálogo</h2><div className="service-list">{hymns.map((item) => <div className="service-row" key={item.id}><span>{item.number}</span><strong>{item.title}</strong><div className="row-actions"><button className="edit-button" type="button" onClick={() => editHymn(item)}>Editar</button>{!isEditor && <button className="delete-button" type="button" onClick={() => deleteHymn(item)}>Borrar</button>}</div>{isEditor && editingHymn?.id === item.id && <div className="inline-editor"><HymnForm hymn={hymn} setHymn={setHymn} saveHymn={saveHymn} message={hymnMessage} editing={editingHymn} cancel={resetEditor} /></div>}</div>)}</div></>}{!isEditor && <><h2>Programa de hoy</h2><form className="admin-form" onSubmit={saveStep}><input placeholder="Ej. Cantar alabanzas de avivamiento" value={step} onChange={(event) => setStep(event.target.value)} required /><div className="form-action"><button>Agregar paso</button>{programMessage && <span className="form-message">{programMessage}</span>}</div></form><div className="service-list">{steps.map((item) => <div className="service-row" key={item.id}><span>{String(item.step_number).padStart(2, '0')}</span><strong>{item.description}</strong><button className="delete-button" type="button" onClick={() => deleteStep(item)}>Borrar</button></div>)}</div></>}</main>;
}

function HymnForm({ hymn, setHymn, saveHymn, message, editing, cancel }) {
  return <form className="admin-form" onSubmit={saveHymn}><input placeholder="Título" value={hymn.title} onChange={(event) => setHymn({ ...hymn, title: event.target.value })} required /><select value={hymn.category} onChange={(event) => setHymn({ ...hymn, category: event.target.value })}><option value="adoracion">Adoración</option><option value="avivamiento">Avivamiento</option><option value="ninos">Alabanzas de niños</option></select><textarea placeholder="Letra" rows="12" value={hymn.lyrics} onChange={(event) => setHymn({ ...hymn, lyrics: event.target.value })} /><div className="form-action"><button>{editing ? 'Actualizar alabanza' : 'Guardar alabanza'}</button>{editing && <button type="button" className="secondary-button" onClick={cancel}>Cancelar</button>}{message && <span className="form-message">{message}</span>}</div></form>;
}
