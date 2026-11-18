
import React, { useEffect, useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  NavLink,
  useNavigate,
  useLocation,
  useParams,
} from 'react-router-dom';

import './styles.css';

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

const DATE_OPTIONS = ['Today', 'Tomorrow', 'Day After Tomorrow'];

function getBookings() {
  try {
    return JSON.parse(localStorage.getItem(BOOKING_KEY) || '[]');
  } catch {
    return [];
  }
}

function getItemName(item) {
  if (typeof item === 'string') return item;

  return (
    item?.name ||
    item?.restaurantName ||
    item?.state ||
    item?.city ||
    item?.title ||
    ''
  );
}

function getRestaurantName(restaurant) {
  return (
    restaurant?.restaurantName ||
    restaurant?.name ||
    restaurant?.restaurant_name ||
    restaurant?.title ||
    'Restaurant'
  );
}

function getRestaurantId(restaurant, index = 0) {
  return (
    restaurant?.id ||
    restaurant?._id ||
    restaurant?.restaurantId ||
    restaurant?.restaurant_id ||
    String(index)
  );
}

function getRestaurantAddress(restaurant) {
  return (
    restaurant?.address ||
    restaurant?.location ||
    restaurant?.fullAddress ||
    'Address not available'
  );
}

function getDateValue(option) {
  const date = new Date();

  if (option === 'Tomorrow') {
    date.setDate(date.getDate() + 1);
  } else if (option === 'Day After Tomorrow') {
    date.setDate(date.getDate() + 2);
  }

  return date;
}

/* ---------------- HEADER ---------------- */

function Header() {
  return (
    <header className="site-header">
      <div className="header-container">
        <Link to="/" className="logo">
          <span className="logo-icon">🍽️</span>
          <span>Foodie</span>
        </Link>

        <nav className="main-navigation">
          <NavLink to="/" end>
            Home
          </NavLink>

          <NavLink to="/my-bookings">
            My Bookings
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

/* ---------------- FOOTER ---------------- */

function Footer() {
  return (
    <footer className="site-footer">
      <p>© {new Date().getFullYear()} Foodie. All rights reserved.</p>
    </footer>
  );
}

/* ---------------- DROPDOWN ---------------- */

function LocationDropdown({
  id,
  placeholder,
  value,
  options,
  onChange,
  disabled = false,
  loading = false,
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="location-dropdown" id={id}>
      <button
        type="button"
        className="location-dropdown-trigger"
        disabled={disabled}
        onClick={() => setOpen((previous) => !previous)}
        aria-expanded={open}
      >
        <span>{value || placeholder}</span>
        <span className="dropdown-arrow">⌄</span>
      </button>

      {open && (
        <ul className="location-dropdown-list">
          {loading ? (
            <li>Loading options...</li>
          ) : options.length > 0 ? (
            options.map((option, index) => {
              const name = getItemName(option);

              return (
                <li
                  key={`${name}-${index}`}
                  onClick={() => {
                    onChange(name);
                    setOpen(false);
                  }}
                >
                  {name}
                </li>
              );
            })
          ) : (
            <li>No options available</li>
          )}
        </ul>
      )}
    </div>
  );
}

/* ---------------- RESTAURANT CARD ---------------- */

function RestaurantCard({ restaurant, index, onBook }) {
  const name = getRestaurantName(restaurant);
  const address = getRestaurantAddress(restaurant);

  return (
    <article className="restaurant-card">
      <div className="restaurant-card-image">
        <img
          src={
            restaurant?.image ||
            restaurant?.imageUrl ||
            restaurant?.image_url ||
            'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800'
          }
          alt={name}
        />
      </div>

      <div className="restaurant-card-content">
        <h3>{name}</h3>

        <p className="restaurant-address">
          📍 {address}
        </p>

        <p className="restaurant-rating">
          ⭐ {restaurant?.rating || 4.5}
        </p>

        <button
          type="button"
          className="primary-button reservation-button"
          onClick={() => onBook(restaurant, index)}
        >
          Book FREE Reservation
        </button>
      </div>
    </article>
  );
}

/* ---------------- SEARCH PAGE ---------------- */

function SearchPage() {
  const navigate = useNavigate();

  const [states, setStates] = useState(FALLBACK_STATES);
  const [cities, setCities] = useState([]);

  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  const [restaurants, setRestaurants] = useState([]);

  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingRestaurants, setLoadingRestaurants] = useState(false);

  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  // Load states
  useEffect(() => {
    let active = true;

    async function fetchStates() {
      setLoadingStates(true);

      try {
        const response = await fetch(`${API}/states`);

        if (!response.ok) {
          throw new Error('Unable to load states');
        }

        const data = await response.json();

        if (active && Array.isArray(data) && data.length > 0) {
          setStates(data.map(getItemName).filter(Boolean));
        }
      } catch {
        if (active) {
          setStates(FALLBACK_STATES);
        }
      } finally {
        if (active) {
          setLoadingStates(false);
        }
      }
    }

    fetchStates();

    return () => {
      active = false;
    };
  }, []);

  // Load cities whenever state changes
  useEffect(() => {
    let active = true;

    if (!selectedState) {
      setCities([]);
      return undefined;
    }

    async function fetchCities() {
      setLoadingCities(true);
      setCities([]);
      setSelectedCity('');

      try {
        const response = await fetch(
          `${API}/cities/${encodeURIComponent(selectedState)}`
        );

        if (!response.ok) {
          throw new Error('Unable to load cities');
        }

        const data = await response.json();

        if (active && Array.isArray(data)) {
          setCities(data.map(getItemName).filter(Boolean));
        }
      } catch {
        if (active) {
          setCities([]);
        }
      } finally {
        if (active) {
          setLoadingCities(false);
        }
      }
    }

    fetchCities();

    return () => {
      active = false;
    };
  }, [selectedState]);

  function handleStateChange(state) {
    setSelectedState(state);
    setSelectedCity('');
    setCities([]);
    setRestaurants([]);
    setSearched(false);
    setError('');
  }

  function handleCityChange(city) {
    setSelectedCity(city);
    setRestaurants([]);
    setSearched(false);
    setError('');
  }

  // Search restaurants
  async function handleSearch() {
    if (!selectedState || !selectedCity) {
      setError('Please select both state and city.');
      return;
    }

    setLoadingRestaurants(true);
    setSearched(true);
    setError('');
    setRestaurants([]);

    try {
      const params = new URLSearchParams({
        state: selectedState,
        city: selectedCity,
      });

      const response = await fetch(
        `${API}/restaurants?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error('Unable to fetch restaurants.');
      }

      const data = await response.json();

      const restaurantList = Array.isArray(data)
        ? data
        : data?.restaurants || data?.data || [];

      setRestaurants(restaurantList);
    } catch (err) {
      setError(err.message || 'Something went wrong.');
      setRestaurants([]);
    } finally {
      setLoadingRestaurants(false);
    }
  }

  function handleBook(restaurant, index) {
    navigate(`/booking/${getRestaurantId(restaurant, index)}`, {
      state: {
        restaurant,
        state: selectedState,
        city: selectedCity,
      },
    });
  }

  return (
    <main>
      <section className="hero-section">
        <div className="hero-content">
          <span className="hero-label">WELCOME TO FOODIE</span>

          <h1>Discover and Book Your Favourite Restaurants</h1>

          <p>
            Find the perfect place for your next dining experience.
            Explore restaurants and reserve your table easily.
          </p>
        </div>
      </section>

      <section className="search-section">
        <div className="search-panel">
          <h2>Find Restaurants Near You</h2>

          <div className="search-fields">
            <div className="search-field">
              <label>Select State</label>

              <LocationDropdown
                id="state"
                placeholder="Choose State"
                value={selectedState}
                options={states}
                loading={loadingStates}
                onChange={handleStateChange}
              />
            </div>

            <div className="search-field">
              <label>Select City</label>

              <LocationDropdown
                id="city"
                placeholder="Choose City"
                value={selectedCity}
                options={cities}
                loading={loadingCities}
                disabled={!selectedState}
                onChange={handleCityChange}
              />
            </div>

            <button
              type="button"
              id="searchBtn"
              className="primary-button search-button"
              onClick={handleSearch}
              disabled={loadingRestaurants}
            >
              {loadingRestaurants ? 'Searching...' : 'Search'}
            </button>
          </div>

          {error && <p className="error-message">{error}</p>}
        </div>
      </section>

      <section className="restaurants-section">
        {loadingRestaurants && (
          <p className="loading-message">Loading restaurants...</p>
        )}

        {!loadingRestaurants && searched && (
          <>
            <h1>
              {restaurants.length} restaurants available in {selectedCity}
            </h1>

            {restaurants.length > 0 ? (
              <div className="restaurant-grid">
                {restaurants.map((restaurant, index) => (
                  <RestaurantCard
                    key={getRestaurantId(restaurant, index)}
                    restaurant={restaurant}
                    index={index}
                    onBook={handleBook}
                  />
                ))}
              </div>
            ) : (
              <p className="empty-message">
                No restaurants found in {selectedCity}.
              </p>
            )}
          </>
        )}
      </section>
    </main>
  );
}

/* ---------------- BOOKING PAGE ---------------- */

function BookingPage({ onConfirm }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const restaurant = location.state?.restaurant || {
    id,
    name: 'Restaurant',
    address: 'Address not available',
    rating: 4.5,
  };

  const state = location.state?.state || '';
  const city = location.state?.city || '';

  const [selectedDate, setSelectedDate] = useState('Today');
  const [selectedTime, setSelectedTime] = useState('');

  const [guestCount, setGuestCount] = useState('2');
  const [bookingEmail, setBookingEmail] = useState('');

  const [confirmationMessage, setConfirmationMessage] = useState('');

  function handleBooking() {
    if (!selectedTime) {
      setConfirmationMessage('Please select a time slot.');
      return;
    }

    if (!bookingEmail.trim()) {
      setConfirmationMessage('Please enter your email address.');
      return;
    }

    const bookingDate = getDateValue(selectedDate);

    const booking = {
      restaurantName: getRestaurantName(restaurant),
      restaurantId: id,
      rating: restaurant?.rating || 4.5,
      address: getRestaurantAddress(restaurant),
      city,
      state,
      bookingDate: bookingDate.toISOString(),
      bookingTime: selectedTime,
      bookingEmail: bookingEmail.trim(),
      guests: Number(guestCount),
    };

    onConfirm(booking);

    navigate('/my-bookings');
  }

  return (
    <main className="booking-page">
      <section className="booking-container">
        <div className="booking-heading">
          <h1>Book Your Table</h1>

          <p>
            Reserve your table at {getRestaurantName(restaurant)}
          </p>
        </div>

        <div className="booking-card">
          <div className="booking-restaurant-details">
            <h2>{getRestaurantName(restaurant)}</h2>

            <p>{getRestaurantAddress(restaurant)}</p>

            <p>⭐ {restaurant?.rating || 4.5}</p>
          </div>

          <div className="booking-divider" />

          {/* DATE OPTIONS */}
          <section className="booking-section">
            <h2>Select Date</h2>

            <div className="date-options">
              {DATE_OPTIONS.map((date) => (
                <button
                  type="button"
                  key={date}
                  className={`date-option ${
                    selectedDate === date ? 'active' : ''
                  }`}
                  onClick={() => setSelectedDate(date)}
                >
                  <p>{date}</p>
                </button>
              ))}
            </div>
          </section>

          <div className="booking-divider" />

          {/* TIME SLOTS */}
          <section className="booking-section">
            <h2>Select Time</h2>

            {Object.entries(TIME_SLOTS).map(([period, slots]) => (
              <div className="time-period" key={period}>
                <p className="time-period-title">{period}</p>

                <div className="time-slots">
                  {slots.map((time) => (
                    <button
                      type="button"
                      key={time}
                      className={`time-slot ${
                        selectedTime === time ? 'active' : ''
                      }`}
                      onClick={() => {
                        setSelectedTime(time);
                        setConfirmationMessage('');
                      }}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </section>

          <div className="booking-divider" />

          {/* GUEST DETAILS */}
          <section className="booking-section">
            <h2>Booking Details</h2>

            <div className="booking-form">
              <div className="form-group">
                <label htmlFor="guestCount">Number of Guests</label>

                <select
                  id="guestCount"
                  value={guestCount}
                  onChange={(event) => setGuestCount(event.target.value)}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((count) => (
                    <option key={count} value={count}>
                      {count} {count === 1 ? 'Guest' : 'Guests'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="bookingEmail">Email Address</label>

                <input
                  id="bookingEmail"
                  type="email"
                  placeholder="Enter your email"
                  value={bookingEmail}
                  onChange={(event) => {
                    setBookingEmail(event.target.value);
                    setConfirmationMessage('');
                  }}
                />
              </div>
            </div>
          </section>

          {confirmationMessage && (
            <p className="error-message">{confirmationMessage}</p>
          )}

          <button
            type="button"
            className="primary-button confirm-booking-button"
            onClick={handleBooking}
          >
            Confirm Reservation
          </button>
        </div>
      </section>
    </main>
  );
}

/* ---------------- MY BOOKINGS PAGE ---------------- */

function MyBookings({ bookings }) {
  return (
    <main className="my-bookings-page">
      <section className="my-bookings-container">
        <div className="my-bookings-heading">
          <h1>My Bookings</h1>

          <p>View your restaurant reservations.</p>
        </div>

        {bookings.length === 0 ? (
          <div className="empty-bookings">
            <h2>No bookings yet</h2>

            <p>Your reservations will appear here.</p>

            <Link to="/" className="primary-button">
              Explore Restaurants
            </Link>
          </div>
        ) : (
          <div className="bookings-grid">
            {bookings.map((booking, index) => (
              <article
                className="booking-history-card"
                key={`${booking.restaurantId || booking.restaurantName}-${index}`}
              >
                <div className="booking-history-content">
                  <h3>{booking.restaurantName}</h3>

                  <p>📍 {booking.address}</p>

                  <p>
                    {booking.city}, {booking.state}
                  </p>

                  <p>
                    📅{' '}
                    {booking.bookingDate
                      ? new Date(booking.bookingDate).toLocaleDateString()
                      : 'Date not available'}
                  </p>

                  <p>🕒 {booking.bookingTime}</p>

                  <p>✉️ {booking.bookingEmail}</p>

                  {booking.guests && (
                    <p>👥 {booking.guests} Guests</p>
                  )}

                  <p>⭐ {booking.rating || 4.5}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

/* ---------------- APP SHELL ---------------- */

function AppShell() {
  const [bookings, setBookings] = useState(getBookings);

  useEffect(() => {
    localStorage.setItem(BOOKING_KEY, JSON.stringify(bookings));
  }, [bookings]);

  function addBooking(booking) {
    setBookings((previous) => [...previous, booking]);
  }

  return (
    <>
      <Header />

      <Routes>
        <Route path="/" element={<SearchPage />} />

        <Route
          path="/booking/:id"
          element={<BookingPage onConfirm={addBooking} />}
        />

        <Route
          path="/my-bookings"
          element={<MyBookings bookings={bookings} />}
        />

        <Route path="*" element={<SearchPage />} />
      </Routes>

      <Footer />
    </>
  );
}

/* ---------------- ROOT APP ---------------- */

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
