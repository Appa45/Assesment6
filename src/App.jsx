import React, { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Activity, Flame, Utensils, Plus, Pencil, Trash2, X, CalendarDays, TrendingUp, HeartPulse, Footprints } from 'lucide-react';
import './style.css';

const STORAGE_KEY = 'healthAndFitness';
const COLORS = ['#756cf6', '#ff9a72'];
const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const today = () => localDate();

function readEntries() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(saved)) return [];
    return saved.map((item, index) => ({
      id: item.id ?? `saved-${index}`,
      date: String(item.date || today()).slice(0, 10),
      intake: Number(item.intake ?? item.caloriesIntake ?? 0),
      burned: Number(item.burned ?? item.caloriesBurned ?? 0),
      description: String(item.description ?? item.shortDescription ?? '')
    }));
  } catch { return []; }
}

function StatCard({ icon, label, value, tone, note }) {
  return <article className={`stat-card ${tone}`}><div className="stat-top"><span className="stat-icon">{icon}</span><span className="stat-label">{label}</span></div><div className="stat-value">{Number(value).toLocaleString()}<small>kcal</small></div><p>{note}</p></article>;
}

export default function App() {
  const [entries, setEntries] = useState(readEntries);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ date: today(), intake: '', burned: '', description: '' });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); }
    catch (error) { console.error('Unable to save health data:', error); }
  }, [entries]);

  const totalIntake = entries.reduce((sum, item) => sum + Number(item.intake || 0), 0);
  const totalBurned = entries.reduce((sum, item) => sum + Number(item.burned || 0), 0);
  const netCalories = totalIntake - totalBurned;
  const recentEntries = [...entries].sort((a, b) => b.date.localeCompare(a.date));

  const weekData = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - 6);
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(start); day.setDate(start.getDate() + index);
      const key = localDate(day);
      const dayEntries = entries.filter(entry => entry.date === key);
      return {
        date: key,
        day: day.toLocaleDateString('en-US', { weekday: 'short' }),
        intake: dayEntries.reduce((sum, entry) => sum + Number(entry.intake || 0), 0),
        burned: dayEntries.reduce((sum, entry) => sum + Number(entry.burned || 0), 0)
      };
    });
  }, [entries]);
  const hasWeeklyData = weekData.some(day => day.intake > 0 || day.burned > 0);
  const pieData = [{ name: 'Calories Intake', value: totalIntake }, { name: 'Calories Burned', value: totalBurned }];

  const openAdd = () => { setEditingId(null); setForm({ date: today(), intake: '', burned: '', description: '' }); setModalOpen(true); };
  const openEdit = entry => { setEditingId(entry.id); setForm({ date: entry.date, intake: String(entry.intake), burned: String(entry.burned), description: entry.description || '' }); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditingId(null); };
  const handleSubmit = event => {
    event.preventDefault();
    if (!form.date || form.intake === '' || form.burned === '') return;
    const record = { id: editingId ?? (globalThis.crypto?.randomUUID?.() || String(Date.now())), date: form.date, intake: Number(form.intake), burned: Number(form.burned), description: form.description.trim() };
    setEntries(previous => editingId ? previous.map(entry => entry.id === editingId ? record : entry) : [...previous, record]);
    closeModal();
  };
  const deleteEntry = id => { if (window.confirm('Delete this health record?')) setEntries(previous => previous.filter(entry => entry.id !== id)); };

  return <div className="app-shell">
    <header className="topbar"><div className="brand"><div className="brand-mark"><Activity size={22} /></div><span>Fit<span className="brand-accent">Track</span></span></div><div className="top-date"><CalendarDays size={16} />{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div></header>
    <main className="container">
      <section className="page-heading"><div><p className="eyebrow">YOUR PERSONAL WELLNESS DASHBOARD</p><h1>Health And Fitness Tracker</h1><p className="subtitle">Small steps every day lead to big results. Keep moving forward!</p></div><button type="button" className="primary-btn add-button" onClick={openAdd}>+ Add data</button></section>
      <section className="stats-grid" aria-label="Health summary">
        <StatCard icon={<Utensils />} label="Total Calories Intake" value={totalIntake} tone="purple" note="Calories from your meals" />
        <StatCard icon={<Flame />} label="Total Calories Burned" value={totalBurned} tone="orange" note="Calories burned through activity" />
        <StatCard icon={<HeartPulse />} label="Net Calories" value={netCalories} tone="green" note="Intake minus calories burned" />
      </section>
      <section className="charts-grid">
        <article className="panel weekly-panel"><div className="panel-heading"><div><p className="eyebrow">YOUR ACTIVITY</p>{hasWeeklyData && <h2>Weekly Health Trends</h2>}</div><span className="panel-icon"><TrendingUp size={18} /></span></div>
          {!hasWeeklyData ? <div className="chart-empty"><div className="empty-illustration"><Activity size={28} /></div><strong>Your weekly trends will appear here</strong><span>Add a record from the last seven days to see your progress.</span></div> : <div className="bar-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={weekData} margin={{ top: 12, right: 10, left: -16, bottom: 0 }} barGap={7}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf0f6" /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#8992a6', fontSize: 12 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#8992a6', fontSize: 11 }} /><Tooltip /><Legend iconType="circle" /><Bar dataKey="intake" name="Calories Intake" fill="#756cf6" radius={[5, 5, 0, 0]} maxBarSize={28} /><Bar dataKey="burned" name="Calories Burned" fill="#ff9a72" radius={[5, 5, 0, 0]} maxBarSize={28} /></BarChart></ResponsiveContainer></div>}
        </article>
        <article className="panel overall-panel"><div className="panel-heading"><div><p className="eyebrow">AT A GLANCE</p><h2>Overall Data</h2></div><span className="panel-icon"><Activity size={18} /></span></div><div className="pie-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="48%" innerRadius="58%" outerRadius="82%" paddingAngle={totalIntake + totalBurned > 0 ? 4 : 0} stroke="none">{pieData.map((item, index) => <Cell key={item.name} fill={COLORS[index]} />)}</Pie><Tooltip formatter={value => `${Number(value).toLocaleString()} kcal`} /></PieChart></ResponsiveContainer><div className="pie-center"><strong>{(totalIntake + totalBurned).toLocaleString()}</strong><span>Total kcal</span></div></div><div className="pie-legend"><span><i className="dot purple" />Calories Intake <b>{totalIntake.toLocaleString()}</b></span><span><i className="dot orange" />Calories Burned <b>{totalBurned.toLocaleString()}</b></span></div></article>
      </section>
      <section className="panel recent-panel"><div className="panel-heading recent-heading"><div><p className="eyebrow">YOUR JOURNEY SO FAR</p><h2>Recent Health Statistics</h2></div><span className="record-count">{entries.length} {entries.length === 1 ? 'record' : 'records'}</span></div>
        {recentEntries.length === 0 ? <div className="list-empty"><div className="empty-illustration"><Footprints size={27} /></div><strong>No health statistics yet</strong><span>Start tracking your meals and exercise by adding today's data.</span><button type="button" className="text-btn" onClick={openAdd}><Plus size={16} /> Add your first record</button></div> : <div className="table-wrap"><table><thead><tr><th>DATE</th><th>CALORIES INTAKE</th><th>CALORIES BURNED</th><th>DESCRIPTION</th><th className="actions-head">ACTIONS</th></tr></thead><tbody>{recentEntries.map(entry => <tr key={entry.id}><td className="date-cell">{entry.date}</td><td><span className="calorie-pill intake-pill"><Utensils size={14} />Calories Intake = {Number(entry.intake)}</span></td><td><span className="calorie-pill burned-pill"><Flame size={14} />Calories Burned = {Number(entry.burned)}</span></td><td className="description-cell">{entry.description || '—'}</td><td><div className="row-actions"><button type="button" aria-label="Edit record" title="Edit" onClick={() => openEdit(entry)}><Pencil size={16} /></button><button type="button" aria-label="Delete record" title="Delete" onClick={() => deleteEntry(entry.id)}><Trash2 size={16} /></button></div></td></tr>)}</tbody></table></div>}
      </section>
      <footer>Made for a healthier you <span>♥</span></footer>
    </main>
    {modalOpen && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) closeModal(); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="form-title"><div className="modal-heading"><div><p className="eyebrow">KEEP YOUR PROGRESS UPDATED</p><h2 id="form-title">Update Today's Data</h2></div><button type="button" className="close-btn" onClick={closeModal} aria-label="Close"><X size={20} /></button></div><form onSubmit={handleSubmit}><label>Date<input type="date" value={form.date} onChange={event => setForm({ ...form, date: event.target.value })} required /></label><div className="form-row"><label>Calories Intake (kcal)<input type="number" min="0" step="1" placeholder="Enter Today's Calorie Intake" value={form.intake} onChange={event => setForm({ ...form, intake: event.target.value })} required /></label><label>Calories Burned (kcal)<input type="number" min="0" step="1" placeholder="Enter Today's Calorie Burned" value={form.burned} onChange={event => setForm({ ...form, burned: event.target.value })} required /></label></div><label>Short description<input type="text" placeholder="Enter a short description" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} required /></label><div className="modal-actions"><button type="button" className="secondary-btn" onClick={closeModal}>Cancel</button><button type="submit" className="primary-btn submit-btn">Submit</button></div></form></section></div>}
  </div>;
}
