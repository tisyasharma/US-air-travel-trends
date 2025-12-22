function Navigation() {
  return (
    <nav className="nav">
      <div className="nav__inner">
        <a href="#top" className="brand">Flight Trends</a>
        <div className="nav__links">
          <a href="#overview">Overview</a>
          <a href="#routes">Routes Map</a>
          <a href="#market">Market Share</a>
          <a href="#seasonality">Seasonality</a>
          <a href="#seasonal-capacity">Capacity</a>
          <a href="#methods">Methods</a>
        </div>
      </div>
    </nav>
  )
}

export default Navigation
