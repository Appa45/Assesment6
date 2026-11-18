
import React, { useEffect, useState } from 'react';
import {
  BrowserRouter, Link, NavLink, Route, Routes, useNavigate
} from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import './style.css';

const API = 'https://restaurantdata.onrender.com';
const BOOKING_KEY = 'bookings';

const listFrom = (data, keys = []) => {
  if (Array.isArray(data)) return data;
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  if (data?.data && typeof data.data === 'object') {
    return listFrom(data.data, keys);
  }
  return [];
};

const itemName = item =>
  typeof item === 'string'
    ? item
    : item?.name ||
      item?.state ||
      item?.city ||
      item?.State ||
      item?.City ||
      item?.state_name ||
      item?.city_name ||
      '';

const nameOf = r =>
  r?.restaurantName ||
  r?.restaurant_name ||
  r?.name ||
  r?.RestaurantName ||
  r?.['Restaurant Name'] ||
  'Restaurant';

const addressOf = r =>
  r?.address || r?.Address || r?.location || 'Address not provided';

const ratingOf = r =>
  r?.overallRating ??
  r?.overall_rating ??
  r?.rating ??
  r?.Rating ??
  r?.['Overall Rating'] ??
  'N/A';

const readBookings = () => {
  try {
    const data = JSON.parse(localStorage.getItem(BOOKING_KEY) || '[]');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};

const dateOptions = () =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);

    return {
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      day: d.toLocaleDateString('en-US', { weekday: 'short' }),
      date: d.getDate(),
      label: i === 0
        ? 'Today'
        : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    };
  });

const PERIODS = [
  { label: 'Morning', times: ['09:00 AM', '10:00 AM', '11:00 AM'] },
  { label: 'Afternoon', times: ['12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'] },
  { label: 'Evening', times: ['05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM', '09:00 PM'] }
];

function Header({ count }) {
  return (
    <header className="header">
      <div className="nav">
        <Link to="/" className="brand">
          <span className="brand-icon">TM</span>
          Table<span>Mate</span>
        </Link>
        <nav>
          <NavLink to="/" end>Find Restaurants</NavLink>
          <a href="/#locations">Locations</a>
          <NavLink to="/my-bookings">
            My Bookings <b>{count}</b>
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

function Loading({ children = 'Loading...' }) {
  return <div className="loading"><i />{children}</div>;
}

/* Custom dropdown: Cypress can locate options inside li elements */
function LocationDropdown({
  id,
  label,
  value,
  options,
  placeholder,
  onChange,
  disabled = false
}) {
  const [open, setOpen] = useState(false);

  return (
    <label>
      {label}
      <div id={id} className="location-dropdown">
        <button
          type="button"
          className="location-dropdown-trigger"
          disabled={disabled}
          aria-expanded={open}
          onClick={() => setOpen(current => !current)}
        >
          <span>{value || placeholder}</span>
          <span>⌄</span>
        </button>

        {open && !disabled && (
          <ul className="location-dropdown-list">
            {options.map(option => (
              <li
                key={option}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
              >
                {option}
              </li>
            ))}
            {options.length === 0 && (
              <li className="no-options">No options available</li>
            )}
          </ul>
        )}
      </div>
    </label>
  );
}

function RestaurantCard({ restaurant, onBook }) {
  return (
    <article className="restaurant-card">
      <img
        src={restaurant.image || restaurant.imageUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=900'}
        alt={nameOf(restaurant)}
      />
      <div className="restaurant-info">
        <div className="card-title">
          <h3>{nameOf(restaurant)}</h3>
          <span>★ {ratingOf(restaurant)}</span>
        </div>
        <p>{addressOf(restaurant)}</p>
        <p>
          {restaurant.city || restaurant.City || ''}
          {restaurant.state || restaurant.State
            ? `, ${restaurant.state || restaurant.State}`
            : ''}
        </p>
        <button
          className="btn primary full"
          onClick={() => onBook(restaurant)}
        >
          Book FREE Reservation
        </button>
      </div>
    </article>
  );
}

function SearchPage({ onBook }) {
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [restaurants, setRestaurants] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loadingStates, setLoadingStates] = useState(true);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    fetch(`${API}/states`)
      .then(response => {
        if (!response.ok) throw new Error('Could not load states.');
        return response.json();
      })
      .then(data => {
        if (active) {
          setStates(
            listFrom(data, ['states', 'data', 'results'])
              .map(itemName)
              .filter(Boolean)
          );
        }
      })
      .catch(err => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoadingStates(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!state) {
      setCities([]);
      setCity('');
      return;
    }

    let active = true;

    setLoadingCities(true);
    setCities([]);
    setCity('');

    fetch(`${API}/cities/${encodeURIComponent(state)}`)
      .then(response => {
        if (!response.ok) throw new Error('Could not load cities.');
        return response.json();
      })
      .then(data => {
        if (active) {
          setCities(
            listFrom(data, ['cities', 'data', 'results'])
              .map(itemName)
              .filter(Boolean)
          );
        }
      })
      .catch(err => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoadingCities(false);
      });

    return () => {
      active = false;
    };
  }, [state]);

  const search = async event => {
    event.preventDefault();

    if (!state || !city) {
      setError('Please select both a state and a city.');
      return;
    }

    sessionStorage.setItem('selectedState', state);
    sessionStorage.setItem('selectedCity', city);

    setError('');
    setSearched(true);
    setLoadingResults(true);
    setRestaurants([]);

    try {
      const response = await fetch(
        `${API}/restaurants?state=${encodeURIComponent(state)}&city=${encodeURIComponent(city)}`
      );

      if (!response.ok) {
        throw new Error('Unable to fetch restaurants. Please try again.');
      }

      const data = await response.json();
      setRestaurants(
        listFrom(data, ['restaurants', 'data', 'results'])
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingResults(false);
    }
  };

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <small>GOOD FOOD. GREAT COMPANY.</small>
          <h1>
            Find your table.<br />
            <em>Make it memorable.</em>
          </h1>
          <p>
            Discover great restaurants and reserve your next dining
            experience in just a few clicks.
          </p>
          <a href="#restaurant-search">Explore restaurants ↓</a>
        </div>

        <div className="hero-image">
          <img
            src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200"
            alt="Restaurant dining room"
          />
        </div>
      </section>

      <section className="search-area" id="restaurant-search">
        <div className="section-title">
          <small>START EXPLORING</small>
          <h2>Where would you like to dine?</h2>
          <p>Choose a location to find restaurants near you.</p>
        </div>

        <form className="search-form" onSubmit={search}>
          <LocationDropdown
            id="state"
            label="State"
            value={state}
            options={states}
            placeholder={loadingStates ? 'Loading states...' : 'Select a state'}
            onChange={value => {
              setState(value);
              setCity('');
              setSearched(false);
              setRestaurants([]);
              setError('');
            }}
          />

          <LocationDropdown
            id="city"
            label="City"
            value={city}
            options={cities}
            placeholder={
              !state
                ? 'Select a state first'
                : loadingCities
                  ? 'Loading cities...'
                  : 'Select a city'
            }
            disabled={!state || loadingCities}
            onChange={value => {
              setCity(value);
              setError('');
            }}
          />

          <button
            id="searchBtn"
            className="btn primary"
            type="submit"
            disabled={!state || !city || loadingResults}
          >
            {loadingResults ? 'Searching...' : 'Search'}
          </button>
        </form>

        {error && <p className="error">{error}</p>}
      </section>

      <section className="results" id="locations">
        {loadingResults && (
          <Loading>Finding restaurants for you...</Loading>
        )}

        {searched && !loadingResults && (
          <>
            <div className="results-heading">
              <div>
                <small>YOUR SEARCH RESULTS</small>
                <h1>{restaurants.length} restaurants available in {city}</h1>
              </div>
              <span>{city}, {state}</span>
            </div>

            {restaurants.length > 0 ? (
              <div className="restaurant-grid">
                {restaurants.map((restaurant, index) => (
                  <RestaurantCard
                    key={restaurant.id || restaurant._id || `${nameOf(restaurant)}-${index}`}
                    restaurant={restaurant}
                    onBook={onBook}
                  />
                ))}
              </div>
            ) : (
              <div className="empty">
                <h3>No restaurants found</h3>
                <p>Try another city or check back later.</p>
              </div>
            )}
          </>
        )}
      </section>

      <section className="inspiration">
        <div className="section-title">
          <small>A LITTLE INSPIRATION</small>
          <h2>Good food brings us together.</h2>
        </div>

        <Swiper
          modules={[Navigation, Pagination, Autoplay]}
          navigation
          pagination={{ clickable: true }}
          autoplay={{ delay: 4000, disableOnInteraction: false }}
          spaceBetween={18}
          slidesPerView={1}
          breakpoints={{
            640: { slidesPerView: 2 },
            950: { slidesPerView: 3 }
          }}
        >
          {[
            ['A table for every occasion', 'photo-1414235077428-338989a2e8c0'],
            ['Discover neighborhood gems', 'photo-1555396273-367ea4eb4db5'],
            ['Make tonight delicious', 'photo-1515003197210-e0cd7184f8b5']
          ].map(([title, image]) => (
            <SwiperSlide key={title}>
              <div className="slide">
                <img
                  src={`https://images.unsplash.com/${image}?w=800`}
                  alt="Dining inspiration"
                />
                <h3>{title}</h3>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </section>
    </>
  );
}

function BookingPage({ restaurant, onConfirm }) {
  const navigate = useNavigate();
  const [dates] = useState(dateOptions);
  const [date, setDate] = useState(dateOptions()[0].value);
  const [time, setTime] = useState('');
  const [guests, setGuests] = useState('2');
  const [guestName, setGuestName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  if (!restaurant) {
    return (
      <main className="page">
        <div className="empty">
          <h2>Select a restaurant first</h2>
          <Link className="btn primary" to="/">Find restaurants</Link>
        </div>
      </main>
    );
  }

  const submit = event => {
    event.preventDefault();

    if (!time) {
      setError('Please select a reservation time.');
      return;
    }

    const booking = {
      id: `booking-${Date.now()}`,
      restaurantName: nameOf(restaurant),
      address: addressOf(restaurant),
      city: restaurant.city || restaurant.City || sessionStorage.getItem('selectedCity') || '',
      state: restaurant.state || restaurant.State || sessionStorage.getItem('selectedState') || '',
      date,
      time,
      guests: Number(guests),
      guestName,
      email,
      createdAt: new Date().toISOString()
    };

    onConfirm(booking);
    navigate('/my-bookings');
  };

  return (
    <main className="page">
      <Link to="/" className="back">← Back to restaurants</Link>

      <div className="booking-layout">
        <section>
          <small className="kicker">RESERVE YOUR TABLE</small>
          <h1>Book your experience</h1>

          <div className="selected-restaurant">
            <img
              src={restaurant.image || restaurant.imageUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=700'}
              alt=""
            />
            <div>
              <h2>{nameOf(restaurant)}</h2>
              <p>{addressOf(restaurant)}</p>
              <b>★ {ratingOf(restaurant)}</b>
            </div>
          </div>

          <form onSubmit={submit} className="booking-form">
            <h2>Choose a date</h2>
            <p className="muted">
              Reservations are available up to 7 days in advance.
            </p>

            <div className="date-grid">
              {dates.map(day => (
                <button
                  type="button"
                  key={day.value}
                  className={date === day.value ? 'chosen' : ''}
                  onClick={() => {
                    setDate(day.value);
                    setTime('');
                  }}
                >
                  <p>{day.label}</p>
                  <strong>{day.date}</strong>
                  <small>{day.day}</small>
                </button>
              ))}
            </div>

            <h2>Choose a time</h2>

            {PERIODS.map(period => (
              <div className="period" key={period.label}>
                <p>{period.label}</p>
                <div className="time-grid">
                  {period.times.map(slot => (
                    <button
                      type="button"
                      key={slot}
                      className={time === slot ? 'chosen' : ''}
                      onClick={() => setTime(slot)}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <h2>Your details</h2>

            <div className="guest-grid">
              <label>
                Full name
                <input
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                  placeholder="Enter your name"
                  required
                />
              </label>

              <label>
                Email address
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </label>

              <label>
                Number of guests
                <select
                  value={guests}
                  onChange={e => setGuests(e.target.value)}
                >
                  {Array.from({ length: 10 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                  ))}
                </select>
              </label>
            </div>

            {error && <p className="error">{error}</p>}

            <button type="submit" className="btn primary full">
              Confirm FREE Reservation
            </button>
          </form>
        </section>

        <aside className="booking-aside">
          <span>✦</span>
          <h3>It's the little moments.</h3>
          <p>Good food, good company, and a table waiting just for you.</p>
          <hr />
          <small>Reservation date</small>
          <b>
            {new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric'
            })}
          </b>
          <small>Selected time</small>
          <b>{time || 'Choose a time slot'}</b>
          <small>Guests</small>
          <b>{guests}</b>
          <p>✓ No payment required to reserve</p>
        </aside>
      </div>
    </main>
  );
}

function MyBookings({ bookings }) {
  return (
    <main className="page my-bookings">
      <div className="section-title">
        <small>YOUR UPCOMING EXPERIENCES</small>
        <h1>My Bookings</h1>
        <p>All your table reservations, together in one place.</p>
      </div>

      {!bookings.length ? (
        <div className="empty">
          <h2>No bookings yet</h2>
          <p>Your next great meal is waiting to be planned.</p>
          <Link to="/" className="btn primary">Find a restaurant</Link>
        </div>
      ) : (
        <div className="booking-list">
          {[...bookings]
            .sort((a, b) => a.date.localeCompare(b.date))
            .map(booking => (
              <article className="booking-row" key={booking.id}>
                <div>
                  <small>TABLE RESERVED</small>
                  <h2>{booking.restaurantName}</h2>
                  <p>{booking.address}</p>
                  <p>
                    {booking.city}
                    {booking.state ? `, ${booking.state}` : ''}
                  </p>
                </div>

                <div className="booking-meta">
                  <small>Date</small>
                  <b>
                    {new Date(`${booking.date}T12:00:00`).toLocaleDateString(
                      'en-US',
                      { month: 'long', day: 'numeric', year: 'numeric' }
                    )}
                  </b>
                  <small>Time</small>
                  <b>{booking.time}</b>
                  <small>Guests</small>
                  <b>{booking.guests}</b>
                </div>

                <span className="confirmed">✓ Confirmed</span>
              </article>
            ))}
        </div>
      )}
    </main>
  );
}

function AppShell() {
  const [bookings, setBookings] = useState(readBookings);

  const [restaurant, setRestaurant] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('selectedRestaurant') || 'null');
    } catch {
      return null;
    }
  });

  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem(BOOKING_KEY, JSON.stringify(bookings));
  }, [bookings]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [window.location.pathname]);

  const book = selectedRestaurant => {
    setRestaurant(selectedRestaurant);
    sessionStorage.setItem('selectedRestaurant', JSON.stringify(selectedRestaurant));
    sessionStorage.setItem(
      'selectedCity',
      selectedRestaurant.city || selectedRestaurant.City || sessionStorage.getItem('selectedCity') || ''
    );
    sessionStorage.setItem(
      'selectedState',
      selectedRestaurant.state || selectedRestaurant.State || sessionStorage.getItem('selectedState') || ''
    );
    navigate('/booking');
  };

  return (
    <>
      <Header count={bookings.length} />

      <Routes>
        <Route path="/" element={<SearchPage onBook={book} />} />
        <Route
          path="/booking"
          element={
            <BookingPage
              restaurant={restaurant}
              onConfirm={booking => setBookings(old => [...old, booking])}
            />
          }
        />
        <Route
          path="/my-bookings"
          element={<MyBookings bookings={bookings} />}
        />
        <Route
          path="*"
          element={
            <main className="page">
              <div className="empty">
                <h2>Page not found</h2>
                <Link to="/">Return home</Link>
              </div>
            </main>
          }
        />
      </Routes>

      <footer className="footer">
        <Link to="/" className="brand">Table<span>Mate</span></Link>
        <p>Find a seat. Share a moment.</p>
        <small>© {new Date().getFullYear()} TableMate</small>
      </footer>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
