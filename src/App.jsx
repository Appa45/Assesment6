
import React, { useEffect, useState } from 'react';
import {
  BrowserRouter,
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';
import './style.css';

const API = 'https://restaurantdata.onrender.com';
const BOOKING_KEY = 'bookings';

const FALLBACK_STATES = [
  'Andhra Pradesh',
  'California',
  'Florida',
  'Karnataka',
  'Maharashtra',
  'New York',
  'Tamil Nadu',
  'Texas',
  'Telangana',
];

const TIME_SLOTS = {
  Morning: ['09:00 AM', '10:00 AM', '11:00 AM'],
  Afternoon: ['12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM'],
  Evening: ['05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM'],
};

function listFrom(data, keys = []) {
  if (Array.isArray(data)) return data;

  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }

  if (data?.data && typeof data.data === 'object') {
    return listFrom(data.data, keys);
  }

  return [];
}

function itemName(item) {
  if (typeof item === 'string') return item;

  return (
    item?.name ||
    item?.state ||
    item?.city ||
    item?.State ||
    item?.City ||
    item?.state_name ||
    item?.city_name ||
    ''
  );
}

function nameOf(restaurant) {
  return (
    restaurant?.restaurantName ||
    restaurant?.restaurant_name ||
    restaurant?.name ||
    restaurant?.title ||
    'Restaurant'
  );
}

function restaurantIdOf(restaurant, index = 0) {
  return (
    restaurant?.id ||
    restaurant?._id ||
    restaurant?.restaurantId ||
    restaurant?.restaurant_id ||
    `restaurant-${index}`
  );
}

function readBookings() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(BOOKING_KEY) || '[]'
    );

    if (Array.isArray(saved)) return saved;
    if (Array.isArray(saved?.bookings)) return saved.bookings;

    return [];
  } catch {
    return [];
  }
}

function Header() {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link to="/" className="brand">
          <span className="brand-icon">R</span>
          <span>Reserve<span className="brand-highlight">Dine</span></span>
        </Link>

        <nav className="main-nav">
          <NavLink to="/" end>
            Find Restaurants
          </NavLink>
          <NavLink to="/my-bookings">
            My Bookings
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <p>© {new Date().getFullYear()} ReserveDine. Made for good food and great moments.</p>
    </footer>
  );
}

function LocationDropdown({
  id,
  label,
  value,
  options = [],
  placeholder,
  onChange,
  disabled = false,
  loading = false,
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="filter-field">
      <label className="filter-label" htmlFor={`${id}-trigger`}>
        {label}
      </label>

      <div id={id} className="location-dropdown">
        <button
          id={`${id}-trigger`}
          type="button"
          className="location-dropdown-trigger"
          disabled={disabled}
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          <span>{value || (loading ? 'Loading...' : placeholder)}</span>
          <span className={`dropdown-arrow ${open ? 'is-open' : ''}`}>⌄</span>
        </button>

        {open && !disabled && (
          <ul className="location-dropdown-list">
            {loading ? (
              <li className="dropdown-message">Loading options...</li>
            ) : options.length > 0 ? (
              options.map((option) => (
                <li
                  key={option}
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                >
                  {option}
                </li>
              ))
            ) : (
              <li className="dropdown-message">No options available</li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

function RestaurantCard({ restaurant, index, onBook }) {
  const name = nameOf(restaurant);
  const address =
    restaurant?.address ||
    restaurant?.location ||
    restaurant?.area ||
    'Location details available on request';

  const rating = restaurant?.rating || restaurant?.ratings;
  const image =
    restaurant?.image ||
    restaurant?.imageUrl ||
    restaurant?.image_url ||
    restaurant?.photo;

  return (
    <article className="restaurant-card">
      <div className="restaurant-image-wrap">
        {image ? (
          <img src={image} alt={name} className="restaurant-image" />
        ) : (
          <div className="restaurant-image-placeholder">
            <span>🍽️</span>
          </div>
        )}
        <span className="restaurant-tag">Popular choice</span>
      </div>

      <div className="restaurant-card-content">
        <div className="restaurant-title-row">
          <h3>{name}</h3>
          {rating && (
            <span className="rating">
              ★ {rating}
            </span>
          )}
        </div>

        <p className="restaurant-address">{address}</p>

        {restaurant?.cuisine && (
          <p className="restaurant-cuisine">{restaurant.cuisine}</p>
        )}

        <button
          type="button"
          className="primary-button restaurant-book-button"
          onClick={() => onBook(restaurant, index)}
        >
          Book FREE Reservation
        </button>
      </div>
    </article>
  );
}

function SearchPage() {
  const navigate = useNavigate();

  const [states, setStates] = useState(FALLBACK_STATES);
  const [cities, setCities] = useState([]);
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [restaurants, setRestaurants] = useState([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadStates() {
      setLoadingStates(true);

      try {
        const response = await fetch(`${API}/states`);
        if (!response.ok) throw new Error('Unable to load states');

        const data = await response.json();
        const stateList = listFrom(data, ['states', 'data', 'results'])
          .map(itemName)
          .filter(Boolean);

        if (active && stateList.length > 0) {
          setStates(stateList);
        }
      } catch {
        // Keep the fallback state list available if the API is temporarily unavailable.
        if (active) setStates(FALLBACK_STATES);
      } finally {
        if (active) setLoadingStates(false);
      }
    }

    loadStates();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!state) {
      setCities([]);
      setCity('');
      setLoadingCities(false);
      return undefined;
    }

    let active = true;

    async function loadCities() {
      setLoadingCities(true);
      setCities([]);
      setCity('');
      setError('');

      try {
        const response = await fetch(
          `${API}/cities/${encodeURIComponent(state)}`
        );

        if (!response.ok) {
          throw new Error('Could not load cities. Please try again.');
        }

        const data = await response.json();
        const cityList = Array.isArray(data)
          ? data
          : listFrom(data, ['cities', 'data', 'results']);

        if (active) {
          setCities(cityList.map(itemName).filter(Boolean));
        }
      } catch (err) {
        if (active) {
          setError(err.message || 'Could not load cities.');
        }
      } finally {
        if (active) setLoadingCities(false);
      }
    }

    loadCities();

    return () => {
      active = false;
    };
  }, [state]);

  function handleStateChange(value) {
    setState(value);
    setCity('');
    setCities([]);
    setRestaurants([]);
    setSearched(false);
    setError('');
  }

  async function handleSearch(event) {
    event.preventDefault();

    if (!state || !city) {
      setError('Please select both a state and a city.');
      return;
    }

    setSearching(true);
    setError('');
    setRestaurants([]);
    setSearched(true);

    try {
      const params = new URLSearchParams();
      params.set('state', state);
      params.set('city', city);

      const response = await fetch(`${API}/restaurants?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Unable to load restaurants. Please try again.');
      }

      const data = await response.json();
      const restaurantList = Array.isArray(data)
        ? data
        : listFrom(data, ['restaurants', 'data', 'results']);

      setRestaurants(restaurantList);
      sessionStorage.setItem('selectedState', state);
      sessionStorage.setItem('selectedCity', city);
      sessionStorage.setItem(
        'searchRestaurants',
        JSON.stringify(restaurantList)
      );
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSearching(false);
    }
  }

  function handleBook(restaurant, index) {
    const id = restaurantIdOf(restaurant, index);

    sessionStorage.setItem('selectedRestaurant', JSON.stringify(restaurant));

    navigate(`/booking/${encodeURIComponent(id)}`, {
      state: { restaurant, state, city },
    });
  }

  return (
    <main>
      <section className="hero-section">
        <div className="hero-content">
          <span className="eyebrow">GOOD FOOD. GREAT MOMENTS.</span>
          <h1>Find your table.<br />Make it memorable.</h1>
          <p>
            Discover restaurants around you and reserve your perfect dining
            experience in just a few clicks.
          </p>
        </div>
      </section>

      <section className="search-section">
        <div className="search-panel">
          <div className="search-panel-heading">
            <div>
              <span className="section-kicker">EXPLORE RESTAURANTS</span>
              <h2>Where would you like to dine?</h2>
            </div>
            <span className="search-icon">⌕</span>
          </div>

          <form className="location-form" onSubmit={handleSearch}>
            <LocationDropdown
              id="state"
              label="State"
              value={state}
              options={states}
              placeholder="Select a state"
              loading={loadingStates}
              onChange={handleStateChange}
            />

            <LocationDropdown
              id="city"
              label="City"
              value={city}
              options={cities}
              placeholder="Select a city"
              disabled={!state}
              loading={loadingCities}
              onChange={(value) => {
                setCity(value);
                setError('');
              }}
            />

            <button
              id="searchBtn"
              type="submit"
              className="primary-button search-button"
              disabled={searching}
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </form>

          {error && <p className="error-message">{error}</p>}
        </div>
      </section>

      <section className="results-section">
        {searched && !searching && (
          <>
            <div className="results-heading">
              <div>
                <span className="section-kicker">YOUR OPTIONS</span>
                <h1>
                  {restaurants.length} restaurants available in {city}
                </h1>
              </div>
            </div>

            {restaurants.length > 0 ? (
              <div className="restaurant-grid">
                {restaurants.map((restaurant, index) => (
                  <RestaurantCard
                    key={restaurantIdOf(restaurant, index)}
                    restaurant={restaurant}
                    index={index}
                    onBook={handleBook}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <span>🍽️</span>
                <h3>No restaurants found</h3>
                <p>Try selecting another location.</p>
              </div>
            )}
          </>
        )}

        {searching && (
          <div className="loading-state">
            <span className="loading-spinner" />
            <p>Finding the best restaurants for you...</p>
          </div>
        )}
      </section>
    </main>
  );
}

function BookingPage({ onConfirm }) {
  const { restaurantId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [restaurant, setRestaurant] = useState(
    location.state?.restaurant || null
  );
  const [selectedDate, setSelectedDate] = useState('Today');
  const [selectedTime, setSelectedTime] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [bookingError, setBookingError] = useState('');

  useEffect(() => {
    if (restaurant) return;

    try {
      const savedRestaurant = JSON.parse(
        sessionStorage.getItem('selectedRestaurant') || 'null'
      );

      if (savedRestaurant) setRestaurant(savedRestaurant);
    } catch {
      setRestaurant(null);
    }
  }, [restaurantId, restaurant]);

  const dateOptions = [
    'Today',
    'Tomorrow',
    new Date(Date.now() + 2 * 86400000).toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }),
  ];

  function confirmBooking(event) {
    event.preventDefault();

    if (!selectedTime) {
      setBookingError('Please select a time slot.');
      return;
    }

    if (!guestName.trim() || !guestEmail.trim()) {
      setBookingError('Please enter your name and email.');
      return;
    }

    const booking = {
      restaurantName: nameOf(restaurant || {}),
      rating: restaurant?.rating || 0,
      address:
        restaurant?.address ||
        restaurant?.location ||
        'Address not provided',
      city: location.state?.city || sessionStorage.getItem('selectedCity') || '',
      state:
        location.state?.state ||
        sessionStorage.getItem('selectedState') ||
        '',
      bookingDate: new Date().toISOString(),
      bookingTime: selectedTime,
      bookingEmail: guestEmail,
      guestName,
      guestPhone,
      restaurantId,
      selectedDate,
    };

    onConfirm(booking);
    navigate('/my-bookings');
  }

  if (!restaurant) {
    return (
      <main className="page-container">
        <div className="empty-state">
          <h2>Restaurant details not found</h2>
          <p>Please return to the search page and choose a restaurant.</p>
          <Link to="/" className="primary-button inline-button">
            Find Restaurants
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="booking-page page-container">
      <div className="page-heading">
        <span className="section-kicker">COMPLETE YOUR RESERVATION</span>
        <h1>Book your table</h1>
        <p>Choose your date and preferred dining time.</p>
      </div>

      <div className="booking-layout">
        <section className="booking-main-card">
          <div className="booking-restaurant">
            <div className="booking-restaurant-icon">🍽️</div>
            <div>
              <h2>{nameOf(restaurant)}</h2>
              <p>
                {restaurant.address ||
                  restaurant.location ||
                  'Restaurant reservation'}
              </p>
            </div>
          </div>

          <div className="booking-divider" />

          <section className="date-selection">
            <h2>Select a date</h2>
            <div className="date-options">
              {dateOptions.map((date) => (
                <button
                  type="button"
                  key={date}
                  className={`date-option ${selectedDate === date ? 'selected' : ''}`}
                  onClick={() => setSelectedDate(date)}
                >
                  <span>{date}</span>
                </button>
              ))}
            </div>
          </section>

          <div className="booking-divider" />

          <section className="time-selection">
            <h2>Choose a time</h2>

            {Object.entries(TIME_SLOTS).map(([period, slots]) => (
              <div className="time-period" key={period}>
                <p>{period}</p>
                <div className="time-slots">
                  {slots.map((slot) => (
                    <button
                      type="button"
                      key={slot}
                      className={`time-slot ${selectedTime === slot ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedTime(slot);
                        setBookingError('');
                      }}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </section>
        </section>

        <aside className="booking-details-card">
          <h2>Your details</h2>
          <form onSubmit={confirmBooking}>
            <label htmlFor="guestName">Full name</label>
            <input
              id="guestName"
              type="text"
              value={guestName}
              onChange={(event) => setGuestName(event.target.value)}
              placeholder="Enter your name"
              required
            />

            <label htmlFor="guestEmail">Email address</label>
            <input
              id="guestEmail"
              type="email"
              value={guestEmail}
              onChange={(event) => setGuestEmail(event.target.value)}
              placeholder="Enter your email"
              required
            />

            <label htmlFor="guestPhone">Phone number</label>
            <input
              id="guestPhone"
              type="tel"
              value={guestPhone}
              onChange={(event) => setGuestPhone(event.target.value)}
              placeholder="Enter your phone number"
            />

            {bookingError && (
              <p className="error-message">{bookingError}</p>
            )}

            <button type="submit" className="primary-button confirm-button">
              Confirm Reservation
            </button>
          </form>
          <p className="booking-note">No payment required to reserve your table.</p>
        </aside>
      </div>
    </main>
  );
}

function MyBookings({ bookings }) {
  return (
    <main className="my-bookings-page page-container">
      <div className="page-heading">
        <span className="section-kicker">YOUR DINING PLANS</span>
        <h1>My Bookings</h1>
        <p>All your upcoming reservations in one place.</p>
      </div>

      {bookings.length === 0 ? (
        <div className="empty-state">
          <span>📅</span>
          <h2>No bookings yet</h2>
          <p>Your confirmed restaurant reservations will appear here.</p>
          <Link to="/" className="primary-button inline-button">
            Explore Restaurants
          </Link>
        </div>
      ) : (
        <div className="bookings-list">
          {bookings.map((booking, index) => (
            <article className="booking-card" key={`${booking.restaurantName}-${index}`}>
              <div className="booking-card-icon">🍽️</div>

              <div className="booking-card-content">
                <span className="booking-status">TABLE RESERVED</span>
                <h3>{booking.restaurantName}</h3>
                <p>{booking.address}</p>
                <p>
                  {booking.city}
                  {booking.state ? `, ${booking.state}` : ''}
                </p>
                <div className="booking-meta">
                  {booking.bookingDate && (
                    <span>
                      📅 {new Date(booking.bookingDate).toLocaleDateString()}
                    </span>
                  )}
                  {booking.bookingTime && (
                    <span>🕒 {booking.bookingTime}</span>
                  )}
                  {booking.bookingEmail && (
                    <span>✉️ {booking.bookingEmail}</span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

function AppShell() {
  const [bookings, setBookings] = useState(readBookings);

  useEffect(() => {
    localStorage.setItem(BOOKING_KEY, JSON.stringify(bookings));
  }, [bookings]);

  function addBooking(booking) {
    setBookings((current) => [...current, booking]);
  }

  return (
    <div className="app">
      <Header />

      <Routes>
        <Route path="/" element={<SearchPage />} />
        <Route
          path="/booking/:restaurantId"
          element={<BookingPage onConfirm={addBooking} />}
        />
        <Route
          path="/my-bookings"
          element={<MyBookings bookings={bookings} />}
        />
        <Route path="*" element={<SearchPage />} />
      </Routes>

      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
