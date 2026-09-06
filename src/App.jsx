import { useEffect, useState } from 'react';
import { allHymns, categories } from './hymns.js';
import { supabase } from './supabase.js';

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
    if (supabase) {
      const today = new Date().toISOString().slice(0, 10);
      supabase.from('hymns').select('*').order('number').then(({ data }) => setCloudHymns(data || []));
      supabase.from('service_program').select('*').eq('service_date', today).order('step_number').then(({ data }) => setCloudService(data || []));
    }
  }, [showAdmin]);
  const availableHymns = supabase
    ? cloudHymns.filter((hymn) => hymn.category === categoryId)
    : category?.hymns || allHymns;
  const visibleHymns = (category ? availableHymns : allHymns)
    .filter((hymn) => hymn.title.toLowerCase().includes(query.toLowerCase()));
  const serviceItems = cloudService.length ? cloudService : category?.hymns || [];
  const orderedItems = isServiceProgram
    ? serviceItems.filter((item) => (item.description || '').toLowerCase().includes(query.toLowerCase()))
    : [...visibleHymns].sort((firstHymn, secondHymn) => firstHymn.title.localeCompare(secondHymn.title, 'es'));

  const goHome = () => {
    setCategoryId(null);
    setSelectedHymn(null);
    setQuery('');
  };

  if (showAdmin) {
    return <AdminPanel onClose={() => setShowAdmin(false)} />;
  }

  if (selectedHymn) {
    return (
      <main className="app-shell lyric-page">
        <h1>{selectedHymn.title}</h1>
        <article className="lyrics">
          {selectedHymn.lyrics || selectedHymn.source
            ? selectedHymn.lyrics || new DOMParser().parseFromString(selectedHymn.source, 'text/html').querySelector('.letra')?.textContent.trim() || 'Esta letra todavía no tiene contenido.'
            : 'Esta letra todavía no tiene contenido.'}
        </article>
        <button className="back-button" onClick={() => setSelectedHymn(null)}>← Volver al índice</button>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <button className="brand" onClick={goHome}>PUERTA DEL CIELO</button>
        <button className="admin-link" onClick={() => setShowAdmin(true)}>Panel administrativo</button>
      </header>

      <section className="catalog">
        <div className="section-heading">
          <div>
            <p className="eyebrow dark">CATÁLOGO</p>
            <h2>{category ? category.name : 'Selecciona una sección'}</h2>
          </div>
          {category && <button className="text-button" onClick={goHome}>Volver al inicio</button>}
        </div>

        {!category ? (
          <div className="category-grid">
            {categories.map((item) => (
              <button className="category-card" key={item.id} onClick={() => setCategoryId(item.id)}>
                <span className="category-number">0{categories.indexOf(item) + 1}</span>
                <strong>{item.name}</strong>
                <span>{item.description}</span>
                <small>{item.id === 'servicio' ? `${cloudService.length || item.hymns.length} pasos programados` : `${cloudHymns.length ? cloudHymns.filter((hymn) => hymn.category === item.id).length : item.hymns.length} himnos disponibles`} →</small>
              </button>
            ))}
          </div>
        ) : (
          <>
            <input
              className="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={isServiceProgram ? 'Buscar un paso...' : 'Buscar una alabanza...'}
              aria-label={isServiceProgram ? 'Buscar un paso' : 'Buscar una alabanza'}
            />
            {orderedItems.length ? (
              <div className={isServiceProgram ? 'service-list' : 'hymn-list'}>
                {orderedItems.map((hymn, index) => (
                  <button
                    className={isServiceProgram ? 'service-row' : 'hymn-row'}
                    key={hymn.id}
                    onClick={() => !isServiceProgram && setSelectedHymn(hymn)}
                  >
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <strong>{isServiceProgram ? hymn.description : hymn.title}</strong>
                    {!isServiceProgram && <b>→</b>}
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty-state">Aún no hay himnos cargados en esta sección.</div>
            )}
          </>
        )}
      </section>
    </main>
  );
}

export default App;

function AdminPanel({ onClose }) {
  const [session, setSession] = useState(null);
  const [login, setLogin] = useState({ email: '', password: '' });
  const [loginMessage, setLoginMessage] = useState('');
  const [hymn, setHymn] = useState({ title: '', lyrics: '', category: 'adoracion' });
  const [step, setStep] = useState('');
  const [hymnMessage, setHymnMessage] = useState('');
  const [programMessage, setProgramMessage] = useState('');
  const [steps, setSteps] = useState([]);
  const [hymns, setHymns] = useState([]);
  const [showDeleteHymns, setShowDeleteHymns] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const today = new Date().toISOString().slice(0, 10);
    supabase.from('hymns').select('*').order('title').then(({ data }) => setHymns(data || []));
    supabase.from('service_program').select('*').eq('service_date', today).order('step_number').then(({ data }) => setSteps(data || []));
  }, []);

  if (!supabase) return <main className="admin-page"><button className="back-button" onClick={onClose}>← Volver</button><h1>Panel administrativo</h1><p>Agrega las credenciales de Supabase en `.env.local` para activarlo.</p></main>;

  const signIn = async (event) => {
    event.preventDefault();
    const { data, error } = await supabase.auth.signInWithPassword(login);
    setSession(data.session);
    setLoginMessage(error?.message || 'Sesión iniciada.');
  };
  const saveHymn = async (event) => {
    event.preventDefault();
    const normalizedTitle = hymn.title.trim().toLocaleLowerCase('es');
    const isDuplicate = hymns.some((savedHymn) => savedHymn.title.trim().toLocaleLowerCase('es') === normalizedTitle);
    if (isDuplicate) {
      setHymnMessage('Alabanza repetida. Usa otro nombre.');
      return;
    }
    const { data: lastHymn } = await supabase.from('hymns').select('number').order('number', { ascending: false }).limit(1).maybeSingle();
    const nextNumber = (lastHymn?.number || 0) + 1;
    const { data, error } = await supabase.from('hymns').insert({ ...hymn, title: hymn.title.trim(), number: nextNumber }).select().single();
    setHymnMessage(error?.code === '23505' ? 'Alabanza repetida. Usa otro nombre.' : error?.message || 'Alabanza guardada correctamente.');
    if (!error) {
      setHymn({ title: '', lyrics: '', category: 'adoracion' });
      setHymns([...hymns, data].sort((first, second) => first.title.localeCompare(second.title, 'es')));
    }
  };
  const saveStep = async (event) => {
    event.preventDefault();
    const date = new Date().toISOString().slice(0, 10);
    const { data: currentSteps } = await supabase.from('service_program').select('step_number').eq('service_date', date).order('step_number', { ascending: false }).limit(1);
    const nextNumber = (currentSteps?.[0]?.step_number || 0) + 1;
    const { data, error } = await supabase.from('service_program').insert({ service_date: date, step_number: nextNumber, description: step }).select().single();
    setProgramMessage(error?.message || `Paso guardado: ${data.description}`);
    if (!error) { setStep(''); setSteps([...steps, data]); }
  };
  const deleteStep = async (item) => {
    const { error } = await supabase.from('service_program').delete().eq('id', item.id);
    if (!error) setSteps(steps.filter((current) => current.id !== item.id));
    setProgramMessage(error?.message || 'Paso borrado.');
  };
  const deleteHymn = async (hymnToDelete) => {
    if (!window.confirm(`¿Borrar "${hymnToDelete.title}"?`)) return;
    const { error } = await supabase.from('hymns').delete().eq('id', hymnToDelete.id);
    if (!error) setHymns(hymns.filter((current) => current.id !== hymnToDelete.id));
    setHymnMessage(error?.message || 'Alabanza borrada.');
  };

  if (!session) return <main className="admin-page"><button className="back-button" onClick={onClose}>← Volver</button><h1>Panel administrativo</h1><form className="admin-form" onSubmit={signIn}><input type="email" placeholder="Correo administrador" value={login.email} onChange={(event) => setLogin({ ...login, email: event.target.value })} required /><input type="password" placeholder="Contraseña" value={login.password} onChange={(event) => setLogin({ ...login, password: event.target.value })} required /><button>Ingresar</button>{loginMessage && <span className="form-message error">{loginMessage}</span>}</form></main>;
  return <main className="admin-page"><button className="back-button" onClick={onClose}>← Ver página</button><h1>Panel administrativo</h1><div className="admin-tabs"><button onClick={() => setShowDeleteHymns(!showDeleteHymns)}>{showDeleteHymns ? 'Ocultar alabanzas' : 'Borrar alabanza'}</button><button onClick={() => supabase.auth.signOut()}>Cerrar sesión</button></div><h2>Nueva alabanza</h2><form className="admin-form" onSubmit={saveHymn}><input placeholder="Título" value={hymn.title} onChange={(event) => setHymn({ ...hymn, title: event.target.value })} required /><select value={hymn.category} onChange={(event) => setHymn({ ...hymn, category: event.target.value })}><option value="adoracion">Adoración</option><option value="avivamiento">Avivamiento</option></select><textarea placeholder="Letra" rows="12" value={hymn.lyrics} onChange={(event) => setHymn({ ...hymn, lyrics: event.target.value })} /><div className="form-action"><button>Guardar alabanza</button>{hymnMessage && <span className={hymnMessage.includes('repetida') ? 'form-message error' : 'form-message'}>{hymnMessage}</span>}</div></form>{showDeleteHymns && <><h2>Borrar alabanza</h2><div className="service-list">{hymns.length ? hymns.map((item) => <div className="service-row" key={item.id}><span>{item.number}</span><strong>{item.title}</strong><button className="delete-button" type="button" onClick={() => deleteHymn(item)}>Borrar</button></div>) : <div className="empty-state">No hay alabanzas guardadas.</div>}</div></>}<h2>Programa de hoy</h2><form className="admin-form" onSubmit={saveStep}><input placeholder="Ej. Cantar alabanzas de avivamiento" value={step} onChange={(event) => setStep(event.target.value)} required /><div className="form-action"><button>Agregar paso</button>{programMessage && <span className="form-message">{programMessage}</span>}</div></form><div className="service-list">{steps.map((item) => <div className="service-row" key={item.id}><span>{String(item.step_number).padStart(2, '0')}</span><strong>{item.description}</strong><button className="delete-button" type="button" onClick={() => deleteStep(item)}>Borrar</button></div>)}</div></main>;
}
