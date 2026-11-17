
import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  Activity, Flame, Utensils, Plus, Pencil, Trash2, X,
  CalendarDays, TrendingUp, HeartPulse, Footprints
} from 'lucide-react';
import './style.css';

const STORAGE_KEY = 'healthAndFitness';
const COLORS = ['#6c63ff', '#ff8a65'];

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const readData = () => {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};

const formatDate = date =>
  new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

function StatCard({ icon, label, value, unit, tone, note }) {
  return (
    <article className={`stat-card ${tone}`}>
      <div className="stat-top">
        <span className="stat-icon">{icon}</span>
        <span className="stat-label">{label}</span>
      </div>
      <div className="stat-value">
        {value}<small>{unit}</small>
      </div>
      <p>{note}</p>
    </article>
  );
}

export default function App() {
  const [entries, setEntries] = useState(readData);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState({
    date: today(),
    intake: '',
    burned: '',
    description: ''
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  const totalIntake = entries.reduce(
    (sum, item) => sum + Number(item.intake || 0), 0
  );

  const totalBurned = entries.reduce(
    (sum, item) => sum + Number(item.burned || 0), 0
  );

  const net = totalIntake - totalBurned;

  const latest = [...entries].sort((a, b) =>
    b.date.localeCompare(a.date)
  );

  const weekData = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6);

    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);

      const key = [
        day.getFullYear(),
        String(day.getMonth() + 1).padStart(2, '0'),
        String(day.getDate()).padStart(2, '0')
      ].join('-');

      const dayEntries = entries.filter(item => item.date === key);

      return {
        day: day.toLocaleDateString('en-US', { weekday: 'short' }),
        intake: dayEntries.reduce(
          (sum, item) => sum + Number(item.intake || 0), 0
        ),
        burned: dayEntries.reduce(
          (sum, item) => sum + Number(item.burned || 0), 0
        )
      };
    });
  }, [entries]);

  const pieData = [
    { name: 'Calories Intake', value: totalIntake },
    { name: 'Calories Burned', value: totalBurned }
  ];

  const openAdd = () => {
    setEditing(null);
    setForm({
      date: today(),
      intake: '',
      burned: '',
      description: ''
    });
    setModalOpen(true);
  };

  const openEdit = item => {
    setEditing(item.id);
    setForm({
      date: item.date,
      intake: String(item.intake),
      burned: String(item.burned),
      description: item.description || ''
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const submit = event => {
    event.preventDefault();

    if (!form.date || form.intake === '' || form.burned === '') {
      return;
    }

    const item = {
      id: editing ?? (
        globalThis.crypto?.randomUUID?.() || String(Date.now())
      ),
      date: form.date,
      intake: Number(form.intake),
      burned: Number(form.burned),
      description: form.description.trim()
    };

    setEntries(previous =>
      editing
        ? previous.map(row => row.id === editing ? item : row)
        : [...previous, item]
    );

    closeModal();
  };

  const remove = id => {
    if (window.confirm('Delete this health record?')) {
      setEntries(previous => previous.filter(item => item.id !== id));
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><Activity size={22} /></div>
          <span>Fit<span className="brand-accent">Track</span></span>
        </div>

        <div className="top-date">
          <CalendarDays size={16} />
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
          })}
        </div>
      </header>

      <main className="container">
        <section className="page-heading">
          <div>
            <p className="eyebrow">YOUR PERSONAL WELLNESS DASHBOARD</p>
            <h1>Health And Fitness Tracker</h1>
            <p className="subtitle">
              Small steps every day lead to big results. Keep moving forward!
            </p>
          </div>

          <button className="primary-btn" onClick={openAdd}>
            + Add data
          </button>
        </section>

        <section className="stats-grid">
          <StatCard
            icon={<Utensils />}
            label="Total Calories Intake"
            value={totalIntake.toLocaleString()}
            unit="kcal"
            tone="purple"
            note="Calories from your meals"
          />

          <StatCard
            icon={<Flame />}
            label="Total Calories Burned"
            value={totalBurned.toLocaleString()}
            unit="kcal"
            tone="orange"
            note="Calories burned through activity"
          />

          <StatCard
            icon={<HeartPulse />}
            label="Net Calories"
            value={net.toLocaleString()}
            unit="kcal"
            tone="green"
            note="Intake minus calories burned"
          />
        </section>

        <section className="charts-grid">
          <article className="panel weekly-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">YOUR ACTIVITY</p>
                {entries.length > 0 && <h2>Weekly Health Trends</h2>}
              </div>
              <span className="panel-icon">
                <TrendingUp size={18} />
              </span>
            </div>

            {entries.length === 0 ? (
              <div className="chart-empty">
                <div className="empty-illustration">
                  <Activity size={28} />
                </div>
                <strong>Your weekly trends will appear here</strong>
                <span>Add your first health record to see your progress.</span>
              </div>
            ) : (
              <div className="bar-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="intake"
                      name="Calories Intake"
                      fill="#756cf6"
                      radius={[5, 5, 0, 0]}
                    />
                    <Bar
                      dataKey="burned"
                      name="Calories Burned"
                      fill="#ff9a72"
                      radius={[5, 5, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </article>

          <article className="panel overall-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">AT A GLANCE</p>
                <h2>Overall Data</h2>
              </div>
              <span className="panel-icon">
                <Activity size={18} />
              </span>
            </div>

            <div className="pie-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="48%"
                    innerRadius="58%"
                    outerRadius="82%"
                    stroke="none"
                  >
                    {pieData.map((item, index) => (
                      <Cell
                        key={item.name}
                        fill={COLORS[index]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>

              <div className="pie-center">
                <strong>
                  {(totalIntake + totalBurned).toLocaleString()}
                </strong>
                <span>Total kcal</span>
              </div>
            </div>

            <div className="pie-legend">
              <span>
                <i className="dot purple" />
                Calories Intake <b>{totalIntake.toLocaleString()}</b>
              </span>
              <span>
                <i className="dot orange" />
                Calories Burned <b>{totalBurned.toLocaleString()}</b>
              </span>
            </div>
          </article>
        </section>

        <section className="panel recent-panel">
          <div className="panel-heading recent-heading">
            <div>
              <p className="eyebrow">YOUR JOURNEY SO FAR</p>
              <h2>Recent Health Statistics</h2>
            </div>
            <span className="record-count">
              {entries.length} {entries.length === 1 ? 'record' : 'records'}
            </span>
          </div>

          {latest.length === 0 ? (
            <div className="list-empty">
              <div className="empty-illustration">
                <Footprints size={27} />
              </div>
              <strong>No health statistics yet</strong>
              <span>
                Start tracking your meals and exercise by adding today's data.
              </span>
              <button className="text-btn" onClick={openAdd}>
                <Plus size={16} /> Add your first record
              </button>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>DATE</th>
                    <th>CALORIES INTAKE</th>
                    <th>CALORIES BURNED</th>
                    <th>DESCRIPTION</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {latest.map(item => (
                    <tr key={item.id}>
                      <td>{formatDate(item.date)}</td>
                      <td>
                        <span className="calorie-pill intake-pill">
                          <Utensils size={14} />
                          {Number(item.intake).toLocaleString()} kcal
                        </span>
                      </td>
                      <td>
                        <span className="calorie-pill burned-pill">
                          <Flame size={14} />
                          {Number(item.burned).toLocaleString()} kcal
                        </span>
                      </td>
                      <td>{item.description || '—'}</td>
                      <td>
                        <div className="row-actions">
                          <button
                            aria-label="Edit record"
                            onClick={() => openEdit(item)}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            aria-label="Delete record"
                            onClick={() => remove(item.id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer>Made for a healthier you <span>♥</span></footer>
      </main>

      {modalOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={event => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="form-title"
          >
            <div className="modal-heading">
              <div>
                <p className="eyebrow">KEEP YOUR PROGRESS UPDATED</p>
                <h2 id="form-title">Update Today's Data</h2>
              </div>
              <button
                className="close-btn"
                onClick={closeModal}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={submit}>
              <label>
                Date
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm({ ...form, date: e.target.value })}
                  required
                />
              </label>

              <div className="form-row">
                <label>
                  Calories Intake (kcal)
                  <input
                    type="number"
                    min="0"
                    placeholder="Enter Today's Calorie Intake"
                    value={form.intake}
                    onChange={e => setForm({
                      ...form,
                      intake: e.target.value
                    })}
                    required
                  />
                </label>

                <label>
                  Calories Burned (kcal)
                  <input
                    type="number"
                    min="0"
                    placeholder="Enter Today's Calorie Burned"
                    value={form.burned}
                    onChange={e => setForm({
                      ...form,
                      burned: e.target.value
                    })}
                    required
                  />
                </label>
              </div>

              <label>
                Short description
                <input
                  type="text"
                  placeholder="Enter a short description"
                  value={form.description}
                  onChange={e => setForm({
                    ...form,
                    description: e.target.value
                  })}
                  required
                />
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  Submit
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
